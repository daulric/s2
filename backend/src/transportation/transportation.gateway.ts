import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';
import WebSocket from 'ws';
import { SupabaseService } from '../supabase/supabase.service';
import { AccessControlService } from '../auth/access-control.service';
import { TransportationService, type Vehicle } from './transportation.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  filter?: 'all' | 'vessels' | 'airplanes';
}

@WebSocketGateway({ path: '/ws/transportation' })
export class TransportationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TransportationGateway.name);
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private supabase: SupabaseService,
    private access: AccessControlService,
    private transportationService: TransportationService,
  ) {}

  afterInit() {
    this.logger.log('TransportationGateway initialized');

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

    this.broadcastInterval = setInterval(() => {
      this.broadcastPositions();
    }, 5_000);
  }

  async handleConnection(client: AuthenticatedSocket, ...args: unknown[]) {
    client.isAlive = true;
    client.filter = 'all';
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

    client.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'filter' && ['all', 'vessels', 'airplanes'].includes(msg.value)) {
          client.filter = msg.value;
          this.sendSnapshot(client);
        }
      } catch {
        // ignore
      }
    });

    client.send(JSON.stringify({ type: 'connected', userId: user.id }));
    this.sendSnapshot(client);
    this.logger.log(`Transportation client connected: ${user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Transportation client disconnected: ${client.userId}`);
    }
  }

  private sendSnapshot(client: AuthenticatedSocket) {
    if (client.readyState !== WebSocket.OPEN) return;
    const vehicles = this.getFiltered(client.filter ?? 'all');
    client.send(JSON.stringify({ type: 'snapshot', vehicles }));
  }

  private broadcastPositions() {
    if (!this.server?.clients?.size) return;

    const allVehicles: Vehicle[] = this.transportationService.getAllVehicles();
    const vesselOnly = allVehicles.filter((v: Vehicle) => v.kind === 'vessel');
    const airplaneOnly = allVehicles.filter((v: Vehicle) => v.kind === 'airplane');

    const payloads = new Map<string, string>();
    payloads.set('all', JSON.stringify({ type: 'update', vehicles: allVehicles }));
    payloads.set('vessels', JSON.stringify({ type: 'update', vehicles: vesselOnly }));
    payloads.set('airplanes', JSON.stringify({ type: 'update', vehicles: airplaneOnly }));

    this.server.clients.forEach((ws) => {
      const client = ws as AuthenticatedSocket;
      if (client.readyState !== WebSocket.OPEN || !client.userId) return;
      const payload = payloads.get(client.filter ?? 'all');
      if (payload) client.send(payload);
    });
  }

  private getFiltered(filter: string): Vehicle[] {
    const all: Vehicle[] = this.transportationService.getAllVehicles();
    if (filter === 'vessels') return all.filter((v: Vehicle) => v.kind === 'vessel');
    if (filter === 'airplanes') return all.filter((v: Vehicle) => v.kind === 'airplane');
    return all;
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
  }
}
