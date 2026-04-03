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
const STALE_AIRPLANE_MS = 5 * 60 * 1000;
const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';
const ADSB_POLL_MS = 30_000;
const ADSB_BATCH_SIZE = 50;
const ADSB_BATCH_GAP_MS = 500;
const ADSB_API = 'https://api.adsb.lol/v2';

const ICAO_TYPE_NAMES: Record<string, string> = {
  A19N: 'Airbus A319neo', A20N: 'Airbus A320neo', A21N: 'Airbus A321neo',
  A318: 'Airbus A318', A319: 'Airbus A319', A320: 'Airbus A320', A321: 'Airbus A321',
  A332: 'Airbus A330-200', A333: 'Airbus A330-300', A338: 'Airbus A330-800neo',
  A339: 'Airbus A330-900neo', A342: 'Airbus A340-200', A343: 'Airbus A340-300',
  A345: 'Airbus A340-500', A346: 'Airbus A340-600', A359: 'Airbus A350-900',
  A35K: 'Airbus A350-1000', A388: 'Airbus A380-800',
  AT72: 'ATR 72', AT76: 'ATR 72-600',
  B37M: 'Boeing 737 MAX 7', B38M: 'Boeing 737 MAX 8', B39M: 'Boeing 737 MAX 9',
  B3XM: 'Boeing 737 MAX 10', B712: 'Boeing 717',
  B733: 'Boeing 737-300', B734: 'Boeing 737-400', B735: 'Boeing 737-500',
  B736: 'Boeing 737-600', B737: 'Boeing 737-700', B738: 'Boeing 737-800', B739: 'Boeing 737-900',
  B744: 'Boeing 747-400', B748: 'Boeing 747-8',
  B752: 'Boeing 757-200', B753: 'Boeing 757-300',
  B762: 'Boeing 767-200', B763: 'Boeing 767-300', B764: 'Boeing 767-400',
  B772: 'Boeing 777-200', B77L: 'Boeing 777-200LR', B77W: 'Boeing 777-300ER',
  B778: 'Boeing 777-8', B779: 'Boeing 777-9',
  B788: 'Boeing 787-8', B789: 'Boeing 787-9', B78X: 'Boeing 787-10',
  BCS1: 'Airbus A220-100', BCS3: 'Airbus A220-300',
  C172: 'Cessna 172', C208: 'Cessna 208 Caravan', C560: 'Cessna Citation V',
  C680: 'Cessna Citation Sovereign', C700: 'Cessna Citation Longitude',
  CRJ2: 'Bombardier CRJ-200', CRJ7: 'Bombardier CRJ-700', CRJ9: 'Bombardier CRJ-900',
  DH8D: 'Dash 8-400', E170: 'Embraer E170', E175: 'Embraer E175',
  E190: 'Embraer E190', E195: 'Embraer E195', E290: 'Embraer E190-E2', E295: 'Embraer E195-E2',
  F900: 'Dassault Falcon 900', FA7X: 'Dassault Falcon 7X', FA8X: 'Dassault Falcon 8X',
  G550: 'Gulfstream G550', G650: 'Gulfstream G650', GLEX: 'Bombardier Global Express',
  GL7T: 'Bombardier Global 7500', MD11: 'McDonnell Douglas MD-11',
  PC12: 'Pilatus PC-12', PC24: 'Pilatus PC-24', SR22: 'Cirrus SR22',
};

const ADSB_REGIONS: [number, number, number][] = (() => {
  const regions: [number, number, number][] = [];
  const step = 7;
  for (let lat = -50; lat <= 65; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      regions.push([lat, lon, 250]);
    }
  }
  return regions;
})();


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

  private adsbPollTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private config: ConfigService) {
    this.aisStreamKey = this.config.get('AISSTREAM_API_KEY') ?? '';
  }

  onModuleInit() {
    if (this.aisStreamKey) {
      this.connectAisStream();
    } else {
      this.logger.warn('AISSTREAM_API_KEY not set — vessel tracking disabled');
    }

    this.startAdsbPolling();

    this.pruneTimer = setInterval(() => this.pruneStale(), 30_000);
    this.logger.log('TransportationService initialized');
  }

  onModuleDestroy() {
    this.closeAisStream();
    if (this.adsbPollTimer) clearInterval(this.adsbPollTimer);
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
      this.logger.log('AISStream WebSocket connected, sending subscribe...');

      const sub = {
        APIKey: this.aisStreamKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      this.logger.log(`AISStream subscribe key length=${this.aisStreamKey.length}`);
      ws.send(JSON.stringify(sub));
    });

    let msgCount = 0;
    ws.on('message', (raw: Buffer) => {
      try {
        const text = raw.toString();
        if (msgCount < 3) {
          this.logger.log(`AISStream msg #${msgCount}: ${text.slice(0, 300)}`);
        }
        msgCount++;

        const msg = JSON.parse(text);

        if (msg.error) {
          this.logger.error(`AISStream error message: ${JSON.stringify(msg)}`);
          return;
        }

        if (msg.MessageType === 'PositionReport') {
          this.handleAisPosition(msg);
        } else if (msg.MessageType === 'ShipStaticData') {
          this.handleShipStaticData(msg);
        }
      } catch {
        this.logger.warn(`AISStream unparseable: ${raw.toString().slice(0, 200)}`);
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


  private startAdsbPolling() {
    this.pollAllAdsbRegions();
    this.adsbPollTimer = setInterval(() => this.pollAllAdsbRegions(), ADSB_POLL_MS);
    this.logger.log(`adsb.lol polling every ${ADSB_POLL_MS / 1000}s across ${ADSB_REGIONS.length} regions`);
  }

  private async pollAllAdsbRegions() {
    const seen = new Set<string>();
    const now = Date.now();

    for (let i = 0; i < ADSB_REGIONS.length; i += ADSB_BATCH_SIZE) {
      const batch = ADSB_REGIONS.slice(i, i + ADSB_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(([lat, lon, dist]) => this.fetchAdsbRegion(lat, lon, dist)),
      );

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        this.processAdsbAircraft(result.value, seen, now);
      }

      if (i + ADSB_BATCH_SIZE < ADSB_REGIONS.length) {
        await new Promise((r) => setTimeout(r, ADSB_BATCH_GAP_MS));
      }
    }

    this.logger.log(`adsb.lol: ${seen.size} airborne aircraft`);
    this.fetchMissingAirplaneRoutes();
  }

  private processAdsbAircraft(aircraft: AdsbAircraft[], seen: Set<string>, now: number) {
    for (const ac of aircraft) {
        const hex = ac.hex;
        if (!hex || seen.has(hex)) continue;

        const lat = Number(ac.lat ?? 0);
        const lon = Number(ac.lon ?? 0);
        if (lat === 0 && lon === 0) continue;
        if (ac.alt_baro === 'ground') continue;

        seen.add(hex);
        const callsign = String(ac.flight ?? ac.r ?? hex).trim();
        const aid = `a-${hex}`;
        const trail = this.appendTrail(aid, lon, lat);

        const cached = this.airplaneRouteCache.get(callsign);
        const routeValid = cached && (now - cached.fetchedAt) < ROUTE_CACHE_TTL_MS;

        const registration = String(ac.r ?? '').trim() || undefined;
        const rawType = String(ac.t ?? '').trim();
        const acType = (ICAO_TYPE_NAMES[rawType] ?? rawType) || undefined;
        const ownOp = String(ac.ownOp ?? ac.operator ?? '').trim() || undefined;
        const altBaro = typeof ac.alt_baro === 'number'
          ? Math.round(ac.alt_baro)
          : undefined;
        const flightCs = String(ac.flight ?? '').trim() || undefined;

        this.airplanes.set(hex, {
          id: aid,
          kind: 'airplane',
          name: callsign,
          lat,
          lng: lon,
          heading: Number(ac.track ?? ac.mag_heading ?? ac.true_heading ?? 0),
          speed: Number(ac.gs ?? 0),
          updatedAt: now,
          trail,
          origin: routeValid ? cached.origin : undefined,
          destination: routeValid ? cached.destination : undefined,
          registration,
          type: acType,
          operator: ownOp,
          callsign: flightCs,
          altitude: altBaro,
        });
      }
  }

  private async fetchAdsbRegion(
    lat: number,
    lon: number,
    dist: number,
  ): Promise<AdsbAircraft[]> {
    try {
      const url = `${ADSB_API}/lat/${lat}/lon/${lon}/dist/${dist}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as { ac?: AdsbAircraft[] };
      return data.ac ?? [];
    } catch {
      return [];
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

type AdsbAircraft = {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  mag_heading?: number;
  true_heading?: number;
  ownOp?: string;
  operator?: string;
  [key: string]: unknown;
};
