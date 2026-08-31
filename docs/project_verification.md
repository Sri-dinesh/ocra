# ORCA — Marine EcOsystem Reasoning with Collaborative Agents

> **Smart India Hackathon (SIH26176) • Indian Space Research Organisation (ISRO) Department of Space**
> **Status: Development Complete — This document is the Single Source of Truth for Verification**

ORCA is an Agentic AI-powered conversational marine intelligence and decision-support platform. It fuses heterogeneous Earth Observation data, oceanographic forecasts, meteorological bulletins, and maritime GIS layers into an evidence-backed, multi-turn conversational experience with transparent risk evaluation, A* safe marine route planning, and proactive safety monitoring.

**No mock, stub, dummy, or hardcoded data is used anywhere in this system.** Every response the platform produces — chat answers, risk scores, map overlays, routes, and alerts — is generated at request time from live backend API calls against real datasets. This document defines the objectives, architecture, data sources, tools, and end-to-end workflow that ORCA must satisfy, and is intended to be used as the checklist against which the built system is verified.

---

## 1. Verification Objectives

Use this section as the pass/fail checklist for verifying the build.

| # | Objective | Verification Criterion |
|---|---|---|
| 1 | No mock/sample/hardcoded data in any code path | Grep backend and mobile source for mock fixtures, sample JSON payloads, or hardcoded ocean/weather values used as fallback logic; none should exist in the active request path |
| 2 | All ocean, weather, and GIS data is fetched live | Each connector (INCOIS, Copernicus CMEMS, NOAA ERDDAP, IMD, Survey of India/MoEFCC) makes a real outbound call per request cycle (or per defined refresh interval) and the response is traceable in logs |
| 3 | Every user query is processed end-to-end through the agent pipeline | A query submitted via `/api/v1/query` visibly passes through Planner → Parallel Domain Gatherer → Guardrail → Risk Engine → Synthesis, with each stage's output inspectable via the evidence trace |
| 4 | Every factual claim in a response is grounded in a cited real data source | `/api/v1/evidence/{query_id}` returns a source-linked trace for every claim in the synthesized answer; ungrounded claims must be blocked by the Guardrail node |
| 5 | Risk scoring reflects current, real conditions | Risk band (Low/Moderate/High/Extreme) for a given location changes when the underlying live data changes (e.g., wave height spike, cyclone bulletin) — not static per location |
| 6 | Route planning avoids real hazards using real geospatial data | A* routes must route around live-flagged Marine Protected Areas, IMBL boundaries, and hazard zones — not fixed sample polygons |
| 7 | Watchdog alerts fire from live vessel + live boundary/weather data | Subscribing a real or test vessel position and moving it toward a real geofence/storm system triggers an alert without any simulated data injection |
| 8 | Multilingual synthesis stays grounded across languages | Responses in English, Tamil, Hindi, etc. carry the same grounded facts as the English-language evidence trace — translation must not introduce ungrounded content |
| 9 | System behaves correctly under real-world data gaps | If a live connector is temporarily unavailable, the system must clearly report reduced confidence or partial data — never silently substitute placeholder values |

---

## 2. System Architecture

```
                                  ┌─────────────────────────────────────────┐
                                  │       Mobile App (Expo SDK 57)          │
                                  │   React Native 0.86 • React 19 • Leaflet │
                                  │   Push-to-Talk Voice • Live Chat & Map  │
                                  └────────────────────┬────────────────────┘
                                                       │ HTTP REST (JSON)
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │        FastAPI Backend Gateway          │
                                  │    Async REST API • Port 8000 (0.0.0.0) │
                                  │    Real-time request processing only    │
                                  └──────────────┬───────────────────┬──────┘
                                                 │                   │
                     ┌───────────────────────────┴──┐     ┌──────────┴─────────────────────────┐
                     │    LangGraph Agent Brain     │     │      Geospatial & Risk Engine       │
                     │  • Planner Agent (Intent)    │     │  • PostGIS / SQLite Spatial Engine  │
                     │  • Parallel Domain Gatherer  │     │  • A* Safety-Aware Route Planner    │
                     │  • Deterministic Guardrail   │     │  • Live Data Adapters (INCOIS, IMD, │
                     │  • Risk Engine (Bands 0-100) │     │    Copernicus CMEMS, NOAA ERDDAP)   │
                     │  • Grounded Synthesis (i18n) │     │  • Watchdog Proactive Vessel Daemon │
                     └──────────────────────────────┘     └─────────────────────────────────────┘
                                                 │                   │
                                                 ▼                   ▼
                                  ┌─────────────────────────────────────────┐
                                  │     Live External Data Providers        │
                                  │  INCOIS • Copernicus • NOAA • IMD •     │
                                  │  Survey of India / MoEFCC               │
                                  └─────────────────────────────────────────┘
```

Every box below the mobile app operates exclusively on real-time or scheduled-live data pulled through backend API calls. There is no mock-data layer or sample-response mode in the production request path.

---

## 3. Key Features & Capabilities

* **Multi-Agent Conversational Brain (LangGraph)**:
  * **Planner Node**: Resolves query intent, geographical coordinates, and persona roles (*Fisherman*, *Researcher*, *Coast Guard*, *Policymaker*) from the live user query, in real time.
  * **Parallel Domain Ingestion**: Concurrently calls live physical ocean models, weather advisories, and marine protected area registries for the queried location and time.
  * **Deterministic Guardrail Node**: Hard verification gate ensuring every factual claim is strictly linked to a verified, live-fetched data source — claims without a real source citation are rejected before synthesis.
  * **Risk & Safety Engine**: Computes normalized safety risk scores (`0–100`), classification bands (*Low*, *Moderate*, *High*, *Extreme*), and sail/no-sail clearances from current live conditions.
  * **Grounded Multilingual Synthesis**: Produces localized advisories in English, Tamil, Hindi, and other regional coastal languages with zero hallucination tolerance, using only grounded, real-time data.

* **Live Earth Observation & Ocean Connectors** (see Section 4 for full dataset detail):
  * **INCOIS OSF**: Real-time wave heights, swell periods, and surface wind velocities.
  * **Copernicus CMEMS**: Multi-layer sea surface temperature (SST) and surface current vectors.
  * **NOAA CoastWatch ERDDAP**: VIIRS daily chlorophyll-*a* concentrations and biological productivity.
  * **IMD Bulletin Feed**: Active cyclone warnings, depression tracks, and meteorological bulletins.
  * **Survey of India & MoEFCC**: Official International Maritime Boundary Line (IMBL) datum and Marine Protected Area (MPA) boundaries.

* **Geospatial Intelligence & Safe Routing**:
  * **A\* Nautical Pathfinding**: Calculates optimal sea routes avoiding shallow depths, severe wave hazards, and restricted conservation zones, using live bathymetry and hazard data.
  * **Geofence Containment & Watchdog**: Proactively tracks registered vessels in real time and alerts if approaching maritime borders (e.g., IMBL) or live storm systems.

* **Cross-Platform Mobile Client (Expo SDK 57)**:
  * **Voice-First Interaction**: Push-to-talk audio input powered by `expo-audio`, transcribed and routed to the live query pipeline.
  * **Interactive Maritime Maps**: Leaflet WebView map with real-time ocean parameter heatmaps, safe routes, and danger buffers rendered from live API responses.
  * **Resilient Network Client**: Automatic Metro host discovery, Android emulator bridge (`10.0.2.2`), and LAN IP failover with 90s synthesis timeout — no offline/mock fallback data is served during this window.

---

## 4. Datasets & Live Data Sources

All datasets below must be integrated as **live API/feed connectors**, not static downloads baked into the app or bundled sample files.

| Dataset / Source | Provider | Data Supplied | Access Method | Update Cadence |
|---|---|---|---|---|
| **Ocean State Forecast (OSF)** | INCOIS (Indian National Centre for Ocean Information Services) | Wave height, swell period, surface wind velocity | THREDDS live feed / API | Near real-time |
| **CMEMS** | Copernicus Marine Service | Sea surface temperature (SST), surface current vectors | Copernicus Marine API | Daily / near real-time |
| **ERDDAP (VIIRS)** | NOAA CoastWatch | Chlorophyll-*a* concentration, biological productivity | NOAA ERDDAP API | Daily |
| **IMD Bulletins** | India Meteorological Department | Cyclone warnings, depression tracks, weather advisories | IMD bulletin feed | As issued |
| **IMBL Boundary Datum** | Survey of India | Official International Maritime Boundary Line geometry | Official GIS layer | Static/authoritative (versioned, not mocked) |
| **Marine Protected Area (MPA) Boundaries** | MoEFCC | Protected/restricted marine zone polygons | Official GIS layer | Versioned, authoritative |

**Verification note:** the "static/authoritative" sources (IMBL, MPA boundaries) are official government-published boundary data, not application mock data — they are expected to be sourced from the official datasets and stored as canonical geospatial records, distinct from placeholder or invented fixtures used only for early-stage demos.

---

## 5. Tools & Integrations

| Category | Tool / Technology | Role |
|---|---|---|
| Agent Orchestration | **LangGraph** | Coordinates Planner, Domain Gatherer, Guardrail, Risk Engine, and Synthesis nodes as a real-time state machine per query |
| LLM Reasoning | **Google Gemini 2.5 Flash** (via `google-genai` SDK) | Natural-language understanding, intent resolution, and grounded response synthesis |
| Backend API | **FastAPI** (Python 3.11+, Uvicorn, Pydantic v2, HTTPX) | Serves all REST endpoints; HTTPX performs the live outbound calls to external data providers |
| Spatial Database | **Supabase (PostgreSQL 17 + PostGIS)**, SQLAlchemy 2.0, GeoAlchemy2, Shapely, PyProj | Stores authoritative boundary/zone data and query/evidence history; SQLite spatial fallback for local/offline dev only, never used to fabricate response data |
| Routing | **A\* Pathfinding Engine** (custom, `geospatial/`) | Computes safe nautical routes against live hazard and boundary layers |
| Mobile Client | **React Native 0.86, Expo SDK 57, React 19, TypeScript, Zustand, Leaflet, Expo Audio, Reanimated 4** | Delivers voice/chat/map interface and calls backend live endpoints only |
| Monitoring | **Watchdog Daemon** (`watchdog/`) | Continuously polls live vessel positions against live geofence and weather data |

---

## 6. End-to-End Workflow / User Flow

This is the exact real-time processing path a user query follows. Use it to verify that no step is short-circuited by mock data or hardcoded responses.

1. **User Input (Mobile App)**
   The user opens the ORCA mobile app and either types a query or uses push-to-talk voice input (e.g., *"Is it safe to sail near Chennai coast tomorrow?"*). Voice is transcribed on-device/via API before submission.

2. **Query Submission**
   The mobile client sends the query, along with any location/persona context, to the backend via `POST /api/v1/query` over HTTPS REST.

3. **Planner Node (Intent Resolution)**
   The LangGraph Planner parses the query in real time to resolve: user intent (safety check, route request, general info), geographic coordinates, time window, and persona (Fisherman / Researcher / Coast Guard / Policymaker).

4. **Parallel Domain Gatherer**
   The backend concurrently calls the live connectors relevant to the query:
   - INCOIS OSF for wave/wind/swell
   - Copernicus CMEMS for SST/currents
   - NOAA ERDDAP for chlorophyll/productivity (if relevant)
   - IMD for active cyclone/weather bulletins
   - Survey of India/MoEFCC boundary layers for IMBL/MPA proximity
   Each connector returns live, timestamped data — no cached mock payloads.

5. **Deterministic Guardrail Check**
   Before any answer is drafted, the Guardrail node verifies that every fact intended for the response is traceable to one of the live data pulls in step 4. Ungrounded or unsupported claims are dropped, not guessed.

6. **Risk & Safety Engine**
   Using the gathered live data, the Risk Engine computes a normalized `0–100` risk score and assigns a band (*Low / Moderate / High / Extreme*), plus a sail/no-sail recommendation where applicable.

7. **Grounded Multilingual Synthesis**
   The Gemini-backed synthesis node generates the final natural-language answer in the user's selected language, citing the specific live sources used, with zero-hallucination constraints enforced by the Guardrail output.

8. **Evidence Trace Availability**
   The full trace — which sources were called, what they returned, how long each step took, and what the Guardrail approved — is stored and retrievable via `GET /api/v1/evidence/{query_id}` for auditing and verification.

9. **Response Delivery to Mobile App**
   The synthesized answer, risk band, and any relevant map overlays (heatmaps, hazard buffers) are returned to the mobile client and rendered in the chat view and/or Leaflet map.

10. **Optional: Route Planning**
    If the user requests a route, `POST /api/v1/route` triggers the A* engine to compute a path using live bathymetry, hazard, and boundary data, avoiding MPAs and unsafe zones based on current conditions.

11. **Optional: Vessel Watchdog Subscription**
    A user (or vessel operator) can register a vessel via `POST /api/v1/watchdog/subscribe`. The Watchdog daemon then continuously checks the vessel's live position against live geofence boundaries and active weather bulletins, pushing alerts through `GET /api/v1/watchdog/alerts` if a real threshold is crossed.

12. **Offline Bundle (Edge Case)**
    For disconnected coastal operation, `GET /api/v1/sync/payload` provides a downloadable geospatial bundle generated from the most recent live data pull — this is a cached snapshot of real data for offline use, not synthetic/mock content, and should be clearly timestamped so staleness is visible to the user.

---

## 7. Technology Stack

| Layer | Technologies |
|---|---|
| **Mobile Client** | React Native 0.86, Expo SDK 57, React 19, TypeScript, Zustand, Leaflet Map WebView, Expo Audio, Reanimated 4 |
| **Backend Framework** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| **Agentic AI & LLM** | LangGraph, Google GenAI SDK (`google-genai` v2+), Gemini 2.5 Flash |
| **Database & GIS** | Supabase (PostgreSQL 17 + PostGIS), SQLAlchemy 2.0, GeoAlchemy2, Shapely, PyProj, SQLite Spatial Fallback (local dev only) |
| **Live Data Sources** | INCOIS THREDDS, Copernicus Marine (CMEMS), NOAA CoastWatch, IMD Meteorological Bulletins, Survey of India, MoEFCC |

---

## 8. Repository Structure

```
ocra/
├── README.md                                # Project documentation & overview
├── .gitignore
├── docs/                                    # System specs & documentation
│   ├── ORCA_SIH26176_Comprehensive_PRD.md   # Comprehensive Product Requirement Doc
│   ├── API_CONTRACT.md                      # Single source of truth for API schemas
│   ├── DEMO_SCRIPT.md                       # Presentation & demonstration script
│   └── Backend_Workflow.md                  # Detailed backend orchestration specification
│
├── backend/                                 # FastAPI Backend Service
│   ├── app/
│   │   ├── main.py                          # Application entrypoint (Host 0.0.0.0)
│   │   ├── core/                            # Configuration, LLM bridge & logging
│   │   ├── db/                              # Database session, models, and zone seeds
│   │   ├── models/                          # SQLAlchemy relational & spatial entities
│   │   ├── schemas/                         # Pydantic request/response schemas
│   │   ├── agents/                          # LangGraph state machine & multi-agent workflow
│   │   ├── reasoning/                       # Guardrails, risk engine, evidence builder
│   │   ├── connectors/                      # Live INCOIS, Copernicus, NOAA, IMD adapters
│   │   ├── geospatial/                      # Marine fusion, geofence, A* pathfinder
│   │   ├── watchdog/                        # Vessel tracking & proactive alert service
│   │   └── api/v1/                          # REST routes (/query, /route, /oceanstate, /watchdog)
│   ├── requirements.txt                     # Backend Python dependencies
│   ├── Dockerfile
│   └── .env.example                         # Backend environment template
│
└── mobile/                                  # Expo React Native Mobile App
    ├── app/                                 # Expo Router tabs (Chat, Map, Alerts, Settings)
    ├── src/
    │   ├── api/                             # Live API client with automatic network failover
    │   ├── components/                      # PushToTalk, ChatView, LeafletMapView, RiskBadge
    │   ├── store/                           # Zustand state management
    │   ├── voice/                           # Voice bridge & speech synthesis
    │   └── types/                           # TypeScript schemas matching API contracts
    ├── app.json                             # Expo SDK 57 configuration
    ├── package.json                         # Mobile dependencies
    └── .env.example                         # Mobile environment template
```

---

## 9. Setup Guide (Real Data Configuration)

### Prerequisites
* **Python 3.11+**
* **Node.js 18+** & **npm**
* **Google Gemini API Key** (for agentic reasoning)
* **Live API credentials/access** for INCOIS, Copernicus CMEMS, NOAA ERDDAP, and IMD feeds (required — the system will not function correctly without real credentials, since no mock fallback exists)
* **Supabase Project** (optional for cloud persistence; local spatial database is built-in for dev only)

---

### A. Backend Setup

1. **Navigate to the backend directory and set up a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate    # On Windows: .\venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your real credentials — do not leave placeholder/sample values in a running instance:
   ```ini
   PORT=8000
   ENVIRONMENT=production
   LOG_LEVEL=INFO

   # Google Gemini AI
   GEMINI_API_KEY=your_actual_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash

   # Live Data Connector Credentials
   INCOIS_API_ENDPOINT=your_incois_thredds_endpoint
   CMEMS_USERNAME=your_copernicus_username
   CMEMS_PASSWORD=your_copernicus_password
   NOAA_ERDDAP_ENDPOINT=your_noaa_erddap_endpoint
   IMD_BULLETIN_FEED_URL=your_imd_feed_url

   # Database (Supabase or Local SQLite Spatial)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   DATABASE_URL=sqlite:///./app.db
   ```

4. **Initialize database schema and seed authoritative boundary zones** (official IMBL/MPA geometry, not mock polygons):
   ```bash
   python -c "from app.db.init_db import init_db; from app.db.seed_zones import main; init_db(); main()"
   ```

5. **Start the FastAPI server listening on all network interfaces**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * **Interactive Swagger Documentation**: `http://localhost:8000/docs`
   * **Health Check**: `http://localhost:8000/health`
   * On startup, confirm in logs that each live connector (INCOIS, CMEMS, NOAA, IMD) successfully authenticates/connects.

---

### B. Mobile App Setup

1. **Navigate to the mobile directory and install packages**:
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Point at the live backend instance (no local mock server should be configured here):
   ```ini
   EXPO_PUBLIC_API_BASE_URL=http://<YOUR_BACKEND_HOST>:8000
   ```

3. **Start the Expo development server**:
   ```bash
   npx expo start -c
   ```

4. **Run on Device or Simulator**:
   * **Physical Device**: Scan the QR code using the **Expo Go** app on Android/iOS (ensure your phone is connected to the same network as the backend host).
   * **Android Emulator**: Press `a` in the terminal (automatically routes to `http://10.0.2.2:8000`).
   * **Web Preview**: Press `w` in the terminal.

---

## 10. Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/query` | Process marine advisory query through the LangGraph multi-agent pipeline using live data only. |
| `GET` | `/api/v1/evidence/{query_id}` | Retrieve the complete grounding evidence trace, latency breakdown, and live sources used. |
| `POST` | `/api/v1/route` | Calculate safe nautical navigation path via A* avoidance algorithm against live hazard/boundary data. |
| `GET` | `/api/v1/oceanstate` | Retrieve fused multi-source live ocean parameters (SST, Waves, Wind, Chlorophyll). |
| `POST` | `/api/v1/watchdog/subscribe` | Register vessel location for proactive, live geofence monitoring. |
| `GET` | `/api/v1/watchdog/alerts` | Poll real-time boundary proximity or severe weather alerts derived from live data. |
| `GET` | `/api/v1/sync/payload` | Download a timestamped offline geospatial bundle (real-data snapshot) for disconnected coastal operation. |

---

## 11. Verification & Testing

* **Backend Test Suite** (should exercise real connector calls or clearly marked integration test credentials, not permanent mocks in production code paths):
  ```bash
  cd backend
  pytest tests/ -v
  ```
* **Frontend TypeScript Verification**:
  ```bash
  cd mobile
  npm run typecheck
  ```
* **Expo Dependency Check**:
  ```bash
  cd mobile
  npx expo-doctor
  ```
* **Manual End-to-End Verification Checklist**:
  1. Submit a real query via the mobile app for a live coastal location.
  2. Confirm `/api/v1/evidence/{query_id}` shows real timestamps and live source citations for every claim.
  3. Confirm the risk band changes when queried again after real underlying conditions change (e.g., a new IMD bulletin is issued).
  4. Request a route and confirm it avoids a known live MPA/IMBL boundary.
  5. Subscribe a test vessel to Watchdog and confirm an alert fires only from genuine position/boundary proximity, not a simulated trigger.

---

## 12. License & Acknowledgments

Developed for the **Smart India Hackathon (SIH26176)** in collaboration with the **Indian Space Research Organisation (ISRO)** and the Department of Space. Live data services provided by **INCOIS**, **Copernicus Marine Service**, **NOAA CoastWatch**, **IMD**, **Survey of India**, and **MoEFCC**.