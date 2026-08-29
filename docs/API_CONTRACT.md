# ORCA — API Contract (Single Source of Truth)

**Owner: Sridinesh (Lead) | Location: `docs/API_CONTRACT.md`**

This file is the literal contract every endpoint, mock file, and TypeScript type must match exactly. It is a plain extract of the Lead doc §3–§4, kept here as its own file so Charan and Akash can check field shapes without opening the full lead doc. If this file and the Lead doc ever disagree, update both in the same sitting — they must never drift apart.

**Rule for all three members:** if a field needs to change (name, type, added, removed), it changes **here first**, then in the Lead doc, then in both mock files (`backend/app/mock/*.json` and `mobile/src/api/mock/*.json`) and `mobile/src/types/contract.ts`, in that order, before any endpoint code is written or edited to match. Nobody edits their own local shape unilaterally.

---

## 1. Status

| Endpoint | Owner | Status |
|---|---|---|
| `POST /api/v1/query` | Sridinesh | Contract frozen — implement against this |
| `GET /api/v1/evidence/{query_id}` | Sridinesh | Contract frozen — implement against this |
| `POST /api/v1/route` | Charan | Contract frozen — implement against this |
| `GET /api/v1/oceanstate` | Charan | Contract frozen — implement against this |
| `GET /api/v1/sync/payload` | Charan | Contract frozen — implement against this |
| `POST /api/v1/watchdog/subscribe` | Charan | Contract frozen — implement against this |
| Watchdog alert payload (push) | Charan (produce) / Akash (consume) | Contract frozen — implement against this |

Update the Status column as work lands: `Contract frozen` → `Implemented (mock-verified)` → `Live-tested`.

---

## 2. Database Schema Reference

Full DDL-level detail lives in Charan's doc, Phase 1. Table shapes below are what Sridinesh's and Akash's code are allowed to assume exist.

### `ocean_states`
`id (uuid, PK)`, `lat (float8)`, `lon (float8)`, `geom (geometry Point,4326)`, `valid_time (timestamptz)`, `fetched_at (timestamptz)`, `sst_c (float8, nullable)`, `chl_a_mgm3 (float8, nullable)`, `wave_height_m (float8, nullable)`, `wind_speed_kt (float8, nullable)`, `current_speed_ms (float8, nullable)`, `current_dir_deg (float8, nullable)`, `source_map (jsonb)`, `quality (text: good/stale/partial)`

### `zones`
`id (uuid, PK)`, `name (text)`, `zone_type (text: imbl/mpa/restricted/pfz)`, `geom (geometry Polygon,4326)`, `source (text)`, `active (boolean)`

### `hazards`
`id (uuid, PK)`, `hazard_type (text: cyclone/high_wave/lightning)`, `severity (text: low/moderate/high/critical)`, `geom (geometry Polygon,4326, nullable)`, `valid_from (timestamptz)`, `valid_until (timestamptz, nullable)`, `source (text)`, `raw_bulletin_ref (text, nullable)`

### `vessels`
`id (uuid, PK)`, `label (text)`, `lat (float8)`, `lon (float8)`, `updated_at (timestamptz)`

### `query_logs`
`id (uuid, PK — this is the query_id)`, `raw_query (text)`, `detected_language (text)`, `intent (text)`, `plan_json (jsonb)`, `evidence_json (jsonb)`, `role (text)`, `created_at (timestamptz)`

**Write ownership:** Charan creates and owns all five tables. Sridinesh is the only one who writes to `query_logs`; Charan never writes to it.

---

## 3. Endpoint Contracts

### 3.1 `POST /api/v1/query`
**Owner:** Sridinesh

Request:
```json
{
  "text": "Can I go fishing tomorrow morning near Kakinada?",
  "location_hint": { "lat": 16.9891, "lon": 82.2475, "name": "Kakinada" },
  "role": "fisherman",
  "language": "en-IN"
}
```

Response:
```json
{
  "query_id": "f3a1c2e0-...",
  "intent": "sail_clearance",
  "recommendation": "Clear to sail east from Kakinada, 29 Aug 06:00 IST",
  "risk_score": 22,
  "risk_band": "low",
  "evidence": [
    { "claim": "Wave height 1.8m", "source": "INCOIS OSF", "fetched_at": "2026-08-28T22:10:00+05:30" },
    { "claim": "No active cyclone bulletin for this cell", "source": "IMD", "fetched_at": "2026-08-28T21:00:00+05:30" }
  ],
  "confidence": "high",
  "caveats": ["Prototype risk score — not an official safety certification."],
  "map_layers": ["pfz", "sst_heatmap", "geofence"],
  "language": "en-IN"
}
```

Field notes:
- `intent` — one of `sail_clearance`, `pfz_lookup`, `anomaly_detection`, `route_request`, `general_query`, `clarification_needed`.
- `risk_band` — one of `low` (0–25), `moderate` (26–50), `high` (51–75), `extreme` (76–100).
- `confidence` — one of `high`, `medium`, `low` — reflects data freshness/completeness, set by the Guardrail, not the LLM.
- `caveats` — always includes the prototype-risk disclaimer whenever `risk_score` is present; may include staleness/missing-data notes.
- `map_layers` — subset of `["pfz", "sst_heatmap", "chl_heatmap", "geofence", "route", "hazards"]`, tells the frontend which map layers are relevant to this answer.

### 3.2 `GET /api/v1/evidence/{query_id}`
**Owner:** Sridinesh

Response:
```json
{
  "query_id": "f3a1c2e0-...",
  "raw_query": "Can I go fishing tomorrow morning near Kakinada?",
  "plan": {
    "intent": "sail_clearance",
    "location": { "lat": 16.9891, "lon": 82.2475 },
    "required_agents": ["ocean", "weather", "gis"]
  },
  "evidence": [
    { "claim": "Wave height 1.8m", "source": "INCOIS OSF", "fetched_at": "2026-08-28T22:10:00+05:30" }
  ],
  "created_at": "2026-08-28T22:11:03+05:30"
}
```
Returns `404` for an unknown `query_id`.

### 3.3 `POST /api/v1/route`
**Owner:** Charan

Request:
```json
{ "start": { "lat": 16.9891, "lon": 82.2475 }, "goal": { "lat": 17.15, "lon": 82.45 }, "boat_class": "small" }
```

Response:
```json
{
  "route": [
    { "lat": 16.9891, "lon": 82.2475 },
    { "lat": 17.02, "lon": 82.31 },
    { "lat": 17.15, "lon": 82.45 }
  ],
  "distance_nm": 14.2,
  "avoided_zones": ["imbl_segment_04"],
  "pathfinder": "astar"
}
```
`avoided_zones` lists zone identifiers/names the route deliberately routed around. `pathfinder` is always `"astar"` for real routes; may read `"mock"` when `USE_MOCK_CONNECTORS=true`.

### 3.4 `GET /api/v1/oceanstate?lat={lat}&lon={lon}&time={iso8601}`
**Owner:** Charan

Response:
```json
{
  "lat": 16.9891,
  "lon": 82.2475,
  "valid_time": "2026-08-29T06:00:00+05:30",
  "sst_c": 28.2,
  "chl_a_mgm3": 1.4,
  "wave_height_m": 1.8,
  "wind_speed_kt": 14,
  "source_map": { "sst_c": "Copernicus CMEMS", "wave_height_m": "INCOIS OSF" },
  "quality": "good"
}
```
`quality` is one of `good`, `stale`, `partial` — never omitted, always reflects the true freshness of the underlying fused data.

### 3.5 `GET /api/v1/sync/payload?cell={lat},{lon}`
**Owner:** Charan

Compact payload for the mobile offline cache. Kept intentionally small (well under 1KB serialized).

```json
{
  "v": 1,
  "t": "2026-08-29T06:00:00+05:30",
  "cell": { "lat": 16.9891, "lon": 82.2475 },
  "wave_m": 1.8,
  "wind_kt": 14,
  "sst_c": 28.2,
  "chl": 1.4,
  "hz": [],
  "imbl_nm": 42.6
}
```
Field notes:
- `v` — payload schema version (increment if the shape changes).
- `t` — the last-computed/fused timestamp for this cell. This is what the mobile offline banner displays as "synced at HH:MM" — it is not the request time.
- `hz` — array of active hazard summaries for this cell (empty array, not null, when none active), e.g. `[{"type": "cyclone", "severity": "high"}]`.
- `imbl_nm` — distance in nautical miles from this cell to the nearest IMBL point.

### 3.6 `POST /api/v1/watchdog/subscribe`
**Owner:** Charan

Request:
```json
{ "vessel_id": "demo-vessel-01" }
```

Response:
```json
{ "subscribed": true, "vessel_id": "demo-vessel-01", "poll_interval_seconds": 30 }
```
No auth — any `vessel_id` is accepted for MVP, matching the project's no-authentication scope.

### 3.7 Watchdog Alert Payload (produced by Charan's daemon, consumed by Akash's app)

This is not a request/response pair — it's the payload shape delivered via whatever polling/push mechanism Charan implements (see his doc, Phase 5).

```json
{
  "alert_type": "IMBL_PROXIMITY",
  "severity": "critical",
  "vessel_id": "demo-vessel-01",
  "message": "You are 1.2nm from the International Maritime Boundary Line. Recommend course correction.",
  "triggered_at": "2026-08-29T06:42:00+05:30"
}
```
`alert_type` — one of `HIGH_WAVE`, `IMBL_PROXIMITY`, `CYCLONE`. `severity` — one of `low`, `moderate`, `high`, `critical`. A `critical` alert is what triggers Akash's full-screen auto-voice overlay (his doc, Task A7.3).

---

## 4. Mock Data Policy

Two physically separate sets of mock files exist, and they must stay byte-identical in field names/types:

- `backend/app/mock/mock_query_response.json`, `mock_route_response.json`, `mock_oceanstate_response.json`, `mock_watchdog_alert.json` — used by Sridinesh/Charan to verify their real endpoints return the exact contracted shape (diff-tested).
- `mobile/src/api/mock/` — same four files, used by Akash's `USE_MOCK` client so the entire app builds and demos with zero backend dependency.

**Why duplicated, not shared:** the mobile app must run standalone even if the backend repo doesn't build. This is deliberate redundancy, not an oversight.

**Rule:** any field change gets applied to both copies plus `mobile/src/types/contract.ts` in the same sitting. A mismatch between mock and real response shape is the single most likely late-stage integration bug — check it explicitly before merge day.

---

## 5. Data Source Access Notes (filled in by Charan, Phase 2)

This section is populated by Charan's Task C2.2 as each source is validated. Placeholder until then:

| Source | Access method | Auth | Rate limit | Update cadence |
|---|---|---|---|---|
| INCOIS PFZ | *TBD* | *TBD* | *TBD* | *TBD* |
| INCOIS OSF | *TBD* | *TBD* | *TBD* | *TBD* |
| Copernicus CMEMS | *TBD* | *TBD* | *TBD* | *TBD* |
| NOAA ERDDAP | *TBD* | *TBD* | *TBD* | *TBD* |
| IMD bulletins | *TBD* | *TBD* | *TBD* | *TBD* |
| OBIS/GBIF | *TBD* | *TBD* | *TBD* | *TBD* |

---

## 6. Merge-Day Function Signature Reference (filled in by Charan, Task C7.4)

Sridinesh's `backend/app/agents/_stubs.py` is written to match these exact signatures so the merge is a one-line import swap per function, not a rewrite. Filled in once Charan finalizes each function:

| Stub function (Sridinesh's `_stubs.py`) | Real function (Charan's code) | Signature |
|---|---|---|
| `stub_fetch_ocean_data(lat, lon, time_window)` | `app.geospatial.fusion.fuse(lat, lon, time_window)` | *confirm return shape matches `ocean_states` row* |
| `stub_fetch_weather_hazard(lat, lon, time_window)` | `app.connectors.imd_bulletin.fetch(lat, lon, time_window)` | *confirm return shape matches `hazards` list* |
| `stub_check_geofence(lat, lon)` | `app.geospatial.geofence.check_point(lat, lon)` | *confirm return shape matches `zones` list* |

Once filled in, merge day becomes: delete `_stubs.py`, update the three import lines in `backend/app/agents/graph.py` (each already marked `# MERGE:` per Sridinesh's Task S6.3), run the eval set (Task S8.2), done.

---

## 7. Sync/Merge-Day Checklist (assembled from all three docs)

- [ ] Charan's tables exist in Supabase exactly matching §2 above (`query_logs` especially — Sridinesh writes to it).
- [ ] `mock_*.json` files in `backend/app/mock/` and `mobile/src/api/mock/` are byte-identical in shape.
- [ ] `mobile/src/types/contract.ts` matches §3 exactly, field-for-field.
- [ ] Every `# MERGE:` marker in `backend/app/agents/graph.py` has been swapped to Charan's real function per §6 above.
- [ ] `backend/tests/test_pipeline.py` (Sridinesh's eval set) passes against real connectors, not just stubs.
- [ ] Akash flips `USE_MOCK=false` and `API_BASE_URL` to the deployed Render URL; smoke-tests `/query`, `/route`, `/oceanstate` from the app.
- [ ] `USE_MOCK_CONNECTORS=true` fallback (Charan's) is confirmed working, as demo-day insurance, even after live integration is confirmed.
- [ ] Full merge: `charan` → `main`, then `akash` → `main`, tag `v1.0-demo`.
