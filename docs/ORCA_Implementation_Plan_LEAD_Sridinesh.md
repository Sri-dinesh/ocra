# ORCA — Project Implementation Plan (Single Source of Truth)
## Lead Document — Sridinesh (Backend: Agent Orchestration, Reasoning, Risk Engine)

**SIH26176 | Team: Sridinesh (Lead + Backend-A), Charan (Backend-B), Akash (Frontend)**

This is the authoritative document for ORCA's architecture and build plan. It contains everything shared across the whole team — locked tech stack, folder structure, database schema, the API contract every member codes against, and the Git workflow — plus Sridinesh's own task list. Charan and Akash each have their own implementation-plan doc that only contains their tasks; they should never need to open each other's docs to get their work done, because everything they depend on (schemas, endpoints, mock data shape) is fixed here, up front, before anyone branches.

If anything in a member's doc conflicts with this doc, **this doc wins**. Any change to the shared contract (API shape, DB schema, folder structure) must be made here first, then reflected in the other two docs, before any member codes against the new shape.

---

## 0. How This Plan Is Split

| Doc | Owner | Scope |
|---|---|---|
| **This doc** | Sridinesh (Lead) | Shared contract (stack, folders, schema, API, branching) + Sridinesh's tasks: FastAPI skeleton, LangGraph orchestration, Planner Agent, Deterministic Guardrail, Risk/Recommendation Engine, Synthesis Agent, `/query` and `/evidence` endpoints |
| `ORCA_Implementation_Plan_Charan.md` | Charan (Backend-B) | Data connectors (INCOIS/Copernicus/NOAA/IMD/OBIS), Supabase Postgres+PostGIS schema and repositories, A* marine pathfinder, geofencing, Proactive Watchdog daemon, `/route`, `/oceanstate`, `/watchdog/*` endpoints |
| `ORCA_Implementation_Plan_Akash.md` | Akash (Frontend) | Entire Expo React Native app — chat UI, map (Leaflet+WebView), voice I/O, evidence trace UI, offline banner, alerts UI, Zustand stores — built entirely against **mocked** API responses defined in this doc, zero dependency on backend being live |

**The golden rule: nobody's task 2 depends on anyone else's task 1 being finished.** Every task in every doc either (a) only touches files inside that member's own folder, or (b) reads a fixed contract (a JSON schema, an endpoint signature, a table definition) that is frozen in this document before branching starts. Contracts don't move mid-build. If a contract must change, that's a lead-doc edit + a message to the team, not a silent drift.

---

## 0.1 Strategic Objectives & Key Deliverables

### Lead Track Core Objectives (Sridinesh):
1. **Agent Planning & Disambiguation (Zero Hallucination)**: Construct a Gemini-powered Planner Agent using strict tool calling to extract marine entities (`location`, `time_window`, `intent`) and request clarifications whenever essential parameters are missing.
2. **Deterministic Safety Guardrails**: Build an uncompromising verification gate that matches every numerical claim against raw sensor feeds, enforcing hard overrides for official IMD cyclones and severe alerts.
3. **Transparent Risk Engine**: Implement the TRD weighted composite formula (0–100) mapping to 4 risk bands (`low`, `moderate`, `high`, `extreme`) with explicit provenance footnotes.
4. **Grounded Multilingual Synthesis**: Synthesize natural language and Indian regional language responses (Tamil, Hindi, Telugu, English) strictly grounded on verified evidence.
5. **System Integration & Verification**: Validate the end-to-end pipeline against an evaluation set of 20+ real-world marine queries.

---

---

## 1. Tech Stack (Locked)

**Hard constraint: every tool must be free — either fully open-source/self-hostable, or a genuinely usable free tier (Supabase, Render, Vercel, Gemini API free tier, Bhashini, Expo). No paid upgrade required to build or demo the full system.**

| Layer | Choice | Notes |
|---|---|---|
| Mobile frontend | **Expo (React Native) + TypeScript** | Single codebase, runs on Android/iOS, no native build tooling needed for demo |
| Frontend state | **Zustand** | All client state — chat history, query results, offline cache pointers, voice state |
| Maps (mobile) | **Leaflet inside a WebView** | Leaflet is free/open-source; avoids Google Maps billing. WebView bridges JS↔RN via `postMessage` |
| Backend API | **Python + FastAPI** | Single backend service, async-first |
| AI orchestration | **LangGraph** | Stateful multi-agent graph: Planner → domain agents (parallel) → Guardrail → Synthesis |
| AI framework | **LangChain** | Tool-calling wrappers around data connectors, prompt templates |
| Cloud LLM | **Gemini API** (free tier) | Planning, entity extraction, synthesis — never used for raw numeric claims (see Guardrail, §Sridinesh doc) |
| Database | **Supabase PostgreSQL** | Managed Postgres, free tier |
| Spatial DB | **Supabase PostGIS** | Extension enabled on the same Supabase project — geofence polygons, PFZ candidates, distance/containment queries |
| Storage | **Supabase Storage** | Cached snapshots, mock payloads, any exported evidence/report files |
| Routing | **Python A\*** (custom, `heapq`-based) | Cost-grid pathfinder over the demo region, avoids geofenced polygons |
| Geospatial libs | **GeoPandas + Shapely** | Polygon containment, distance, geometry ops |
| Data processing | **Pandas + Xarray** | Tabular + gridded (NetCDF) data normalization, temporal alignment |
| Voice | **Speech-to-Text + TTS** — Bhashini API primary, self-hosted Whisper (STT) + Piper/Coqui (TTS) as fallback | Both are free; Bhashini is a Government of India free API |
| Notifications | **Expo Notifications** | Push delivery for Watchdog alerts |
| Offline cache | **Expo SQLite** | On-device store for last-synced Marine State payload, used when the app has no connectivity |
| Optional offline AI | **Ollama + small quantized model** (e.g. Phi-3-Mini Q4) | Stretch goal — only if time allows after Tier-1 features are solid; not required for MVP demo |
| External data sources | **INCOIS (PFZ, OSF) + Copernicus CMEMS + NOAA ERDDAP + IMD + OBIS/GBIF** | All free/public marine data APIs; see Charan's doc for adapter-by-adapter detail |
| Backend hosting | **Render** (free tier) | FastAPI service deployment |
| Web hosting (optional) | **Vercel** | Only if a web dashboard view is added later; not required for MVP |
| Authentication | **None** | No login for MVP — role is selected client-side (fisherman/researcher/coast guard/policymaker), not enforced server-side. This removes an entire dependency chain from the build. |
| Version control | **Git + GitHub** | One branch per member, see §5 |

---

## 2. Folder Structure (Pushed to `main` by Sridinesh Before Branching)

This exact structure is pushed to `main` first, as an empty/skeleton scaffold (folders + placeholder files + configs), **before** any member creates their branch. This is what makes independent work possible: everyone branches from the same starting point and already knows exactly where their files go.

```
orca/
├── README.md
├── .gitignore
├── docs/
│   ├── ORCA_Implementation_Plan_LEAD_Sridinesh.md
│   ├── ORCA_Implementation_Plan_Charan.md
│   ├── ORCA_Implementation_Plan_Akash.md
│   ├── API_CONTRACT.md              # generated copy of §4 below, kept in sync
│   └── DEMO_SCRIPT.md               # written near the end, by Sridinesh
│
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI app entrypoint — SRIDINESH
│   │   ├── core/
│   │   │   ├── config.py                    # env/settings — SRIDINESH
│   │   │   └── logging.py                   # structured logging — SRIDINESH
│   │   ├── db/
│   │   │   ├── session.py                   # Supabase/Postgres connection — CHARAN
│   │   │   └── migrations/                  # SQL migration files — CHARAN
│   │   ├── models/                          # SQLAlchemy models — CHARAN
│   │   │   ├── ocean_state.py
│   │   │   ├── zone.py
│   │   │   ├── vessel.py
│   │   │   ├── hazard.py
│   │   │   └── query_log.py
│   │   ├── schemas/                         # Pydantic request/response schemas
│   │   │   ├── query.py                     # SRIDINESH (query/response/evidence)
│   │   │   ├── route.py                     # CHARAN (route request/response)
│   │   │   └── oceanstate.py                # CHARAN (oceanstate response)
│   │   ├── agents/                          # LangGraph agents — SRIDINESH
│   │   │   ├── graph.py                     # LangGraph state graph wiring
│   │   │   ├── planner_agent.py
│   │   │   ├── synthesis_agent.py
│   │   │   └── state.py                     # shared agent state (TypedDict)
│   │   ├── reasoning/                       # SRIDINESH
│   │   │   ├── guardrail.py                 # deterministic anti-hallucination checks
│   │   │   ├── risk_engine.py               # navigation_risk_score, sail-clearance logic
│   │   │   └── evidence.py                  # evidence-trace object builder
│   │   ├── connectors/                      # CHARAN — one adapter file per data source
│   │   │   ├── base.py
│   │   │   ├── incois_pfz.py
│   │   │   ├── incois_osf.py
│   │   │   ├── copernicus.py
│   │   │   ├── noaa_erddap.py
│   │   │   ├── imd_bulletin.py
│   │   │   └── obis.py
│   │   ├── geospatial/                      # CHARAN
│   │   │   ├── fusion.py                    # builds common MarineState from connector outputs
│   │   │   ├── geofence.py                  # polygon containment (IMBL, MPA, restricted zones)
│   │   │   ├── astar.py                     # A* pathfinder over cost grid
│   │   │   └── cost_grid.py                 # cost-grid construction/precompute
│   │   ├── watchdog/                        # CHARAN
│   │   │   └── daemon.py                    # async polling + alert trigger logic
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── query.py                 # SRIDINESH — POST /api/v1/query
│   │   │       ├── evidence.py              # SRIDINESH — GET /api/v1/evidence/{id}
│   │   │       ├── route.py                 # CHARAN — POST /api/v1/route
│   │   │       ├── oceanstate.py            # CHARAN — GET /api/v1/oceanstate
│   │   │       └── watchdog.py              # CHARAN — POST /api/v1/watchdog/subscribe
│   │   └── mock/                            # SHARED — static mock JSON, see §4.5
│   │       ├── mock_query_response.json
│   │       ├── mock_route_response.json
│   │       ├── mock_oceanstate_response.json
│   │       └── mock_watchdog_alert.json
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── mobile/                                   # AKASH — entire Expo app
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.tsx                    # Chat/Home screen
    │   │   ├── map.tsx                      # Map screen
    │   │   ├── alerts.tsx                   # Watchdog alerts screen
    │   │   └── profile.tsx                  # Role selector + settings
    │   ├── evidence/[queryId].tsx           # Evidence trace detail screen
    │   └── _layout.tsx
    ├── src/
    │   ├── components/
    │   │   ├── chat/
    │   │   │   ├── ChatBubble.tsx
    │   │   │   ├── PushToTalkButton.tsx
    │   │   │   └── EvidenceCard.tsx
    │   │   ├── map/
    │   │   │   ├── LeafletMapView.tsx       # WebView wrapper
    │   │   │   └── leaflet.html             # Leaflet HTML/JS bundled as WebView source
    │   │   └── common/
    │   │       ├── OfflineBanner.tsx
    │   │       └── RiskBadge.tsx
    │   ├── store/
    │   │   ├── chatStore.ts                 # Zustand
    │   │   ├── mapStore.ts
    │   │   ├── alertStore.ts
    │   │   └── settingsStore.ts
    │   ├── api/
    │   │   ├── client.ts                    # axios instance, base URL from env
    │   │   ├── queryApi.ts
    │   │   ├── routeApi.ts
    │   │   ├── oceanstateApi.ts
    │   │   └── mock/                        # local copies of the same mock JSON, see §4.5
    │   ├── offline/
    │   │   └── sqliteCache.ts               # Expo SQLite read/write for last-synced payload
    │   ├── voice/
    │   │   ├── stt.ts
    │   │   └── tts.ts
    │   └── types/
    │       └── contract.ts                  # TypeScript types mirroring §4 schemas exactly
    ├── app.json
    ├── package.json
    └── .env.example
```

**Do's**
- Push this exact skeleton (every folder, with a `.gitkeep` or placeholder file where empty) to `main` before anyone branches.
- Keep `docs/API_CONTRACT.md` as a plain copy-paste of §4 of this doc — it's the one file both Charan and Akash should check if they're unsure of a field name.

**Don'ts**
- Don't let anyone create a folder outside this structure without updating this doc first — new folders that only one person knows about are how merge conflicts and confusion happen.
- Don't put backend and mobile dependencies in the same `package.json`/`requirements.txt` — they stay fully separate.

---

## 3. Database Schema (Supabase PostgreSQL + PostGIS)

Owned and implemented by **Charan** (full detail in his doc), documented here so Sridinesh's reasoning/query code and Akash's type definitions can be written against it without waiting for Charan to finish.

### `ocean_states`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `lat` | float8 | |
| `lon` | float8 | |
| `geom` | geometry(Point, 4326) | PostGIS point, generated from lat/lon |
| `valid_time` | timestamptz | when the observation/forecast applies |
| `fetched_at` | timestamptz | when ORCA retrieved it |
| `sst_c` | float8, nullable | |
| `chl_a_mgm3` | float8, nullable | |
| `wave_height_m` | float8, nullable | |
| `wind_speed_kt` | float8, nullable | |
| `current_speed_ms` | float8, nullable | |
| `current_dir_deg` | float8, nullable | |
| `source_map` | jsonb | `{field: source_dataset_id}` — evidence provenance |
| `quality` | text | `good` / `stale` / `partial` |

### `zones`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text | e.g. "IMBL", "Gulf of Mannar MPA" |
| `zone_type` | text | `imbl` / `mpa` / `restricted` / `pfz` |
| `geom` | geometry(Polygon, 4326) | |
| `source` | text | attribution |
| `active` | boolean | |

### `hazards`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `hazard_type` | text | `cyclone` / `high_wave` / `lightning` |
| `severity` | text | `low`/`moderate`/`high`/`critical` |
| `geom` | geometry(Polygon, 4326), nullable | affected area, if published as a polygon |
| `valid_from` | timestamptz | |
| `valid_until` | timestamptz, nullable | |
| `source` | text | e.g. "IMD" |
| `raw_bulletin_ref` | text, nullable | link/id to source bulletin |

### `vessels` (demo/simulated)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `label` | text | demo vessel name |
| `lat` | float8 | |
| `lon` | float8 | |
| `updated_at` | timestamptz | |

### `query_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | this is the `query_id` used in `GET /api/v1/evidence/{query_id}` |
| `raw_query` | text | |
| `detected_language` | text | |
| `intent` | text | |
| `plan_json` | jsonb | Planner Agent output |
| `evidence_json` | jsonb | full evidence trace, see §4.2 |
| `role` | text | `fisherman`/`researcher`/`coast_guard`/`policymaker` |
| `created_at` | timestamptz | |

Full DDL, indexes, and PostGIS-specific setup (`CREATE EXTENSION postgis;`, spatial indexes via `GIST`) are Charan's responsibility — see his doc, Phase 2.

---

## 4. API Contract (Frozen Before Branching)

This is the single most important section in this document. **Every endpoint's request/response shape is fixed here.** Sridinesh and Charan implement the real versions; Akash builds against static mock files with this exact shape (§4.5) and never has to wait for a live backend.

### 4.1 `POST /api/v1/query` — owned by Sridinesh

Main conversational entrypoint. Text in (already transcribed if it came from voice), structured recommendation + evidence out.

**Request**
```json
{
  "text": "Can I go fishing tomorrow morning near Kakinada?",
  "location_hint": { "lat": 16.9891, "lon": 82.2475, "name": "Kakinada" },
  "role": "fisherman",
  "language": "en-IN"
}
```

**Response**
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

### 4.2 `GET /api/v1/evidence/{query_id}` — owned by Sridinesh

Retrieves the full stored evidence trace for a prior query (audit view).

**Response**
```json
{
  "query_id": "f3a1c2e0-...",
  "raw_query": "Can I go fishing tomorrow morning near Kakinada?",
  "plan": { "intent": "sail_clearance", "location": {"lat": 16.9891, "lon": 82.2475}, "required_agents": ["ocean", "weather", "gis"] },
  "evidence": [ "... same shape as 4.1 evidence array ..." ],
  "created_at": "2026-08-28T22:11:03+05:30"
}
```

### 4.3 `POST /api/v1/route` — owned by Charan

**Request**
```json
{ "start": {"lat": 16.9891, "lon": 82.2475}, "goal": {"lat": 17.15, "lon": 82.45}, "boat_class": "small" }
```

**Response**
```json
{
  "route": [ {"lat": 16.9891, "lon": 82.2475}, {"lat": 17.02, "lon": 82.31}, {"lat": 17.15, "lon": 82.45} ],
  "distance_nm": 14.2,
  "avoided_zones": ["imbl_segment_04"],
  "pathfinder": "astar"
}
```

### 4.4 `GET /api/v1/oceanstate?lat={lat}&lon={lon}&time={iso8601}` — owned by Charan

**Response**
```json
{
  "lat": 16.9891, "lon": 82.2475, "valid_time": "2026-08-29T06:00:00+05:30",
  "sst_c": 28.2, "chl_a_mgm3": 1.4, "wave_height_m": 1.8, "wind_speed_kt": 14,
  "source_map": { "sst_c": "Copernicus CMEMS", "wave_height_m": "INCOIS OSF" },
  "quality": "good"
}
```

### 4.5 Mock Data — Independence Mechanism

Both `backend/app/mock/*.json` and `mobile/src/api/mock/*.json` hold **identical** copies of the example responses in §4.1–4.4. This is deliberate duplication, not a shared import, because:

- Akash's app must run and demo fully even if the backend repo doesn't build.
- Sridinesh and Charan build their real endpoints to return exactly this shape, verified by a diff against the same mock file.

Akash's `mobile/src/api/client.ts` reads an env flag `USE_MOCK=true/false`. With it `true` (the default until backend endpoints are live), every API call resolves from the local mock JSON with a small artificial delay, so the UI, loading states, and error states can all be built and demoed independently. See Akash's doc for full detail.

**Do**: keep the mock JSON and the real response shape byte-identical in field names and types.
**Don't**: let mock and real drift — if a field is renamed on the backend, update both mock files and `contract.ts` in the same PR-equivalent commit.

---

---

## 5. Git Workflow, Branching & Step-by-Step Merge Protocol

### 5.1 Branch Matrix & Ownership

| Member | Role | Branch Name | Base Branch | Write Access Scope |
|---|---|---|---|---|
| **Sridinesh (Lead)** | Agent Orchestration, Reasoning, Risk Engine, `/query`, `/evidence` | `sridinesh` | `main` | `backend/app/agents/`, `backend/app/reasoning/`, `backend/app/api/v1/query.py`, `evidence.py`, `backend/app/core/`, `backend/app/main.py` |
| **Charan** | Data Connectors, Supabase PostGIS, A* Pathfinder, Geofence, Watchdog Daemon, `/route`, `/oceanstate` | `charan` | `main` | `backend/app/db/`, `backend/app/models/`, `backend/app/connectors/`, `backend/app/geospatial/`, `backend/app/watchdog/`, `backend/app/api/v1/route.py`, `oceanstate.py`, `watchdog.py` |
| **Akash** | Mobile App (Expo React Native, Leaflet WebView, Zustand, Voice, Offline Cache) | `akash` | `main` | `mobile/` (entire mobile tree) |

---

### 5.2 Branch Creation CLI Commands (For All Members)

Every member runs these exact commands once from their local clone:

```bash
# 1. Fetch latest baseline from main
git checkout main
git pull origin main

# 2. Create and switch to your designated branch
# For Sridinesh (Lead):
git checkout -b sridinesh

# For Charan (Backend-B):
git checkout -b charan

# For Akash (Frontend):
git checkout -b akash

# 3. Publish branch to remote GitHub repository
git push -u origin <your_branch_name>
```

---

### 5.3 Daily Development Rules
1. **Isolated Commits**: Always commit to your own branch only. Never push directly to `main` during active development.
2. **Conventional Commit Messages**: Write descriptive commit messages (e.g. `feat(agents): implement planner tool calling`, `feat(connectors): add INCOIS OSF fetcher`).
3. **Daily Push**: Run `git push origin <your_branch_name>` at the end of each session so the Lead can track progress.
4. **No Cross-Branch Interference**: Never switch to or edit another member's branch.

---

### 5.4 Lead Step-by-Step Merge Protocol (How to Merge at Hackathon Milestone)

As Lead, Sridinesh coordinates the final merge sequence into `main` using the following exact steps:

#### Step 1: Pre-Merge Verification
Before merging anything into `main`, verify that all three branches have passed their respective local tests:
- On `charan`: All connector tests pass (`USE_MOCK_CONNECTORS=true` works, PostGIS models match schema).
- On `akash`: `npx expo start` and `npm run typecheck` pass with zero errors in `mobile/`.
- On `sridinesh`: `pytest backend/tests/` passes with all stubs.

#### Step 2: Merge Charan's Backend Track (`charan` → `main`)
```bash
# 1. Switch to main and pull latest
git checkout main
git pull origin main

# 2. Fetch and merge charan's branch
git fetch origin charan
git merge charan -m "merge(backend-b): integrate data connectors, PostGIS schema, A* pathfinder, and watchdog daemon"

# 3. Verify backend endpoints (/route, /oceanstate, /watchdog)
# Start backend server:
cd backend
uvicorn app.main:app --reload --port 8000
# Test health: curl http://localhost:8000/health
```

#### Step 3: Swap Agent Stubs with Charan's Real Implementations
Once Charan's code is in `main`, replace the temporary stubs in `backend/app/agents/graph.py` at the marked `# MERGE:` points:
```python
# Change from stubs:
# from app.agents._stubs import stub_fetch_ocean_data, stub_fetch_weather_hazard, stub_check_geofence
# To real modules:
from app.geospatial.fusion import fuse as fetch_ocean_data
from app.connectors.imd_bulletin import ImdBulletinConnector
from app.geospatial.geofence import check_point as check_geofence
```
Delete the temporary file `backend/app/agents/_stubs.py`. Commit this change:
```bash
git add backend/app/agents/graph.py
git commit -m "refactor(agents): swap stub functions with Charan's live geospatial and connector modules"
```

#### Step 4: Merge Akash's Frontend Track (`akash` → `main`)
```bash
git checkout main
git fetch origin akash
git merge akash -m "merge(frontend): integrate Expo mobile app, Leaflet map, voice UI, and offline sync"

# Verify mobile build:
cd ../mobile
npm run typecheck
```

#### Step 5: Merge Sridinesh's Lead Track (`sridinesh` → `main`)
```bash
git checkout main
git fetch origin sridinesh
git merge sridinesh -m "merge(lead): integrate LangGraph agent graph, planner, synthesis, deterministic guardrails, and risk engine"
```

#### Step 6: Resolve Conflicts (if any)
Because directories were partitioned strictly by member, merge conflicts are rare. If conflicts occur in shared files (`README.md` or `.env.example`):
1. Review the diff in VSCode / IDE.
2. Combine environment variables from both tracks into `.env.example`.
3. Complete the merge: `git add . && git commit -m "chore(merge): resolve shared config conflicts"`.

#### Step 7: End-to-End Smoke Test & Release Tagging
1. Set `EXPO_PUBLIC_USE_MOCK=false` in `mobile/.env`.
2. Start backend: `uvicorn app.main:app --reload --port 8000`.
3. Start Expo: `npx expo start`.
4. Ask *"Can I go fishing tomorrow morning near Kakinada?"* in the mobile app and verify the live answer, map layers, and evidence trace.
5. Tag the milestone release:
```bash
git tag -a v1.0-demo -m "ORCA Hackathon Demo Release v1.0"
git push origin main --tags
```

---

## 6. Sridinesh's Own Task List — Backend Core: Orchestration, Reasoning, Risk Engine

**Scope:** FastAPI skeleton, LangGraph agent graph, Planner Agent, Synthesis Agent, Deterministic Guardrail, Risk/Recommendation Engine, evidence-trace builder, `/query` and `/evidence` endpoints. This is the "brain" that decides what to ask for and turns fused data into a safe, explainable answer — it does **not** touch data connectors, PostGIS, or A* (that's Charan's, consumed here only through his fixed function signatures, agreed in Phase 0).

This task list is self-contained: every task operates on files inside `backend/app/agents/`, `backend/app/reasoning/`, `backend/app/api/v1/query.py`, `backend/app/api/v1/evidence.py`, `backend/app/core/`, and `backend/app/main.py`. Where a task needs data that would normally come from Charan's connectors or geospatial module, it is stubbed with fixed mock functions during development (§6, Phase 1) and only swapped for Charan's real functions at merge time — this is what keeps the two backend tracks independent.

### Phase 0 — Foundation (do this before anything else)

**Task S0.1 — Push the full repo skeleton to `main`**
- Files/Folders: entire structure in §2
- Depends on: nothing
- Done when: `git clone` of the repo shows every folder in §2 present (even if just placeholder files), `main` is pushed, and Charan/Akash can each branch from it.

**Task S0.2 — Scaffold the FastAPI app**
- Files/Folders: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/logging.py`, `backend/requirements.txt`, `backend/Dockerfile`, `backend/.env.example`
- Depends on: S0.1
- Done when: `uvicorn app.main:app --reload` starts cleanly; `GET /health` returns `{"status": "ok"}`; `/docs` (Swagger UI) loads and lists the health route.

**Task S0.3 — Define the Gemini API client wrapper**
- Files/Folders: `backend/app/core/llm.py`
- Depends on: S0.2
- Done when: a standalone test script sends a trivial prompt to Gemini via this wrapper and prints a real response; API key is read from `.env`, never hardcoded.

### Phase 1 — Agent State & Stub Contracts

**Task S1.1 — Define the shared LangGraph agent state schema**
- Files/Folders: `backend/app/agents/state.py`
- Depends on: S0.2
- Done when: a `TypedDict` (or `pydantic.BaseModel`) named `AgentState` exists with fields: `raw_query`, `role`, `language`, `intent`, `location`, `time_window`, `required_agents`, `ocean_data`, `weather_data`, `gis_data`, `evidence`, `risk_score`, `recommendation`, `final_response` — this is the object every node in the graph reads/writes.

**Task S1.2 — Write stub functions matching Charan's future connector/geospatial signatures**
- Files/Folders: `backend/app/agents/_stubs.py` (temporary, deleted at merge)
- Depends on: S1.1
- Done when: this file has functions `stub_fetch_ocean_data(lat, lon, time_window) -> dict`, `stub_fetch_weather_hazard(lat, lon, time_window) -> dict`, `stub_check_geofence(lat, lon) -> dict`, each returning realistic hardcoded values matching the field names in §3's `ocean_states`/`zones`/`hazards` tables. **This is the critical independence step** — Sridinesh builds and fully tests the entire reasoning pipeline against these stubs, without waiting for Charan's real implementations. At merge time, only the import line changes.

### Phase 2 — Planner Agent

**Task S2.1 — Build entity extraction (location, time, intent) via Gemini tool-calling**
- Files/Folders: `backend/app/agents/planner_agent.py`
- Depends on: S0.3, S1.1
- Done when: calling `plan(raw_query: str, location_hint: dict | None) -> AgentState` on the string "Can I go fishing tomorrow morning near Kakinada?" returns an `AgentState` with `intent="sail_clearance"`, a resolved `location` near Kakinada's real coordinates, and a `time_window` covering the next morning in IST, matching the strict JSON shape in the PRD/TRD §B.2.1.

**Task S2.2 — Implement missing-entity clarification fallback**
- Files/Folders: `backend/app/agents/planner_agent.py`
- Depends on: S2.1
- Done when: calling `plan()` on an ambiguous query with no location and no `location_hint` returns a state with `intent="clarification_needed"` and a `final_response` asking the user for the missing field, instead of guessing a location.

**Task S2.3 — Implement intent → required_agents mapping**
- Files/Folders: `backend/app/agents/planner_agent.py`
- Depends on: S2.1
- Done when: each of the five MVP intents (`sail_clearance`, `pfz_lookup`, `anomaly_detection`, `route_request`, `general_query`) maps to the correct subset of `["ocean","weather","gis"]` in `required_agents`, verified with a small table-driven unit test covering all five.

### Phase 3 — Deterministic Guardrail (anti-hallucination core)

**Task S3.1 — Build the numeric-claim validator**
- Files/Folders: `backend/app/reasoning/guardrail.py`
- Depends on: S1.1
- Done when: `validate_claims(claims: list[dict], source_values: dict) -> list[dict]` rejects (flags `unsupported=True`) any claim whose `supporting_value` does not match a value actually present in `source_values` (the fused ocean/weather/gis data passed in), and passes through claims that do match — verified with a unit test containing at least one intentionally fabricated claim.

**Task S3.2 — Build the freshness/staleness check**
- Files/Folders: `backend/app/reasoning/guardrail.py`
- Depends on: S3.1
- Done when: `check_freshness(valid_time: datetime, max_age_hours: int = 6) -> str` returns `"good"` or `"stale"` correctly for both fresh and stale timestamps, and any `"stale"` result causes the guardrail to append a caveat rather than silently pass the data through.

**Task S3.3 — Wire the guardrail into the pipeline as a hard gate**
- Files/Folders: `backend/app/reasoning/guardrail.py`
- Depends on: S3.1, S3.2
- Done when: `run_guardrail(state: AgentState) -> AgentState` is callable as a single function that internally runs both S3.1 and S3.2 against `state.ocean_data`/`state.weather_data`/`state.gis_data`, and any failed check populates `state.evidence` with an explicit `"STALE_DATA"` or `"UNSUPPORTED_CLAIM"` flag rather than raising an unhandled exception.

### Phase 4 — Risk & Recommendation Engine

**Task S4.1 — Implement the navigation risk score formula**
- Files/Folders: `backend/app/reasoning/risk_engine.py`
- Depends on: S1.1
- Done when: `compute_risk_score(wave_height_m, wind_speed_kt, distance_to_imbl_nm, hazard_severity) -> float` implements the weighted composite from the TRD (§B.2.5) with configurable weights loaded from `core/config.py`, returns a 0–100 value, and is covered by a unit test with at least 3 known input/output pairs.

**Task S4.2 — Implement risk banding**
- Files/Folders: `backend/app/reasoning/risk_engine.py`
- Depends on: S4.1
- Done when: `band_risk(score: float) -> str` correctly maps `0–25→low`, `26–50→moderate`, `51–75→high`, `76–100→extreme`, per the PRD's UI bands (§12).

**Task S4.3 — Implement sail-clearance and hazard-override logic**
- Files/Folders: `backend/app/reasoning/risk_engine.py`
- Depends on: S4.1, S3.3
- Done when: `sail_clearance(state: AgentState) -> bool` returns `False` whenever an active cyclone or critical-severity hazard is present in `state.evidence`, **regardless of what the computed risk score is** — i.e. the hard override always wins over the weighted score, verified by a test where a low numeric risk score is still overridden to "no-go" by a cyclone flag.

**Task S4.4 — Implement PFZ ranking**
- Files/Folders: `backend/app/reasoning/risk_engine.py`
- Depends on: S4.1
- Done when: `rank_pfz_candidates(candidates: list[dict]) -> list[dict]` sorts a list of PFZ candidate dicts (each with distance + suitability inputs) by a combined score and returns them ordered best-first, with the ranking reason attached to each item.

### Phase 5 — Synthesis Agent

**Task S5.1 — Build the grounded synthesis prompt**
- Files/Folders: `backend/app/agents/synthesis_agent.py`
- Depends on: S3.3, S4.2, S4.3
- Done when: `synthesize(state: AgentState) -> AgentState` calls Gemini with a prompt that includes only the guardrail-validated evidence list (never raw connector output) and produces `state.final_response` as natural-language text plus a structured `{claim_text, supporting_value, source_field}` array per claim, matching the TRD's structured-output requirement (§B.2.5).

**Task S5.2 — Enforce that synthesis output claims are re-validated post-generation**
- Files/Folders: `backend/app/agents/synthesis_agent.py`
- Depends on: S5.1, S3.1
- Done when: every claim the LLM outputs in S5.1 is passed back through `validate_claims` from S3.1 before being shown to the user; if the LLM invents a number not present in the evidence, that claim is stripped from `final_response` rather than shown — verified with a test that force-feeds a fabricated claim and confirms it's dropped.

**Task S5.3 — Implement multilingual response formatting (text stage only — TTS is Akash's)**
- Files/Folders: `backend/app/agents/synthesis_agent.py`
- Depends on: S5.1
- Done when: passing `language="ta-IN"` or `language="hi-IN"` into `synthesize()` produces `final_response` text in that language (via Gemini's multilingual generation, no separate translation call needed for MVP), falling back to English if the requested language isn't supported.

### Phase 6 — LangGraph Wiring

**Task S6.1 — Build the LangGraph state graph**
- Files/Folders: `backend/app/agents/graph.py`
- Depends on: S2.3, S3.3, S5.2
- Done when: a graph is constructed with nodes `planner → [ocean, weather, gis in parallel via stubs] → guardrail → risk → synthesis`, compiles without error, and running it end-to-end on a test query produces a populated `final_response` in `AgentState`.

**Task S6.2 — Add clarification short-circuit path**
- Files/Folders: `backend/app/agents/graph.py`
- Depends on: S6.1, S2.2
- Done when: a query that triggers `intent="clarification_needed"` in the Planner short-circuits straight to a response node and skips the domain-agent/guardrail/risk/synthesis nodes entirely, verified by checking the stub agent functions are never called for such a query.

**Task S6.3 — Swap-in point documentation for Charan's real functions**
- Files/Folders: `backend/app/agents/graph.py` (inline comments), `docs/API_CONTRACT.md`
- Depends on: S6.1
- Done when: every place `_stubs.py` functions are called has a clearly marked `# MERGE: replace with app.connectors.* / app.geospatial.*` comment, so the merge step is a mechanical import swap, not a rewrite.

### Phase 7 — Evidence Trace & API Endpoints

**Task S7.1 — Build the evidence-trace object builder**
- Files/Folders: `backend/app/reasoning/evidence.py`
- Depends on: S5.2
- Done when: `build_evidence_trace(state: AgentState) -> dict` produces an object matching the exact shape in §4.1's `evidence` array plus `confidence` and `caveats`, ready to be logged and returned.

**Task S7.2 — Implement `POST /api/v1/query`**
- Files/Folders: `backend/app/api/v1/query.py`, `backend/app/schemas/query.py`
- Depends on: S6.2, S7.1
- Done when: `POST /api/v1/query` with the exact request body from §4.1 returns a response matching §4.1's response shape exactly (field-for-field diffed against `backend/app/mock/mock_query_response.json`), and a `query_log` row is written (once Charan's `query_logs` table/repository exists — until then, this task is done when the response shape is correct and the DB write is stubbed with a `# MERGE:` comment).

**Task S7.3 — Implement `GET /api/v1/evidence/{query_id}`**
- Files/Folders: `backend/app/api/v1/evidence.py`
- Depends on: S7.2
- Done when: given a `query_id` returned by a prior `/query` call, this endpoint returns the full stored trace matching §4.2's shape; returns `404` for an unknown `query_id`.

**Task S7.4 — Add graceful degradation for missing/failed domain data**
- Files/Folders: `backend/app/agents/graph.py`, `backend/app/reasoning/guardrail.py`
- Depends on: S7.2
- Done when: if a domain-agent stub (or, post-merge, a real connector) returns `None`/raises, the pipeline still completes and returns a response with an explicit "insufficient data for X" caveat rather than crashing the endpoint — verified by forcing one stub to return `None` and confirming `POST /api/v1/query` still returns `200` with a degraded-but-honest answer.

### Phase 8 — Testing & Integration Readiness

**Task S8.1 — Write the evaluation query set**
- Files/Folders: `backend/tests/eval_queries.json`
- Depends on: S7.2
- Done when: 20–30 representative queries exist (English + at least Tamil/Hindi text versions), covering the 5 demo scenarios from the PRD §22, each with expected `intent` and expected `required_agents`, used to sanity-check the planner and full pipeline.

**Task S8.2 — Run the full pipeline against the eval set on stubs**
- Files/Folders: `backend/tests/test_pipeline.py`
- Depends on: S8.1, S7.4
- Done when: running the eval set through the compiled graph produces a `200`-equivalent structured response for every query with no unhandled exceptions, and the hallucination check (S5.2) reports zero unsupported claims across the whole set.

**Task S8.3 — Prepare the merge checklist**
- Files/Folders: `docs/DEMO_SCRIPT.md` (started here, finished after merge)
- Depends on: S8.2
- Done when: a checklist exists listing every `# MERGE:` marker location from S6.3, every stub file to delete, and the exact steps to swap Charan's branch's real connector/geospatial functions into `graph.py` — this is what makes merge day fast instead of a multi-hour debugging session.

---

## 7. Do's and Don'ts — Safety & Process (All Members)

**Do**
- Freeze the API contract (§4) before writing any endpoint code — if a field name needs to change, update this doc first, tell the team, then code.
- Use stub functions/mock data to stay unblocked — never wait idle for another member's branch.
- Write the guardrail (S3) before the synthesis agent depends on it — reasoning code must never let an LLM state a number it wasn't handed.
- Label all simulated/cached/mock data clearly in both API responses (`"quality": "mock"` where applicable) and in the UI, per the PRD's safety requirements (§16).
- Keep official hazard overrides (cyclone, critical warnings) as hard-coded precedence — never let the LLM or a weighted score downgrade a cyclone override.
- Commit and push daily, even if incomplete.

**Don't**
- Don't let the LLM freely emit numeric claims — every number shown to the user must trace back to a real fetched/stubbed value (S3.1, S5.2).
- Don't hardcode API keys or secrets anywhere in committed code — `.env` only, and `.env` is gitignored.
- Don't implement authentication — it's explicitly out of scope for MVP; role selection is client-side only.
- Don't let any one member's task block another's — if you find yourself needing a file outside your owned folders that doesn't exist yet, write a stub instead of waiting.
- Don't present the prototype risk score as an official safety certification anywhere in the UI or backend copy — always include the caveat.
