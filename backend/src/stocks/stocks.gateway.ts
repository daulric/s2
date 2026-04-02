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
import { AccessControlService } from '../auth/access-control.service';

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
  private finnhubConnecting = false;
  private intentionalClose = false;
  private readonly finnhubKey: string;
  private readonly subscribedSymbols = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
    private access: AccessControlService,
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
      const finnhubState = this.finnhubWs?.readyState ?? -1;
      const stateMap: Record<number, string> = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
      const stateLabel = stateMap[finnhubState] ?? 'NULL';
      const clientCount = this.server?.clients?.size ?? 0;
      if (clientCount > 0 || finnhubState !== 1) {
        this.logger.log(`Heartbeat: Finnhub=${stateLabel}, symbols=${this.subscribedSymbols.size}, clients=${clientCount}`);
      }

      if (finnhubState !== 0 && finnhubState !== 1 && this.subscribedSymbols.size > 0) {
        this.logger.warn('Finnhub dead, reconnecting...');
        this.connectFinnhub();
      }

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

    const { allowed } = await this.access.resolve(user.id);

    if (!allowed) {
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
    if (this.finnhubConnecting) return;
    if (this.finnhubWs?.readyState === WebSocket.OPEN) return;

    // Tear down any existing socket without triggering reconnect
    this.closeFinnhub();

    this.finnhubConnecting = true;
    this.intentionalClose = false;

    const url = `wss://ws.finnhub.io?token=${this.finnhubKey}`;
    const socket = new WebSocket(url);
    this.finnhubWs = socket;

    socket.on('open', () => {
      this.finnhubConnecting = false;
      this.logger.log('Finnhub WebSocket connected');
      for (const symbol of this.subscribedSymbols) {
        socket.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    });

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          this.fanOutTrades(msg.data as FinnhubTrade[]);
        } else if (msg.type === 'ping') {
          // Finnhub keepalive, ignore
        } else {
          this.logger.warn(`Finnhub unexpected message: ${JSON.stringify(msg).slice(0, 200)}`);
        }
      } catch {
        this.logger.warn(`Finnhub unparseable message: ${data.toString().slice(0, 200)}`);
      }
    });

    socket.on('close', () => {
      this.finnhubConnecting = false;
      if (this.finnhubWs === socket) {
        this.finnhubWs = null;
      }
      if (this.intentionalClose) {
        this.intentionalClose = false;
        return;
      }
      this.logger.warn('Finnhub WebSocket closed, reconnecting in 5s...');
      this.scheduleReconnect();
    });

    socket.on('error', (err) => {
      this.logger.error(`Finnhub WebSocket error: ${err.message}`);
    });
  }

  private closeFinnhub() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.finnhubWs) {
      this.intentionalClose = true;
      try {
        this.finnhubWs.close();
      } catch {
        // already closed
      }
      this.finnhubWs = null;
      this.finnhubConnecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.finnhubConnecting) return;
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

  broadcastPriceUpdate(symbol: string, price: number, changePct: number) {
    const upper = symbol.toUpperCase();
    const payload = JSON.stringify({
      type: 'price_update',
      symbol: upper,
      price,
      changePct,
      timestamp: Date.now(),
    });

    this.server?.clients?.forEach((ws) => {
      const client = ws as AuthenticatedSocket;
      if (
        client.readyState === WebSocket.OPEN &&
        client.subscribedTickers?.has(upper)
      ) {
        client.send(payload);
      }
    });
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.closeFinnhub();
  }
}
