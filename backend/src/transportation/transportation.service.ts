import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

export type VehicleKind = 'vessel' | 'airplane';

export type TrailPoint = [lng: number, lat: number, ts: number];

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: number;
  trail: TrailPoint[];
  origin?: string;
  destination?: string;
  flag?: string;
  callsign?: string;
  type?: string;
  imo?: string;
  registration?: string;
  operator?: string;
  altitude?: number;
  lengthM?: number;
  widthM?: number;
};

const MID_TO_FLAG: Record<string, string> = {
  '201': '🇦🇱', '202': '🇦🇩', '203': '🇦🇹', '204': '🇵🇹', '205': '🇧🇪', '206': '🇧🇾',
  '207': '🇧🇬', '208': '🇻🇦', '209': '🇨🇾', '210': '🇨🇾', '211': '🇩🇪', '212': '🇨🇾',
  '213': '🇬🇪', '214': '🇲🇩', '215': '🇲🇹', '216': '🇦🇲', '218': '🇩🇪', '219': '🇩🇰',
  '220': '🇩🇰', '224': '🇪🇸', '225': '🇪🇸', '226': '🇫🇷', '227': '🇫🇷', '228': '🇫🇷',
  '229': '🇲🇹', '230': '🇫🇮', '231': '🇫🇴', '232': '🇬🇧', '233': '🇬🇧', '234': '🇬🇧',
  '235': '🇬🇧', '236': '🇬🇮', '237': '🇬🇷', '238': '🇭🇷', '239': '🇬🇷', '240': '🇬🇷',
  '241': '🇬🇷', '242': '🇲🇦', '243': '🇭🇺', '244': '🇳🇱', '245': '🇳🇱', '246': '🇳🇱',
  '247': '🇮🇹', '248': '🇲🇹', '249': '🇲🇹', '250': '🇮🇪', '251': '🇮🇸', '252': '🇱🇮',
  '253': '🇱🇺', '254': '🇲🇨', '255': '🇵🇹', '256': '🇲🇹', '257': '🇳🇴', '258': '🇳🇴',
  '259': '🇳🇴', '261': '🇵🇱', '263': '🇵🇹', '264': '🇷🇴', '265': '🇸🇪', '266': '🇸🇪',
  '267': '🇸🇰', '268': '🇸🇲', '269': '🇨🇭', '270': '🇨🇿', '271': '🇹🇷', '272': '🇺🇦',
  '273': '🇷🇺', '274': '🇲🇰', '275': '🇱🇻', '276': '🇪🇪', '277': '🇱🇹', '278': '🇸🇮',
  '279': '🇷🇸', '301': '🇦🇮', '303': '🇺🇸', '304': '🇦🇬', '305': '🇦🇬', '306': '🇨🇼',
  '307': '🇦🇼', '308': '🇧🇸', '309': '🇧🇸', '310': '🇧🇲', '311': '🇧🇸', '312': '🇧🇿',
  '314': '🇧🇧', '316': '🇨🇦', '319': '🇰🇾', '321': '🇨🇷', '323': '🇨🇺', '325': '🇩🇲',
  '327': '🇩🇴', '329': '🇬🇵', '330': '🇬🇩', '331': '🇬🇱', '332': '🇬🇹', '334': '🇭🇳',
  '336': '🇭🇹', '338': '🇺🇸', '339': '🇯🇲', '341': '🇰🇳', '343': '🇱🇨', '345': '🇲🇽',
  '347': '🇲🇶', '348': '🇲🇸', '350': '🇳🇮', '351': '🇵🇦', '352': '🇵🇦', '353': '🇵🇦',
  '354': '🇵🇦', '355': '🇵🇦', '356': '🇵🇦', '357': '🇵🇦', '358': '🇵🇷', '359': '🇸🇻',
  '361': '🇵🇲', '362': '🇹🇹', '364': '🇹🇨', '366': '🇺🇸', '367': '🇺🇸', '368': '🇺🇸',
  '369': '🇺🇸', '370': '🇵🇦', '371': '🇵🇦', '372': '🇵🇦', '373': '🇵🇦', '374': '🇵🇦',
  '375': '🇻🇨', '376': '🇻🇬', '377': '🇻🇮', '378': '🇻🇪',
  '401': '🇦🇫', '403': '🇸🇦', '405': '🇧🇩', '408': '🇧🇭', '410': '🇧🇹', '412': '🇨🇳',
  '413': '🇨🇳', '414': '🇨🇳', '416': '🇹🇼', '417': '🇱🇰', '419': '🇮🇳', '422': '🇮🇷',
  '423': '🇦🇿', '425': '🇮🇶', '428': '🇮🇱', '431': '🇯🇵', '432': '🇯🇵', '434': '🇹🇲',
  '436': '🇰🇿', '437': '🇺🇿', '438': '🇯🇴', '440': '🇰🇷', '441': '🇰🇷', '443': '🇵🇸',
  '445': '🇰🇵', '447': '🇰🇼', '450': '🇱🇧', '451': '🇰🇬', '453': '🇲🇴', '455': '🇲🇻',
  '457': '🇲🇳', '459': '🇳🇵', '461': '🇴🇲', '463': '🇵🇰', '466': '🇶🇦', '468': '🇸🇾',
  '470': '🇦🇪', '472': '🇹🇯', '473': '🇾🇪', '475': '🇹🇭', '477': '🇭🇰',
  '501': '🇫🇷', '503': '🇦🇺', '506': '🇲🇲', '508': '🇧🇳', '510': '🇫🇲', '511': '🇵🇼',
  '512': '🇳🇿', '514': '🇰🇭', '515': '🇰🇭', '516': '🇨🇽', '518': '🇨🇰', '520': '🇫🇯',
  '523': '🇨🇨', '525': '🇮🇩', '529': '🇰🇮', '531': '🇱🇦', '533': '🇲🇾', '536': '🇲🇵',
  '538': '🇲🇭', '540': '🇳🇨', '542': '🇳🇺', '544': '🇳🇷', '546': '🇫🇷', '548': '🇵🇭',
  '553': '🇵🇬', '555': '🇵🇳', '557': '🇸🇧', '559': '🇼🇸', '561': '🇸🇬', '563': '🇸🇬',
  '564': '🇸🇬', '565': '🇸🇬', '566': '🇸🇬', '567': '🇹🇭', '570': '🇹🇴', '572': '🇹🇻',
  '574': '🇻🇳', '576': '🇻🇺', '577': '🇻🇺', '578': '🇼🇫',
  '601': '🇿🇦', '603': '🇦🇴', '605': '🇩🇿', '607': '🇫🇷', '608': '🇬🇧', '609': '🇧🇮',
  '610': '🇧🇯', '611': '🇧🇼', '612': '🇨🇲', '613': '🇨🇩', '615': '🇨🇬', '616': '🇰🇲',
  '617': '🇨🇻', '618': '🇫🇷', '619': '🇨🇮', '620': '🇰🇲', '621': '🇩🇯', '622': '🇪🇬',
  '624': '🇪🇹', '625': '🇪🇷', '626': '🇬🇦', '627': '🇬🇭', '629': '🇬🇲', '630': '🇬🇼',
  '631': '🇬🇶', '632': '🇬🇳', '633': '🇧🇫', '634': '🇰🇪', '635': '🇫🇷', '636': '🇱🇷',
  '637': '🇱🇷', '638': '🇸🇸', '642': '🇱🇾', '644': '🇱🇸', '645': '🇲🇺', '647': '🇲🇬',
  '649': '🇲🇱', '650': '🇲🇿', '654': '🇲🇷', '655': '🇲🇼', '656': '🇳🇪', '657': '🇳🇬',
  '659': '🇳🇦', '660': '🇫🇷', '661': '🇷🇼', '662': '🇸🇹', '663': '🇸🇳', '664': '🇸🇨',
  '665': '🇸🇱', '666': '🇸🇴', '667': '🇸🇿', '668': '🇸🇩', '669': '🇸🇿', '670': '🇹🇩',
  '671': '🇹🇬', '672': '🇹🇳', '674': '🇹🇿', '675': '🇺🇬', '676': '🇨🇩', '677': '🇹🇿',
  '678': '🇿🇲', '679': '🇿🇼',
  '701': '🇦🇷', '710': '🇧🇷', '720': '🇧🇴', '725': '🇨🇱', '730': '🇨🇴', '735': '🇪🇨',
  '740': '🇫🇰', '745': '🇬🇫', '750': '🇬🇾', '755': '🇵🇾', '760': '🇵🇪', '765': '🇸🇷',
  '770': '🇺🇾',
};

function flagFromMmsi(mmsi: string): string | undefined {
  const mid = mmsi.slice(0, 3);
  return MID_TO_FLAG[mid];
}

const AIS_SHIP_TYPES: Record<number, string> = {
  20: 'Wing in ground', 30: 'Fishing', 31: 'Towing', 32: 'Towing (large)',
  33: 'Dredging', 34: 'Diving ops', 35: 'Military ops', 36: 'Sailing',
  37: 'Pleasure craft', 40: 'High speed craft', 50: 'Pilot vessel',
  51: 'Search & rescue', 52: 'Tug', 53: 'Port tender', 55: 'Law enforcement',
  58: 'Medical transport', 60: 'Passenger', 70: 'Cargo', 80: 'Tanker',
  89: 'Tanker', 90: 'Other',
};

function shipTypeLabel(typeCode: number): string | undefined {
  if (typeCode === 0) return undefined;
  const exact = AIS_SHIP_TYPES[typeCode];
  if (exact) return exact;
  const base = Math.floor(typeCode / 10) * 10;
  return AIS_SHIP_TYPES[base];
}

const MAX_TRAIL_POINTS = 20;
const MIN_TRAIL_DISTANCE_DEG = 0.005;
const ROUTE_CACHE_TTL_MS = 30 * 60 * 1000;
const HEXDB_BATCH_SIZE = 20;

const STALE_VESSEL_MS = 60 * 60 * 1000;
const STALE_AIRPLANE_MS = 2 * 60 * 1000;
const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';

const OPENSKY_API = 'https://opensky-network.org/api';
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_POLL_MS_AUTH = 15_000;
const OPENSKY_POLL_MS_ANON = 60_000;
const OPENSKY_TOKEN_REFRESH_MARGIN = 60;

const OPENSKY_CATEGORIES: Record<number, string> = {
  2: 'Light', 3: 'Small', 4: 'Large', 5: 'High Vortex Large',
  6: 'Heavy', 7: 'High Performance', 8: 'Rotorcraft', 9: 'Glider',
  10: 'Lighter-than-air', 12: 'Ultralight', 14: 'UAV',
};

type CachedRoute = {
  origin: string;
  destination: string;
  fetchedAt: number;
};

@Injectable()
export class TransportationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransportationService.name);

  private readonly aisStreamKey: string;

  private readonly vessels = new Map<string, Vehicle>();
  private readonly airplanes = new Map<string, Vehicle>();
  private readonly trails = new Map<string, TrailPoint[]>();
  private readonly vesselDestinations = new Map<string, string>();
  private readonly vesselMeta = new Map<string, {
    callsign?: string;
    imo?: string;
    type?: string;
    flag?: string;
    lengthM?: number;
    widthM?: number;
  }>();
  private readonly airplaneRouteCache = new Map<string, CachedRoute | null>();
  private readonly routeFetchInFlight = new Set<string>();

  private aisWs: WebSocket | null = null;
  private aisConnecting = false;
  private aisIntentionalClose = false;
  private aisReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private openskyPollTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  private readonly openskyClientId: string;
  private readonly openskyClientSecret: string;
  private openskyToken: string | null = null;
  private openskyTokenExpiresAt = 0;

  constructor(private config: ConfigService) {
    this.aisStreamKey = this.config.get('AISSTREAM_API_KEY') ?? '';
    this.openskyClientId = this.config.get('OPENSKY_CLIENT_ID') ?? '';
    this.openskyClientSecret = this.config.get('OPENSKY_CLIENT_SECRET') ?? '';
  }

  onModuleInit() {
    if (this.aisStreamKey) {
      this.connectAisStream();
    } else {
      this.logger.warn('AISSTREAM_API_KEY not set — vessel tracking disabled');
    }

    this.startOpenskyPolling();

    this.pruneTimer = setInterval(() => this.pruneStale(), 30_000);
    this.logger.log('TransportationService initialized');
  }

  onModuleDestroy() {
    this.closeAisStream();
    if (this.openskyPollTimer) clearInterval(this.openskyPollTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
  }

  getAllVehicles(): Vehicle[] {
    return [...this.vessels.values(), ...this.airplanes.values()];
  }

  private appendTrail(id: string, lng: number, lat: number): TrailPoint[] {
    let trail = this.trails.get(id);
    if (!trail) {
      trail = [];
      this.trails.set(id, trail);
    }

    const last = trail[trail.length - 1];
    if (last) {
      const dLng = Math.abs(lng - last[0]);
      const dLat = Math.abs(lat - last[1]);
      if (dLng < MIN_TRAIL_DISTANCE_DEG && dLat < MIN_TRAIL_DISTANCE_DEG) {
        return trail;
      }
    }

    trail.push([lng, lat, Date.now()]);
    if (trail.length > MAX_TRAIL_POINTS) {
      trail.splice(0, trail.length - MAX_TRAIL_POINTS);
    }
    return trail;
  }

  // --------------- AISStream (vessels) ---------------

  private connectAisStream() {
    if (this.aisConnecting) return;
    if (this.aisWs?.readyState === WebSocket.OPEN) return;

    this.closeAisStream();
    this.aisConnecting = true;
    this.aisIntentionalClose = false;

    const ws = new WebSocket(AISSTREAM_WS_URL);
    this.aisWs = ws;

    ws.on('open', () => {
      this.aisConnecting = false;
      this.logger.log('AISStream WebSocket connected');

      ws.send(
        JSON.stringify({
          APIKey: this.aisStreamKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }),
      );
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.error) {
          this.logger.error(`AISStream error message: ${msg.error}`);
          return;
        }

        if (msg.MessageType === 'PositionReport') {
          this.handleAisPosition(msg);
        } else if (msg.MessageType === 'ShipStaticData') {
          this.handleShipStaticData(msg);
        }
      } catch {
        // malformed
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.aisConnecting = false;
      if (this.aisWs === ws) this.aisWs = null;

      if (this.aisIntentionalClose) {
        this.aisIntentionalClose = false;
        return;
      }

      this.logger.warn(
        `AISStream closed (code=${code}, reason=${reason.toString()}), reconnecting in 5s...`,
      );
      this.scheduleAisReconnect();
    });

    ws.on('error', (err: Error) => {
      this.logger.error(`AISStream error: ${err.message}`);
    });
  }

  private handleAisPosition(msg: Record<string, unknown>) {
    const meta = msg.MetaData as Record<string, unknown> | undefined;
    const report = (msg.Message as Record<string, unknown>)?.PositionReport as
      | Record<string, unknown>
      | undefined;
    if (!meta || !report) return;

    const mmsi = String(meta.MMSI ?? report.UserID ?? '');
    if (!mmsi) return;

    const lat = Number(meta.latitude ?? report.Latitude ?? 0);
    const lng = Number(meta.longitude ?? report.Longitude ?? 0);
    if (lat === 0 && lng === 0) return;

    const heading = Number(report.TrueHeading ?? report.Cog ?? 0);
    const speed = Number(report.Sog ?? 0);
    const name = String(meta.ShipName ?? '').trim() || `MMSI-${mmsi}`;

    const vid = `v-${mmsi}`;
    const trail = this.appendTrail(vid, lng, lat);
    const destination = this.vesselDestinations.get(mmsi);
    const cached = this.vesselMeta.get(mmsi);

    this.vessels.set(mmsi, {
      id: vid,
      kind: 'vessel',
      name,
      lat,
      lng,
      heading: heading === 511 ? 0 : heading,
      speed,
      updatedAt: Date.now(),
      trail,
      destination: destination || undefined,
      flag: cached?.flag ?? flagFromMmsi(mmsi),
      callsign: cached?.callsign,
      imo: cached?.imo,
      type: cached?.type,
      lengthM: cached?.lengthM,
      widthM: cached?.widthM,
    });
  }

  private handleShipStaticData(msg: Record<string, unknown>) {
    const meta = msg.MetaData as Record<string, unknown> | undefined;
    const data = (msg.Message as Record<string, unknown>)?.ShipStaticData as
      | Record<string, unknown>
      | undefined;
    if (!meta || !data) return;

    const mmsi = String(meta.MMSI ?? data.UserID ?? '');
    if (!mmsi) return;

    const dest = String(data.Destination ?? '').trim();
    if (dest && !dest.match(/^@+$/)) {
      this.vesselDestinations.set(mmsi, dest);
    }

    const callsignRaw = String(data.CallSign ?? '').trim();
    const imoRaw = String(data.ImoNumber ?? data.IMONumber ?? '').trim();
    const typeCode = Number(data.Type ?? data.ShipType ?? 0);
    const dim = data.Dimension as Record<string, number> | undefined;

    const entry = this.vesselMeta.get(mmsi) ?? {};
    if (callsignRaw && callsignRaw !== '0') entry.callsign = callsignRaw;
    if (imoRaw && imoRaw !== '0') entry.imo = imoRaw;
    entry.type = shipTypeLabel(typeCode) ?? entry.type;
    entry.flag = flagFromMmsi(mmsi);
    if (dim) {
      const a = Number(dim.A ?? 0);
      const b = Number(dim.B ?? 0);
      const c = Number(dim.C ?? 0);
      const d = Number(dim.D ?? 0);
      if (a + b > 0) entry.lengthM = a + b;
      if (c + d > 0) entry.widthM = c + d;
    }
    this.vesselMeta.set(mmsi, entry);

    const existing = this.vessels.get(mmsi);
    if (existing) {
      if (dest && !dest.match(/^@+$/)) existing.destination = dest;
      existing.flag = entry.flag;
      existing.callsign = entry.callsign;
      existing.imo = entry.imo;
      existing.type = entry.type;
      existing.lengthM = entry.lengthM;
      existing.widthM = entry.widthM;
    }
  }

  private closeAisStream() {
    if (this.aisReconnectTimer) {
      clearTimeout(this.aisReconnectTimer);
      this.aisReconnectTimer = null;
    }
    if (this.aisWs) {
      this.aisIntentionalClose = true;
      try {
        this.aisWs.close();
      } catch {
        // already closed
      }
      this.aisWs = null;
      this.aisConnecting = false;
    }
  }

  private scheduleAisReconnect() {
    if (this.aisReconnectTimer) return;
    this.aisReconnectTimer = setTimeout(() => {
      this.aisReconnectTimer = null;
      this.connectAisStream();
    }, 5_000);
  }

  // --------------- OpenSky Network (airplanes) ---------------

  private startOpenskyPolling() {
    const hasAuth = this.openskyClientId && this.openskyClientSecret;
    const interval = hasAuth ? OPENSKY_POLL_MS_AUTH : OPENSKY_POLL_MS_ANON;

    this.logger.log(
      `OpenSky polling every ${interval / 1000}s (${hasAuth ? 'authenticated' : 'anonymous'})`,
    );

    this.pollOpensky();
    this.openskyPollTimer = setInterval(() => this.pollOpensky(), interval);
  }

  private async getOpenskyHeaders(): Promise<Record<string, string>> {
    if (!this.openskyClientId || !this.openskyClientSecret) return {};

    if (this.openskyToken && Date.now() / 1000 < this.openskyTokenExpiresAt) {
      return { Authorization: `Bearer ${this.openskyToken}` };
    }

    try {
      const res = await fetch(OPENSKY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.openskyClientId,
          client_secret: this.openskyClientSecret,
        }),
      });

      if (!res.ok) {
        this.logger.warn(`OpenSky token request failed: ${res.status}`);
        return {};
      }

      const data = (await res.json()) as { access_token: string; expires_in: number };
      this.openskyToken = data.access_token;
      this.openskyTokenExpiresAt =
        Date.now() / 1000 + data.expires_in - OPENSKY_TOKEN_REFRESH_MARGIN;
      return { Authorization: `Bearer ${this.openskyToken}` };
    } catch (err) {
      this.logger.error(`OpenSky token error: ${(err as Error).message}`);
      return {};
    }
  }

  private async pollOpensky() {
    try {
      const headers = await this.getOpenskyHeaders();
      const url = `${OPENSKY_API}/states/all?extended=1`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        this.logger.warn(`OpenSky ${res.status}: ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as { time: number; states: unknown[][] | null };
      if (!data.states) return;

      const now = Date.now();
      const seen = new Set<string>();

      for (const sv of data.states) {
        const icao24 = String(sv[0] ?? '').trim();
        if (!icao24 || seen.has(icao24)) continue;

        const lat = sv[6] as number | null;
        const lon = sv[5] as number | null;
        if (lat == null || lon == null) continue;

        const onGround = sv[8] as boolean;
        if (onGround) continue;

        seen.add(icao24);

        const callsign = String(sv[1] ?? '').trim() || icao24;
        const country = String(sv[2] ?? '');
        const baroAlt = sv[7] as number | null;
        const velocity = sv[9] as number | null;
        const heading = sv[10] as number | null;
        const category = (sv[17] as number) ?? 0;

        const aid = `a-${icao24}`;
        const trail = this.appendTrail(aid, lon, lat);

        const cached = this.airplaneRouteCache.get(callsign);
        const routeValid = cached && (now - cached.fetchedAt) < ROUTE_CACHE_TTL_MS;

        const speedKnots = velocity != null ? velocity * 1.94384 : 0;
        const altFeet = baroAlt != null ? Math.round(baroAlt * 3.28084) : undefined;

        this.airplanes.set(icao24, {
          id: aid,
          kind: 'airplane',
          name: callsign,
          lat,
          lng: lon,
          heading: heading ?? 0,
          speed: speedKnots,
          updatedAt: now,
          trail,
          origin: routeValid ? cached.origin : undefined,
          destination: routeValid ? cached.destination : undefined,
          callsign: callsign !== icao24 ? callsign : undefined,
          flag: country || undefined,
          type: OPENSKY_CATEGORIES[category] || undefined,
          altitude: altFeet,
        });
      }

      this.logger.log(`OpenSky: ${seen.size} airborne aircraft`);
      this.fetchMissingAirplaneRoutes();
    } catch (err) {
      this.logger.error(`OpenSky poll error: ${(err as Error).message}`);
    }
  }

  // --------------- hexdb.io (airplane routes) ---------------

  private fetchMissingAirplaneRoutes() {
    const now = Date.now();
    const toFetch: string[] = [];

    for (const airplane of this.airplanes.values()) {
      const callsign = airplane.name;
      if (!callsign || callsign.length < 3) continue;
      if (this.routeFetchInFlight.has(callsign)) continue;

      const cached = this.airplaneRouteCache.get(callsign);
      if (cached === null) continue;
      if (cached && (now - cached.fetchedAt) < ROUTE_CACHE_TTL_MS) continue;

      toFetch.push(callsign);
      if (toFetch.length >= HEXDB_BATCH_SIZE) break;
    }

    for (const callsign of toFetch) {
      this.fetchRouteFromHexDb(callsign);
    }
  }

  private async fetchRouteFromHexDb(callsign: string) {
    this.routeFetchInFlight.add(callsign);
    try {
      const url = `https://hexdb.io/api/v1/route/icao/${encodeURIComponent(callsign)}`;
      const res = await fetch(url);

      if (!res.ok) {
        this.airplaneRouteCache.set(callsign, null);
        return;
      }

      const data = (await res.json()) as { route?: string };
      const route = data.route;
      if (!route || !route.includes('-')) {
        this.airplaneRouteCache.set(callsign, null);
        return;
      }

      const parts = route.split('-');
      const origin = parts[0];
      const destination = parts[parts.length - 1];

      const cached: CachedRoute = { origin, destination, fetchedAt: Date.now() };
      this.airplaneRouteCache.set(callsign, cached);

      for (const airplane of this.airplanes.values()) {
        if (airplane.name === callsign) {
          airplane.origin = origin;
          airplane.destination = destination;
        }
      }
    } catch {
      this.airplaneRouteCache.set(callsign, null);
    } finally {
      this.routeFetchInFlight.delete(callsign);
    }
  }

  private pruneStale() {
    const now = Date.now();
    const vesselCutoff = now - STALE_VESSEL_MS;
    const airplaneCutoff = now - STALE_AIRPLANE_MS;

    for (const [id, v] of this.vessels) {
      if (v.updatedAt < vesselCutoff) {
        this.vessels.delete(id);
        this.trails.delete(v.id);
        this.vesselDestinations.delete(id);
      }
    }
    for (const [id, a] of this.airplanes) {
      if (a.updatedAt < airplaneCutoff) {
        this.airplanes.delete(id);
        this.trails.delete(a.id);
      }
    }
  }
}
