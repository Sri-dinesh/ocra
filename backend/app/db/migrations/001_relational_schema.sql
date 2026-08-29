-- ==============================================================================
-- ORCA (SIH26176) — Full Relational PostGIS Database Migration
-- Specification: docs/Backend_Workflow.md §7
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Clean Existing Schema (if re-initializing)
DROP TABLE IF EXISTS evidence_items CASCADE;
DROP TABLE IF EXISTS plan_steps CASCADE;
DROP TABLE IF EXISTS query_logs CASCADE;
DROP TABLE IF EXISTS watchdog_alerts CASCADE;
DROP TABLE IF EXISTS watchdog_subscriptions CASCADE;
DROP TABLE IF EXISTS vessels CASCADE;
DROP TABLE IF EXISTS hazards CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS ocean_states CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- ==============================================================================
-- 3. Canonical Sources Vocabulary (§7.3.1)
-- ==============================================================================
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    provider_org TEXT,
    access_method TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT false
);

-- ==============================================================================
-- 4. Fused Ocean Environmental Observations (§7.3.2)
-- ==============================================================================
CREATE TABLE ocean_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    valid_time TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sst_c FLOAT8,
    sst_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    chl_a_mgm3 FLOAT8,
    chl_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    wave_height_m FLOAT8,
    wave_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    wind_speed_kt FLOAT8,
    wind_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    current_speed_ms FLOAT8,
    current_dir_deg FLOAT8,
    current_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    quality TEXT NOT NULL CHECK (quality IN ('good', 'stale', 'partial'))
);

-- ==============================================================================
-- 5. Marine Spatial Zones & Geofences (§7.3.3)
-- ==============================================================================
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('imbl', 'mpa', 'restricted', 'pfz')),
    geom geometry(Polygon, 4326) NOT NULL,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true
);

-- ==============================================================================
-- 6. Meteorological & Ocean Hazards (§7.3.4)
-- ==============================================================================
CREATE TABLE hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_type TEXT NOT NULL CHECK (hazard_type IN ('cyclone', 'high_wave', 'lightning')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    geom geometry(Polygon, 4326),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    raw_bulletin_ref TEXT
);

-- ==============================================================================
-- 7. Vessel Registry (§7.3.5)
-- ==============================================================================
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    lat FLOAT8 NOT NULL,
    lon FLOAT8 NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. Watchdog Subscriptions (§7.3.6)
-- ==============================================================================
CREATE TABLE watchdog_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    poll_interval_seconds INT NOT NULL DEFAULT 30,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. Durable Watchdog Alert History (§7.3.7)
-- ==============================================================================
CREATE TABLE watchdog_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('HIGH_WAVE', 'IMBL_PROXIMITY', 'CYCLONE')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    message TEXT NOT NULL,
    triggered_hazard_id UUID REFERENCES hazards(id) ON DELETE SET NULL,
    triggered_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN NOT NULL DEFAULT false
);

-- ==============================================================================
-- 10. Query History Header (§7.3.8)
-- ==============================================================================
CREATE TABLE query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_query TEXT NOT NULL,
    detected_language TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('fisherman', 'researcher', 'coast_guard', 'policymaker')),
    intent TEXT NOT NULL,
    location_lat FLOAT8,
    location_lon FLOAT8,
    time_window_start TIMESTAMPTZ,
    time_window_end TIMESTAMPTZ,
    risk_score FLOAT8,
    risk_band TEXT CHECK (risk_band IN ('low', 'moderate', 'high', 'extreme')),
    sail_clearance BOOLEAN,
    final_response_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. Multi-Agent Execution Plan Steps Trace (§7.3.9)
-- ==============================================================================
CREATE TABLE plan_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_log_id UUID NOT NULL REFERENCES query_logs(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL CHECK (agent_name IN ('planner', 'ocean', 'weather', 'gis', 'guardrail', 'risk', 'synthesis')),
    step_order INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
    duration_ms INT
);

-- ==============================================================================
-- 12. Relational Evidence Audit Items (§7.3.10)
-- ==============================================================================
CREATE TABLE evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_log_id UUID NOT NULL REFERENCES query_logs(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    supporting_value FLOAT8,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    ocean_state_id UUID REFERENCES ocean_states(id) ON DELETE SET NULL,
    hazard_id UUID REFERENCES hazards(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    quality TEXT NOT NULL CHECK (quality IN ('good', 'stale', 'partial', 'missing')),
    fetched_at TIMESTAMPTZ
);

-- ==============================================================================
-- 13. Required Performance & Spatial Indexes (§7.4)
-- ==============================================================================
-- Spatial GIST Indexes
CREATE INDEX IF NOT EXISTS idx_ocean_states_geom ON ocean_states USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hazards_geom ON hazards USING GIST (geom);

-- Foreign Key B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_ocean_states_sst_src ON ocean_states(sst_source_id);
CREATE INDEX IF NOT EXISTS idx_ocean_states_chl_src ON ocean_states(chl_source_id);
CREATE INDEX IF NOT EXISTS idx_ocean_states_wave_src ON ocean_states(wave_source_id);
CREATE INDEX IF NOT EXISTS idx_ocean_states_wind_src ON ocean_states(wind_source_id);
CREATE INDEX IF NOT EXISTS idx_ocean_states_curr_src ON ocean_states(current_source_id);
CREATE INDEX IF NOT EXISTS idx_zones_src ON zones(source_id);
CREATE INDEX IF NOT EXISTS idx_hazards_src ON hazards(source_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_subs_vessel ON watchdog_subscriptions(vessel_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_alerts_vessel ON watchdog_alerts(vessel_id);
CREATE INDEX IF NOT EXISTS idx_watchdog_alerts_time ON watchdog_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_time ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_steps_query ON plan_steps(query_log_id, step_order);
CREATE INDEX IF NOT EXISTS idx_evidence_items_query ON evidence_items(query_log_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_src ON evidence_items(source_id);

-- ==============================================================================
-- 14. Initial Seed Data for Sources (§7.3.1, §7.5)
-- ==============================================================================
INSERT INTO sources (code, display_name, provider_org, access_method, is_mock) VALUES
    ('incois_osf', 'INCOIS Ocean State Forecast', 'INCOIS', 'ncss_api', false),
    ('copernicus_cmems', 'Copernicus Marine Environment Monitoring Service', 'Copernicus Marine Service', 'cmems_api', false),
    ('noaa_erddap', 'NOAA CoastWatch Daily Chlorophyll', 'NOAA CoastWatch', 'erddap_api', false),
    ('incois_pfz', 'INCOIS Potential Fishing Zones', 'INCOIS', 'pfz_api', false),
    ('imd_bulletin', 'IMD Coastal Weather & Cyclone Bulletins', 'India Meteorological Department', 'bulletin_feed', false),
    ('obis', 'Ocean Biodiversity Information System', 'OBIS/GBIF', 'rest_api', false),
    ('survey_of_india', 'Survey of India Maritime Datum', 'Survey of India', 'gis_datum', false),
    ('moefcc', 'Ministry of Environment, Forest and Climate Change', 'MoEFCC', 'gis_datum', false)
ON CONFLICT (code) DO NOTHING;
