# ORCA — Implementation Plan: Charan
## Backend-B — Data Connectors, Database (Supabase/PostGIS), Geospatial Engine, Watchdog Daemon

**SIH26176 | Reports to: Sridinesh (Lead)**

This is your complete, self-contained task list. Everything you need — tech stack, folder structure, database schema, and the exact API response shapes you must produce — is frozen in `ORCA_Implementation_Plan_LEAD_Sridinesh.md` (§1–§4). Read that document's §1–§5 once before starting; you don't need to read Sridinesh's or Akash's task lists (§6 in the lead doc, or the Akash doc) to do your own work.

**Your independence guarantee:** you never call Sridinesh's agent/reasoning code, and Sridinesh never calls your real functions during development — he builds against stub functions with your exact planned signatures (see §6.3 below). At merge time, the lead swaps the stub imports for your real ones. This means you can build, break, and rebuild anything inside `backend/app/db/`, `backend/app/models/`, `backend/app/connectors/`, `backend/app/geospatial/`, `backend/app/watchdog/`, and `backend/app/api/v1/route.py` / `oceanstate.py` / `watchdog.py` without ever touching a file Sridinesh or Akash owns.

---

## 0. Strategic Objectives & Core Scope

### 0.1 Your Core Objectives (Backend-B / Charan):
1. **Multi-Source Marine Ingestion**: Build clean, isolated connectors for INCOIS (PFZ & OSF), Copernicus CMEMS, NOAA ERDDAP, IMD Weather/Cyclone bulletins, and OBIS.
2. **PostGIS Spatial Foundation**: Set up Supabase PostgreSQL with PostGIS extension, creating indexed tables (`ocean_states`, `zones`, `hazards`, `vessels`, `query_logs`) and seeding Indian coastal IMBL / MPA boundary GeoJSONs.
3. **Geospatial Fusion & Common Marine State**: Fuse multi-sensor observations into unified Marine State records with provenance source maps and freshness tags.
4. **Collision-Free A\* Marine Pathfinder**: Implement custom A* grid routing avoiding restricted polygons (IMBL, MPAs) with wave-cost minimization.
5. **Proactive Watchdog Daemon**: Build an asynchronous background polling loop evaluating vessel drift, proximity to boundary lines, and active cyclone bulletins.
6. **Edge Sync Payload Engine**: Expose a compact (<1KB) `/api/v1/sync/payload` endpoint for mobile offline synchronization.
7. **Demo-Day Resilience**: Implement an airtight `USE_MOCK_CONNECTORS=true` toggle ensuring zero live network failure during hackathon judging.

---

## 0.2 Your Scope, Precisely

**You own these folders — nobody else writes to them:**
```
backend/app/db/
backend/app/models/
backend/app/connectors/
backend/app/geospatial/
backend/app/watchdog/
backend/app/schemas/route.py
backend/app/schemas/oceanstate.py
backend/app/api/v1/route.py
backend/app/api/v1/oceanstate.py
backend/app/api/v1/watchdog.py
backend/app/mock/mock_route_response.json
backend/app/mock/mock_oceanstate_response.json
backend/app/mock/mock_watchdog_alert.json
```

**You do NOT touch:** `backend/app/agents/`, `backend/app/reasoning/`, `backend/app/api/v1/query.py`, `backend/app/api/v1/evidence.py`, `backend/app/core/`, `backend/app/main.py`, anything under `mobile/`. If your work genuinely needs something from those folders, it means the API contract is incomplete — flag it to Sridinesh so the lead doc gets updated, rather than writing into his folders.

---

## 0.3 Git Branching & Workflow for Charan

- **Dedicated Branch Name**: `charan`
- **Base Branch**: `main`

### Branch Setup CLI Commands:
Run these commands in your terminal to start your track:
```bash
# 1. Ensure you are on the latest main baseline
git checkout main
git pull origin main

# 2. Create and switch to your dedicated branch
git checkout -b charan

# 3. Publish your branch to remote
git push -u origin charan
```

### Development & Commit Rules:
1. **Work Only on `charan`**: Never commit to `main`, `sridinesh`, or `akash`.
2. **Commit Daily**: Make small, clear conventional commits (e.g. `feat(connectors): implement incois osf client`).
3. **Push Daily**: Keep remote branch backed up (`git push origin charan`).
4. **Merge Readiness**: Before merge day, complete Phase 7 (unit tests + mock connector validation) and notify Sridinesh for merging `charan` → `main`.

---

## 1. Tech Stack You'll Use (subset of the locked stack)

| Layer | Choice |
|---|---|
| Database | Supabase PostgreSQL |
| Spatial DB | Supabase PostGIS extension |
| ORM | SQLAlchemy |
| Geospatial libs | GeoPandas + Shapely |
| Data processing | Pandas + Xarray |
| Routing | Custom Python A* (`heapq`) |
| Data sources | INCOIS (PFZ, OSF), Copernicus CMEMS, NOAA ERDDAP, IMD, OBIS/GBIF |
| Backend framework | FastAPI (routes only — you don't touch `main.py`) |
| Async daemon | Python `asyncio` |

All free-tier/open-source, per the project's hard constraint — no exceptions.

---

## 2. Database Schema — Full Detail (You Own Implementation)

The table shapes are frozen in the lead doc §3. Your job is to turn them into real SQLAlchemy models, Alembic-style (or raw SQL) migrations, and a PostGIS-enabled Supabase project. Reproduced here with implementation notes so you don't need to cross-reference:

- `ocean_states` — fused marine observation/forecast snapshots. `geom` is a PostGIS `geometry(Point, 4326)` generated from `lat`/`lon` (either a generated column or set on insert — your call, document whichever you pick).
- `zones` — polygons: IMBL, MPAs, restricted areas, PFZ candidate boundaries. `geom` is `geometry(Polygon, 4326)`.
- `hazards` — cyclone/high-wave/lightning events, optionally with a polygon.
- `vessels` — simulated demo vessel positions, used by the Watchdog and the Coast Guard demo view.
- `query_logs` — **you create this table and its repository, but you do not write to it.** Sridinesh's `/query` endpoint writes to it. You only need to make sure the table exists with the exact columns in the lead doc §3 so his `INSERT` works once merged.

**Do**: add a `GIST` spatial index on every `geom` column — containment/distance queries are the whole point of PostGIS and will be slow without it.
**Don't**: store geometries as plain lat/lon floats only — the `geom` column is what makes `ST_Contains`/`ST_Distance` fast and correct.

---

## Phase 1 — Database Foundation

**Task C1.1 — Create the Supabase project and enable PostGIS**
- Files/Folders: none (external setup), record connection string in `backend/.env.example`
- Depends on: `main` skeleton pushed (Sridinesh's S0.1)
- Done when: `CREATE EXTENSION IF NOT EXISTS postgis;` has been run successfully on the Supabase Postgres instance, and `SELECT postgis_version();` returns a version string when run via `psql` or Supabase's SQL editor.

**Task C1.2 — Set up SQLAlchemy session management**
- Files/Folders: `backend/app/db/session.py`
- Depends on: C1.1
- Done when: a standalone script calling `get_db()` opens and cleanly closes a connection to the Supabase instance.

**Task C1.3 — Define the `ocean_states` model**
- Files/Folders: `backend/app/models/ocean_state.py`
- Depends on: C1.2
- Done when: the model matches the schema in lead doc §3 exactly, including `geom` as a PostGIS geometry column (via `geoalchemy2`), and imports without error.

**Task C1.4 — Define the `zones` model**
- Files/Folders: `backend/app/models/zone.py`
- Depends on: C1.2
- Done when: model matches schema; `zone_type` uses a constrained set of string values validated at the application layer (CHECK constraint or enum).

**Task C1.5 — Define the `hazards` model**
- Files/Folders: `backend/app/models/hazard.py`
- Depends on: C1.2
- Done when: model matches schema, `geom` nullable, `severity` constrained to `low/moderate/high/critical`.

**Task C1.6 — Define the `vessels` model**
- Files/Folders: `backend/app/models/vessel.py`
- Depends on: C1.2
- Done when: model matches schema; simple, no geometry column needed (lat/lon floats are fine here since this is a lightweight demo simulation table, not spatially queried at scale).

**Task C1.7 — Define the `query_logs` model (table only — Sridinesh owns writes)**
- Files/Folders: `backend/app/models/query_log.py`
- Depends on: C1.2
- Done when: model matches schema in lead doc §3 exactly (field names must match precisely since Sridinesh's endpoint will `INSERT` into it at merge time).

**Task C1.8 — Write and run all migrations**
- Files/Folders: `backend/app/db/migrations/`
- Depends on: C1.3–C1.7
- Done when: connecting to Supabase directly (table editor or `psql`) shows all five tables with correct columns, types, constraints, and `GIST` indexes on every `geom` column.

**Task C1.9 — Seed IMBL and demo MPA/restricted-zone polygons**
- Files/Folders: `backend/app/db/seed_zones.py`, `backend/app/db/data/imbl_boundary.geojson`, `backend/app/db/data/demo_mpas.geojson`
- Depends on: C1.8
- Done when: running the seed script inserts the IMBL boundary (sourced from a publicly available surveyed coordinate set) and at least 2–3 demo MPA/restricted polygons near the chosen demo region (e.g. Tamil Nadu/Andhra coast) into `zones`, and re-running the script doesn't create duplicates (upsert on a stable key like `name`).

**Task C1.10 — Build the `ocean_state_repository`**
- Files/Folders: `backend/app/db/repositories/ocean_state_repository.py`
- Depends on: C1.8
- Done when: functions `insert_ocean_state(state: dict)`, `get_nearest(lat, lon, time) -> OceanState | None`, and `get_within_bbox(bbox) -> list[OceanState]` all run correctly against the DB using PostGIS `ST_Distance`/`ST_DWithin`.

**Task C1.11 — Build the `zone_repository`**
- Files/Folders: `backend/app/db/repositories/zone_repository.py`
- Depends on: C1.8, C1.9
- Done when: `get_zones_containing(lat, lon) -> list[Zone]` correctly returns the IMBL/MPA/restricted zone(s) a point falls inside, using `ST_Contains`, tested against a known point inside a seeded polygon and a known point outside.

**Task C1.12 — Build the `hazard_repository`**
- Files/Folders: `backend/app/db/repositories/hazard_repository.py`
- Depends on: C1.8
- Done when: `get_active_hazards_for_cell(lat, lon, time) -> list[Hazard]` returns correct results for a manually inserted test hazard record.

---

## Phase 2 — Data Connectors (Provider Adapters)

Each connector is a thin, isolated module implementing a common interface so any one source can be swapped or mocked without touching the others. Validate each source's actual access method (public API, WMS layer, scrape, bulk download) before committing to an implementation — do this validation first, it's the single biggest risk in this phase.

**Task C2.1 — Define the base connector interface**
- Files/Folders: `backend/app/connectors/base.py`
- Depends on: nothing (can start immediately, in parallel with Phase 1)
- Done when: an abstract base class/protocol `DataConnector` exists with a method `fetch(lat, lon, time_window) -> dict`, and every connector below implements it, so the fusion layer (Phase 3) can call any connector identically.

**Task C2.2 — Validate and document each source's real access method**
- Files/Folders: `docs/DATA_SOURCES.md`
- Depends on: nothing
- Done when: for each of INCOIS PFZ, INCOIS OSF, Copernicus CMEMS, NOAA ERDDAP, IMD bulletins, and OBIS, this doc states: the concrete access method (REST API / WMS / GeoJSON download / scrape), auth requirements (should be none/free-tier), rate limits if any, and update cadence. **Do this before writing connector code** — it prevents building against an access pattern that doesn't actually exist.

**Task C2.3 — Build the INCOIS PFZ connector**
- Files/Folders: `backend/app/connectors/incois_pfz.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns real PFZ candidate polygons/points near the given location for at least one successfully tested real query, with fields normalized to match what the fusion layer expects (§3, Phase 3 below).

**Task C2.4 — Build the INCOIS OSF (Ocean State Forecast) connector**
- Files/Folders: `backend/app/connectors/incois_osf.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns wave height, wind speed, and swell data for a real test coordinate, with units normalized (m, kt).

**Task C2.5 — Build the Copernicus CMEMS connector**
- Files/Folders: `backend/app/connectors/copernicus.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns SST and (if available) current vector data for a real test coordinate using `copernicusmarine`'s subset API, normalized to °C and m/s.

**Task C2.6 — Build the NOAA ERDDAP connector**
- Files/Folders: `backend/app/connectors/noaa_erddap.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns at least one useful parameter (e.g. chlorophyll-a as a fallback/cross-check against Copernicus) via `erddapy`'s tabledap query, for a real test coordinate.

**Task C2.7 — Build the IMD bulletin connector**
- Files/Folders: `backend/app/connectors/imd_bulletin.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns any currently active cyclone/high-wave/lightning bulletins covering the given cell, normalized into the `hazards` shape (type, severity, valid window), and returns an empty list (not an error) when nothing is active.

**Task C2.8 — Build the OBIS/GBIF connector**
- Files/Folders: `backend/app/connectors/obis.py`
- Depends on: C2.1, C2.2
- Done when: `fetch(lat, lon, time_window)` returns a species-density or occurrence-count value near the given location via `pyobis`, for use as PFZ suitability context.

**Task C2.9 — Add per-connector caching and graceful failure**
- Files/Folders: `backend/app/connectors/base.py`, each connector file
- Depends on: C2.3–C2.8
- Done when: every connector, on a failed/timed-out request, returns `None` (never raises past its own boundary) and logs the failure; a simple in-memory or Redis-free file-based cache (per the free-tools constraint, this can just be a short-TTL dict or SQLite cache) avoids redundant calls for the same `(lat, lon, time_window)` within a demo session.

**Task C2.10 — Build a mock/demo dataset fallback toggle**
- Files/Folders: `backend/app/connectors/base.py`, `backend/app/connectors/mock_fallback.py`
- Depends on: C2.9
- Done when: setting `USE_MOCK_CONNECTORS=true` in `.env` makes every connector return realistic static values instead of hitting live APIs — this is your demo-day insurance policy per the PRD's risk mitigation (§33: "Unstable/undocumented data access").

---

## Phase 3 — Geospatial Fusion & Common Marine State

**Task C3.1 — Build the fusion function that assembles `OceanState`**
- Files/Folders: `backend/app/geospatial/fusion.py`
- Depends on: C2.3–C2.8, C1.3
- Done when: `fuse(lat, lon, time_window) -> dict` calls every relevant connector, normalizes units/timestamps to a common hourly grid, and returns a dict matching the `ocean_states` table shape exactly, including a populated `source_map` for evidence provenance.

**Task C3.2 — Persist fused states**
- Files/Folders: `backend/app/geospatial/fusion.py`, uses `ocean_state_repository`
- Depends on: C3.1, C1.10
- Done when: calling `fuse()` for a real coordinate results in a new row appearing in `ocean_states` with correct values, verified by querying Supabase directly after the call.

**Task C3.3 — Implement `GET /api/v1/oceanstate`**
- Files/Folders: `backend/app/api/v1/oceanstate.py`, `backend/app/schemas/oceanstate.py`
- Depends on: C3.2
- Done when: `GET /api/v1/oceanstate?lat=..&lon=..&time=..` returns a response matching the lead doc §4.4 shape exactly (diffed against `backend/app/mock/mock_oceanstate_response.json`), falling back to `fuse()` on cache miss and to `ocean_state_repository.get_nearest()` on cache hit.

**Task C3.4 — Implement geofence checking**
- Files/Folders: `backend/app/geospatial/geofence.py`
- Depends on: C1.11
- Done when: `check_point(lat, lon) -> list[dict]` returns every zone (IMBL/MPA/restricted) a point falls inside via `zone_repository.get_zones_containing`, each with `zone_type`, `name`, and a computed `distance_to_boundary_nm` (using Shapely) even when the point is outside every zone (useful for "1.2nm clear of IMBL" style evidence).

**Task C3.5 — Implement route-vs-geofence intersection checking**
- Files/Folders: `backend/app/geospatial/geofence.py`
- Depends on: C3.4
- Done when: `check_route(points: list[tuple]) -> bool` returns `True` if any segment of a route polyline intersects a restricted polygon, using Shapely's line/polygon intersection — used both by the A* router (Phase 4) and directly for route-validation queries.

---

## Phase 4 — A* Marine Pathfinder

**Task C4.1 — Build the cost grid for the demo region**
- Files/Folders: `backend/app/geospatial/cost_grid.py`
- Depends on: C1.9
- Done when: `build_cost_grid(bbox, resolution_deg=0.1) -> CostGrid` produces a grid over the chosen demo coastal region (e.g. Tamil Nadu/Andhra coast), each cell tagged `navigable`/`land`/`restricted` based on the seeded zone polygons and a coastline dataset, and the grid is precomputed/cached to disk so it doesn't rebuild on every request.

**Task C4.2 — Implement the A* algorithm**
- Files/Folders: `backend/app/geospatial/astar.py`
- Depends on: C4.1
- Done when: `astar_route(start, goal, cost_grid, geofences) -> list[tuple] | None` implements the algorithm from the TRD §B.2.6 (haversine heuristic, 8-connected neighbors, infinite cost for geofenced cells), returns a valid path for a real start/goal pair in the demo region, and returns `None` (never crashes) when no safe route exists.

**Task C4.3 — Add the cost function (wave height, geofence penalty, fuel factor)**
- Files/Folders: `backend/app/geospatial/astar.py`
- Depends on: C4.2, C3.2
- Done when: `edge_cost(current, neighbor, cost_grid, ocean_states)` incorporates real or cached wave-height data from `ocean_states` into the cost, so the router prefers calmer-water cells over a purely shortest-path route, verified by comparing two routes where one crosses a high-wave cell and confirming the router avoids it when a lower-cost alternative exists.

**Task C4.4 — Implement corridor refinement for demo latency**
- Files/Folders: `backend/app/geospatial/astar.py`
- Depends on: C4.2
- Done when: the pathfinder runs at coarse resolution (0.25°) by default and only refines to finer resolution (0.05°) along the corridor between start and goal, keeping response time low — measured and documented (target: comfortably interactive, well under a few seconds for the demo region).

**Task C4.5 — Implement `POST /api/v1/route`**
- Files/Folders: `backend/app/api/v1/route.py`, `backend/app/schemas/route.py`
- Depends on: C4.3, C4.4
- Done when: `POST /api/v1/route` with the exact request body from lead doc §4.3 returns a response matching §4.3's shape exactly (diffed against `mock_route_response.json`), including `distance_nm` and `avoided_zones`.

**Task C4.6 — Build the "naive vs ORCA route" comparison helper**
- Files/Folders: `backend/app/geospatial/astar.py`
- Depends on: C4.5
- Done when: a helper function `straight_line_route(start, goal) -> list[tuple]` exists alongside the A* route, so the frontend/demo can show both a naive straight-line route crossing the IMBL and ORCA's actual bent route side-by-side, per the PRD demo script (§22-C) and TRD demo script (§B.8, step 4).

---

## Phase 5 — Proactive Watchdog Daemon

**Task C5.1 — Build the vessel state simulator**
- Files/Folders: `backend/app/watchdog/vessel_sim.py`
- Depends on: C1.6
- Done when: a function/script can update a `vessels` row's `lat`/`lon` on a timer to simulate GPS drift toward the IMBL, for demo purposes — this replaces real hardware GPS per the PRD's non-goals.

**Task C5.2 — Implement the watchdog trigger logic**
- Files/Folders: `backend/app/watchdog/daemon.py`
- Depends on: C3.4, C1.12, C1.6
- Done when: `watchdog_tick(vessel_state, feeds) -> Alert | None` implements the exact logic from the TRD §B.2.8 (high-wave alert covering the vessel's cell → `HIGH_WAVE`; IMBL proximity under a configured safe margin → `IMBL_PROXIMITY`; active cyclone bulletin covering the cell → `CYCLONE`), verified with unit tests for all three trigger conditions plus a no-trigger case.

**Task C5.3 — Build the async polling loop**
- Files/Folders: `backend/app/watchdog/daemon.py`
- Depends on: C5.2
- Done when: an `asyncio` loop runs `watchdog_tick` on an interval for every subscribed vessel, independent of any user HTTP request/session, and can be started/stopped cleanly (e.g. via a FastAPI startup/shutdown event or a standalone process).

**Task C5.4 — Add alert de-duplication / cooldown**
- Files/Folders: `backend/app/watchdog/daemon.py`
- Depends on: C5.3
- Done when: the same hazard for the same vessel does not re-trigger a new alert within a configurable cooldown window (e.g. 10 minutes), verified by calling `watchdog_tick` twice in quick succession for the same condition and confirming only one alert is emitted.

**Task C5.5 — Implement `POST /api/v1/watchdog/subscribe`**
- Files/Folders: `backend/app/api/v1/watchdog.py`
- Depends on: C5.3
- Done when: `POST /api/v1/watchdog/subscribe` with a `vessel_id` (or a new demo vessel definition) registers it for polling, and the endpoint returns a confirmation payload; this is intentionally simple since there's no auth/session model for MVP.

**Task C5.6 — Build the alert delivery stub (payload only — actual push is Akash's)**
- Files/Folders: `backend/app/watchdog/daemon.py`, `backend/app/mock/mock_watchdog_alert.json`
- Depends on: C5.4
- Done when: every triggered alert is written out in the exact JSON shape in `mock_watchdog_alert.json` (fields: `alert_type`, `severity`, `vessel_id`, `message`, `triggered_at`), whether delivered via a simple polling endpoint or a lightweight webhook — the actual push-notification integration on the client is entirely Akash's responsibility and out of your scope.

---

## Phase 6 — Edge Sync Payload (Supports Offline Mode on Mobile)

**Task C6.1 — Implement the compact sync payload generator**
- Files/Folders: `backend/app/api/v1/oceanstate.py` (add a sub-route), `backend/app/geospatial/fusion.py`
- Depends on: C3.2
- Done when: `GET /api/v1/sync/payload?cell={lat},{lon}` returns the exact compact schema from the TRD §B.2.7 (`v`, `t`, `cell`, `wave_m`, `wind_kt`, `sst_c`, `chl`, `hz`, `imbl_nm`), serialized to well under 1KB, ready for Akash's app to fetch and cache locally for offline use.

**Task C6.2 — Document the payload's freshness contract**
- Files/Folders: `docs/API_CONTRACT.md`
- Depends on: C6.1
- Done when: the doc states clearly what `t` means (last-computed/fused timestamp) so Akash's offline banner can display "using data synced at HH:MM" accurately without needing to look at your code.

---

## Phase 7 — Testing & Integration Readiness

**Task C7.1 — Unit-test all geospatial functions against known cases**
- Files/Folders: `backend/tests/test_geospatial.py`
- Depends on: C3.4, C3.5, C4.2
- Done when: tests cover at least: a point known to be inside a seeded MPA, a point known to be outside every zone, a route known to cross the IMBL (blocked), and a route known to be clear (allowed) — all passing.

**Task C7.2 — Unit-test the watchdog trigger conditions**
- Files/Folders: `backend/tests/test_watchdog.py`
- Depends on: C5.2
- Done when: all four cases from C5.2's Done-when are covered by automated tests, all passing.

**Task C7.3 — Verify every connector against the mock-fallback toggle**
- Files/Folders: `backend/tests/test_connectors.py`
- Depends on: C2.10
- Done when: setting `USE_MOCK_CONNECTORS=true` and running the full fusion pipeline (C3.1) produces a complete, valid `OceanState` even with zero network access — this is your rehearsed fallback for demo day per PRD §33.

**Task C7.4 — Document your exact function signatures for Sridinesh's merge**
- Files/Folders: `docs/API_CONTRACT.md`
- Depends on: C3.1, C3.4, C4.2
- Done when: the doc lists the final signatures of `fuse()`, `geofence.check_point()`, and `astar_route()` — the three functions Sridinesh's `_stubs.py` was written to match — so the merge-day swap (lead doc §6.3) is a clean one-line import change per stub, not a rewrite.

---

## Do's and Don'ts — Charan-Specific

**Do**
- Validate real data source access (Task C2.2) before writing a single connector — this is the highest-risk part of the whole project; an undocumented/rate-limited/paywalled source discovered late is the most common way a marine-data hackathon project fails.
- Build the mock-fallback toggle (C2.10) early, not as an afterthought — it's your demo insurance.
- Keep every connector isolated behind the same interface (C2.1) so a broken/slow source never takes down the others.
- Add spatial indexes on every PostGIS geometry column.
- Return `None`/empty lists on failure inside connectors — never let one bad API call propagate an unhandled exception up into the fusion layer.

**Don't**
- Don't let the A* router ever return a route that crosses a hard geofence (IMBL, MPA, restricted zone) — this is a correctness requirement from the PRD's acceptance criteria (§32), not a nice-to-have.
- Don't write to `query_logs` yourself — that's Sridinesh's endpoint's job; you only own the table's existence.
- Don't touch `backend/app/agents/` or `backend/app/reasoning/` — if you think you need something from there, it's a contract gap, flag it instead of reaching across.
- Don't skip the freshness/staleness labeling on cached or mock data — anywhere your data flows into a response, it must be honestly labeled per the PRD's trust requirements (§16, §17).
- Don't hardcode Supabase credentials — `.env` only.
