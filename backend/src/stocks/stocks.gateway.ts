import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'ws';
import WebSocket from 'ws';
import { SupabaseService } from '../supabase/supabase.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isSubscribed?: boolean;
  subscribedTickers?: Set<string>;
  isAlive?: boolean;
}

interface FinnhubTrade {
  s: string; // symbol
  p: number; // price
  v: number; // volume
  t: number; // timestamp
}

@WebSocketGateway({ path: '/ws/stocks' })
export class StocksGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StocksGateway.name);
  private finnhubWs: WebSocket | null = null;
  private readonly finnhubKey: string;
  private readonly subscribedSymbols = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {
    this.finnhubKey = this.config.get('FINNHUB_API_KEY') ?? '';
  }

  afterInit() {
    this.logger.log('StocksGateway initialized');
    if (this.finnhubKey) {
      this.connectFinnhub();
    } else {
      this.logger.warn('FINNHUB_API_KEY not set — real-time disabled');
    }

    this.heartbeatInterval = setInterval(() => {
      this.server?.clients?.forEach((ws) => {
        const sock = ws as AuthenticatedSocket;
        if (sock.isAlive === false) {
          sock.terminate();
          return;
        }
        sock.isAlive = false;
        sock.ping();
      });
    }, 30_000);
  }

  async handleConnection(client: AuthenticatedSocket, ...args: unknown[]) {
    client.isAlive = true;
    client.on('pong', () => {
      client.isAlive = true;
    });

    const req = args[0] as { url?: string } | undefined;
    const url = req?.url ?? '';
    const token = new URLSearchParams(url.split('?')[1] ?? '').get('token');

    if (!token) {
      client.send(JSON.stringify({ error: 'Missing token' }));
      client.close(4001, 'Missing token');
      return;
    }

    const user = await this.supabase.getUserFromToken(token);
    if (!user) {
      client.send(JSON.stringify({ error: 'Invalid token' }));
      client.close(4001, 'Invalid token');
      return;
    }

    const sb = this.supabase.getClient();
    const { data: profile } = await sb
      .from('profiles')
      .select('role, is_subscribed')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && !profile.is_subscribed)) {
      client.send(JSON.stringify({ error: 's2+ subscription required' }));
      client.close(4003, 's2+ required');
      return;
    }

    client.userId = user.id;
    client.isSubscribed = true;
    client.subscribedTickers = new Set();

    client.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && typeof msg.symbol === 'string') {
          const symbol = msg.symbol.toUpperCase();
          client.subscribedTickers?.add(symbol);
          this.ensureFinnhubSubscription(symbol);
        } else if (msg.type === 'unsubscribe' && typeof msg.symbol === 'string') {
          client.subscribedTickers?.delete(msg.symbol.toUpperCase());
        }
      } catch {
        // ignore malformed messages
      }
    });

    client.send(JSON.stringify({ type: 'connected', userId: user.id }));
    this.logger.log(`Client connected: ${user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  private connectFinnhub() {
    if (this.finnhubWs) {
      try {
        this.finnhubWs.close();
      } catch {
        // already closed
      }
    }

    const url = `wss://ws.finnhub.io?token=${this.finnhubKey}`;
    this.finnhubWs = new WebSocket(url);

    this.finnhubWs.on('open', () => {
      this.logger.log('Finnhub WebSocket connected');
      for (const symbol of this.subscribedSymbols) {
        this.finnhubWs?.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    });

    this.finnhubWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          this.fanOutTrades(msg.data as FinnhubTrade[]);
        }
      } catch {
        // ignore
      }
    });

    this.finnhubWs.on('close', () => {
      this.logger.warn('Finnhub WebSocket closed, reconnecting in 5s...');
      this.scheduleReconnect();
    });

    this.finnhubWs.on('error', (err) => {
      this.logger.error(`Finnhub WebSocket error: ${err.message}`);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectFinnhub();
    }, 5_000);
  }

  private ensureFinnhubSubscription(symbol: string) {
    if (this.subscribedSymbols.has(symbol)) return;
    this.subscribedSymbols.add(symbol);

    if (this.finnhubWs?.readyState === WebSocket.OPEN) {
      this.finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol }));
      this.logger.log(`Subscribed Finnhub to ${symbol}`);
    }
  }

  private fanOutTrades(trades: FinnhubTrade[]) {
    const bySymbol = new Map<string, FinnhubTrade[]>();
    for (const trade of trades) {
      const arr = bySymbol.get(trade.s) ?? [];
      arr.push(trade);
      bySymbol.set(trade.s, arr);
    }

    this.server?.clients?.forEach((ws) => {
      const client = ws as AuthenticatedSocket;
      if (client.readyState !== WebSocket.OPEN || !client.subscribedTickers) return;

      for (const [symbol, symbolTrades] of bySymbol) {
        if (client.subscribedTickers.has(symbol)) {
          const latest = symbolTrades[symbolTrades.length - 1]!;
          client.send(
            JSON.stringify({
              type: 'trade',
              symbol: latest.s,
              price: latest.p,
              volume: latest.v,
              timestamp: latest.t,
            }),
          );
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.finnhubWs) this.finnhubWs.close();
  }
}
