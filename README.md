# ORCA (Sagaradristi · सागरदृष्टि)
### Marine EcOsystem Reasoning with Collaborative Agents

> **Smart India Hackathon (SIH26176) • Indian Space Research Organisation (ISRO) Department of Space**  
> *Autonomous Multi-Agent Marine Intelligence, Decision-Support, and Dynamic Ocean Safety Platform*

---

## 1. Executive Summary

**ORCA (Sagaradristi)** is an Agentic AI-powered conversational marine decision-support platform engineered for Indian coastal fishermen, marine researchers, port operators, and maritime safety authorities. 

ORCA fuses heterogeneous Earth Observation (EO) satellite data, numerical oceanographic models, live meteorological warnings, and high-precision spatial maritime boundaries into an auditable, multilingual conversational experience. The system delivers transparent risk scoring (0–100), deterministic safety clearance checks, A* optimal nautical routing with marine protected area (MPA) avoidance, proactive boundary geofence monitoring, and offline-first edge caching for disconnected deep-sea operations.

---

## 2. System Architecture

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │           Sagaradristi Mobile App (Expo SDK 57)         │
                                  │   React Native 0.86 • React 19 • TypeScript • Zustand   │
                                  │   Integrated Voice (PTT) • Interactive Map • Offline DB │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │ HTTP REST (JSON)
                                                               ▼
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                 FastAPI Gateway (Port 8000)             │
                                  │        Async REST API • Relational Audit Persistence    │
                                  └─────────────────┬─────────────────────┬─────────────────┘
                                                    │                     │
                ┌───────────────────────────────────┴───┐     ┌───────────┴─────────────────────────────┐
                │        LangGraph Multi-Agent Brain    │     │       Geospatial & Safety Engines       │
                │  1. Planner Agent (Intent & Gazetteer)│     │  • PostGIS & Spatial SQLite Engine      │
                │  2. Parallel Domain Gatherers (4 HTTP)│     │  • Dynamic A* Safety Nautical Router    │
                │  3. Deterministic Guardrail (Grounding)│     │  • Live Earth Observation Adapters:     │
                │  4. Non-Linear Risk & Safety Engine   │     │    - INCOIS OSF (Waves & Wind)          │
                │  5. Grounded Multilingual Synthesis   │     │    - Copernicus CMEMS (SST & Currents)  │
                │  6. Multi-Session Conversation Memory │     │    - NOAA ERDDAP (Chlorophyll-a)        │
                └───────────────────────────────────────┘     │    - IMD Bulletins (Cyclones & Gale)    │
                                                              │  • Proactive Vessel Watchdog Daemon     │
                                                              └─────────────────────────────────────────┘
```

---

## 3. Key Capabilities & Core Innovations

### 🤖 Multi-Agent Conversational Brain (LangGraph)
* **Intent & Gazetteer Extraction**: Authoritative Indian Coastal Gazetteer resolving 60+ ports and landing centers across regional scripts (English, Tamil, Hindi, Telugu).
* **Deterministic Guardrail & Multi-Source Verification**: Hard verification gate verifying observational timestamps, source agency signatures, and physical limits before synthesis.
* **Grounded Multilingual Synthesis**: Eliminates hallucinations by anchoring all generated numerical facts, risk indexes, and geospatial restrictions strictly to verified evidence.
* **Real-Time Response Cancellation**: Full `AbortController` client-server integration allowing users to cancel in-flight queries instantly without UI locking.

### 💬 Persistent Multi-Session Conversation History
* **Relational Conversation Sessions**: Full 1:N relational session management (`conversations` ↔ `query_logs` ↔ `evidence_items`) persisted in PostgreSQL/SQLite.
* **Seamless Chat Resumption**: Browse past sessions grouped by timeframe ("Today", "Yesterday", "Older"), restore complete message history with interactive risk badges and audited evidence trails, or start a new chat with one tap.

### 📍 Interactive Location Selector & Gazetteer
* **Dual-Mode Location Picker**:
  * **Search & Select**: Instant search across major coastal landing centers (Kakinada, Visakhapatnam, Chennai, Kochi, Rameswaram, Paradip, Mangalore, Mumbai, Veraval, etc.) plus custom coordinate entry.
  * **Interactive Map Pin**: Embedded Leaflet WebView with a center crosshair target to pick any geographical coordinate across the Indian Ocean in real time.

### 🛰️ Zero-Mock Live Earth Observation Connectors
* **INCOIS OSF**: Real-time significant wave heights ($H_s$), swell periods, and surface wind velocities.
* **Copernicus CMEMS**: Multi-layer sea surface temperature (SST) and surface current vectors.
* **NOAA CoastWatch ERDDAP**: VIIRS daily chlorophyll-*a* concentrations and thermal front indicators.
* **IMD Bulletins**: Meteorological cyclone tracks, depressions, and squall warnings.
* **Calibrated Physical Modeling**: Resilient, physics-governed fallback modeling when upstream feeds undergo scheduled maintenance.

### 🧭 Geospatial Intelligence & Dynamic Safety Routing
* **Spatial A* Nautical Pathfinding**: Generates safe maritime waypoints while strictly avoiding shallow bathymetry, severe wave hazard fields, and restricted conservation zones.
* **Dynamic Marine Protected Area (MPA) & IMBL Avoidance**: Rasterizes zero-traversal cost barriers around sensitive ecological sanctuaries (e.g., Coringa Wildlife Sanctuary) and international borders.
* **Proactive Watchdog & Vessel Drift Simulation**: Background daemon alerting vessels when drifting within safety buffer zones ($< 5\text{ nm}$ from IMBL).

### 📱 Edge Offline-First Resilience
* **Local SQLite Geospatial Caching**: Automatically pre-caches offline synchronization bundles (`/api/v1/sync/payload`) for zero-connectivity open-ocean operation.

---

## 4. Technology Stack

| Component | Technologies & Frameworks |
|---|---|
| **Mobile Client** | React Native 0.86, Expo SDK 57, React 19, TypeScript, Zustand, Leaflet Map WebView, Expo Audio, Expo Haptics |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn (ASGI), Pydantic v2, HTTPX |
| **Multi-Agent Orchestration** | LangGraph State Machine, Google GenAI SDK (`google-genai` v2+), Gemini 2.5 Flash |
| **Database & GIS** | Supabase (PostgreSQL 17 + PostGIS), SQLAlchemy 2.0, GeoAlchemy2, Shapely, PyProj, SQLite Spatial Fallback |
| **Earth Observation Sources** | INCOIS THREDDS, Copernicus Marine Service (CMEMS), NOAA CoastWatch ERDDAP, IMD Bulletins |

---

## 5. Repository Structure

```
ocra/
├── README.md                                # Authoritative project documentation
├── docs/                                    # System architecture & verification specs
│   ├── API_CONTRACT.md                      # Single source of truth for REST API contracts
│   ├── Backend_Workflow.md                  # Comprehensive backend orchestration specification
│   ├── project_verification.md              # 9-point verification methodology & test proof
│   └── DEMO_SCRIPT.md                       # Hackathon live demonstration walk-through
│
├── backend/                                 # FastAPI Backend Service
│   ├── app/
│   │   ├── main.py                          # ASGI application entrypoint & lifespan
│   │   ├── core/                            # Config, LLM client bridge, and logging
│   │   ├── db/                              # Database session, models, and zone seeds
│   │   ├── models/                          # SQLAlchemy models (Conversation, QueryLog, Evidence, etc.)
│   │   ├── schemas/                         # Pydantic request/response schemas
│   │   ├── agents/                          # LangGraph state machine (Planner, Synthesis, Graph)
│   │   ├── reasoning/                       # Deterministic guardrails, risk engine, MCDA ranking
│   │   ├── connectors/                      # Live INCOIS, Copernicus, NOAA, IMD adapters
│   │   ├── geospatial/                      # Fusion engine, A* cost grid pathfinder, geofencing
│   │   ├── watchdog/                        # Vessel tracking & proactive alert service
│   │   └── api/v1/                          # REST endpoints (Query, Conversations, Route, Watchdog)
│   ├── tests/                               # Comprehensive Pytest test suite (28/28 passing)
│   ├── requirements.txt                     # Backend dependencies
│   └── .env.example                         # Environment configuration template
│
└── mobile/                                  # Expo React Native Mobile Application
    ├── app/                                 # Expo Router tabs (Chat, Map, Alerts, Settings)
    ├── src/
    │   ├── api/                             # Type-safe API clients (Query, Conversations, Route)
    │   ├── components/
    │   │   ├── chat/                        # ChatBubble, PushToTalk, HistoryModal, LocationPickerModal
    │   │   ├── map/                         # LeafletMapView, RoutePlannerSheet
    │   │   ├── common/                      # OfflineBanner, Header components
    │   │   └── ui/                          # Micro-animations, ThinkingDots, PressableScale
    │   ├── constants/                       # Authoritative Indian Coastal Ports reference list
    │   ├── store/                           # Zustand stores (chatStore, settingsStore, watchdogStore)
    │   ├── offline/                         # SQLite edge cache & offline answering engine
    │   ├── voice/                           # Speech-to-Text & Text-to-Speech audio bridge
    │   └── types/                           # TypeScript interfaces matching backend contracts
    ├── package.json                         # Mobile dependencies
    └── app.json                             # Expo SDK 57 configuration
```

---

## 6. Quickstart & Installation Guide

### Prerequisites
* **Python 3.11+**
* **Node.js 18+** and **npm**
* **Google Gemini API Key** (for agentic reasoning)
* **Supabase Project** (optional; built-in local spatial fallback is active by default)

---

### Step 1: Backend Setup

1. **Navigate to the backend directory and initialize a virtual environment**:
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
   Edit `.env` with your API keys:
   ```ini
   PORT=8000
   ENVIRONMENT=development
   LOG_LEVEL=INFO

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash

   # Database (Supabase PostgreSQL or Local SQLite)
   DATABASE_URL=sqlite:///./app.db
   ```

4. **Initialize relational database tables and seed spatial zones**:
   ```bash
   python -c "from app.db.init_db import init_db; from app.db.seed_zones import main; init_db(); main()"
   ```

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * **Swagger Interactive Docs**: `http://localhost:8000/docs`
   * **API Health Check**: `http://localhost:8000/api/v1/health`

---

### Step 2: Mobile Application Setup

1. **Navigate to the mobile directory and install packages**:
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Set your computer's LAN IP address:
   ```ini
   EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LOCAL_IP>:8000
   ```

3. **Launch the Expo development server**:
   ```bash
   npx expo start -c
   ```

4. **Run on Device or Simulator**:
   * **Physical Device**: Open **Expo Go** on Android/iOS and scan the terminal QR code (ensure phone and PC share the same Wi-Fi network).
   * **Android Emulator**: Press `a` in the terminal (automatically maps to `http://10.0.2.2:8000`).
   * **Web Browser**: Press `w` in the terminal.

---

## 7. Comprehensive REST API Reference

| HTTP Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/query` | Execute natural-language marine query through LangGraph multi-agent pipeline. |
| `GET` | `/api/v1/conversations` | List all past conversation sessions ordered chronologically. |
| `POST` | `/api/v1/conversations` | Explicitly create a new conversation session. |
| `GET` | `/api/v1/conversations/{id}` | Retrieve full conversation message history with evidence and risk scores. |
| `PATCH` | `/api/v1/conversations/{id}` | Rename conversation session title. |
| `DELETE` | `/api/v1/conversations/{id}` | Delete conversation and cascade all linked query logs and evidence rows. |
| `GET` | `/api/v1/evidence/{query_id}` | Retrieve audited evidence trace, pipeline latency breakdown, and data sources. |
| `POST` | `/api/v1/route` | Calculate safe nautical navigation path via spatial A* avoidance algorithm. |
| `GET` | `/api/v1/oceanstate` | Retrieve real-time fused multi-source ocean parameters (SST, Waves, Wind, Chlorophyll). |
| `POST` | `/api/v1/watchdog/subscribe` | Register vessel coordinates for proactive geofence monitoring. |
| `GET` | `/api/v1/watchdog/alerts` | Poll real-time boundary proximity or severe weather alerts. |
| `GET` | `/api/v1/sync/payload` | Download offline geospatial bundle for disconnected coastal operations. |

---

## 8. Verification & Quality Assurance

### Automated Backend Test Suite
```bash
cd backend
pytest tests/ -v
```
```
======================= 28 passed, 4 warnings in 38.48s ========================
```
* **Coverage**: Connector resilience, spatial A* routing, gazetteer matching (English, Tamil, Hindi), non-linear risk engine, deterministic guardrail validation, relational schema provenance, and multi-session conversation lifecycle.

### Mobile TypeScript Static Analysis
```bash
cd mobile
npx tsc --noEmit
```
```
0 errors found.
```

---

## 9. Hackathon Credentials & Acknowledgments

Developed for the **Smart India Hackathon (SIH26176)** in collaboration with the **Indian Space Research Organisation (ISRO)**, Department of Space, Government of India.

* **Data Providers**: Indian National Centre for Ocean Information Services (INCOIS), Copernicus Marine Service (CMEMS), NOAA CoastWatch, India Meteorological Department (IMD).
* **Lead Developer**: Sri Dinesh ([@Sri-dinesh](https://github.com/Sri-dinesh))
