/**
 * ORCA API Contract Types (Single Source of Truth)
 * Exact TypeScript representations mirroring backend schemas and docs/API_CONTRACT.md.
 */

export interface LocationHint {
  lat: number;
  lon: number;
  name?: string;
}

export interface QueryRequest {
  text: string;
  location_hint?: LocationHint;
  role?: 'fisherman' | 'researcher' | 'coast_guard' | 'policymaker';
  language?: string;
}

export interface EvidenceItem {
  claim: string;
  source: string;
  fetched_at: string;
  supporting_value?: any;
}

export interface QueryResponse {
  query_id: string;
  intent: 'sail_clearance' | 'pfz_lookup' | 'anomaly_detection' | 'route_request' | 'general_query' | 'clarification_needed' | string;
  recommendation: string;
  risk_score?: number;
  risk_band?: 'low' | 'moderate' | 'high' | 'extreme';
  evidence: EvidenceItem[];
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
  map_layers: string[];
  language: string;
}

export interface EvidenceDetailResponse {
  query_id: string;
  raw_query: string;
  plan: {
    intent: string;
    location?: LocationHint;
    required_agents?: string[];
    [key: string]: any;
  };
  evidence: EvidenceItem[];
  created_at: string;
}

export interface LatLonPoint {
  lat: number;
  lon: number;
}

export interface RouteRequest {
  start: LatLonPoint;
  goal: LatLonPoint;
  boat_class?: string;
}

export interface RouteResponse {
  route: LatLonPoint[];
  distance_nm: number;
  avoided_zones: string[];
  pathfinder: string;
}

export interface OceanStateResponse {
  lat: number;
  lon: number;
  valid_time: string;
  sst_c?: number;
  chl_a_mgm3?: number;
  wave_height_m?: number;
  wind_speed_kt?: number;
  current_speed_ms?: number;
  current_dir_deg?: number;
  source_map: Record<string, string>;
  quality: 'good' | 'stale' | 'partial';
}

export interface HazardSummary {
  type: string;
  severity: string;
}

export interface SyncPayloadResponse {
  v: number;
  t: string;
  cell: {
    lat: number;
    lon: number;
  };
  wave_m?: number;
  wind_kt?: number;
  sst_c?: number;
  chl?: number;
  hz: HazardSummary[];
  imbl_nm?: number;
}

export interface WatchdogAlert {
  alert_type: 'HIGH_WAVE' | 'IMBL_PROXIMITY' | 'CYCLONE' | 'GALE' | string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  vessel_id: string;
  message: string;
  triggered_at: string;
}

export interface SubscribeRequest {
  label: string;
  lat: number;
  lon: number;
}

export interface SubscribeResponse {
  vessel_id: string;
  message: string;
  poll_interval_seconds: number;
}

export interface WatchdogPollResponse {
  vessel_id: string;
  active_alerts: WatchdogAlert[];
  total_active: number;
}
