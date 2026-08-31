# ORCA — Marine EcOsystem Reasoning with Collaborative Agents

> **Smart India Hackathon (SIH26176) • Indian Space Research Organisation (ISRO) Department of Space**

ORCA is an Agentic AI-powered conversational marine intelligence and decision-support platform. It fuses heterogeneous Earth Observation data, oceanographic forecasts, meteorological bulletins, and maritime GIS layers into an evidence-backed, multi-turn conversational experience with transparent risk evaluation, A* safe marine route planning, and proactive safety monitoring.

---

## 1. System Architecture

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
                                  └──────────────┬───────────────────┬──────┘
                                                 │                   │
                     ┌───────────────────────────┴──┐     ┌──────────┴─────────────────────────┐
                     │    LangGraph Agent Brain     │     │      Geospatial & Risk Engine       │
                     │  • Planner Agent (Intent)    │     │  • PostGIS / SQLite Spatial Engine  │
                     │  • Parallel Domain Gatherer  │     │  • A* Safety-Aware Route Planner    │
                     │  • Deterministic Guardrail   │     │  • Real Data Adapters (INCOIS, IMD, │
                     │  • Risk Engine (Bands 0-100) │     │    Copernicus CMEMS, NOAA ERDDAP)   │
                     │  • Grounded Synthesis (i18n) │     │  • Watchdog Proactive Vessel Daemon │
                     └──────────────────────────────┘     └─────────────────────────────────────┘
```

---

## 2. Key Features & Capabilities

* **Multi-Agent Conversational Brain (LangGraph)**:
  * **Planner Node**: Resolves query intent, geographical coordinates, and persona roles (*Fisherman*, *Researcher*, *Coast Guard*, *Policymaker*).
  * **Parallel Domain Ingestion**: Concurrently queries physical ocean models, weather advisories, and marine protected areas.
  * **Deterministic Guardrail Node**: Hard verification gate ensuring every factual claim is strictly linked to a verified data source.
  * **Risk & Safety Engine**: Computes normalized safety risk scores (`0-100`), classification bands (*Low*, *Moderate*, *High*, *Extreme*), and sail/no-sail clearances.
  * **Grounded Multilingual Synthesis**: Produces localized advisories in English, Tamil, Hindi, and other regional coastal languages with zero hallucination tolerance.

* **Live Earth Observation & Ocean Connectors**:
  * **INCOIS OSF**: Real-time wave heights, swell periods, and surface wind velocities.
  * **Copernicus CMEMS**: Multi-layer sea surface temperature (SST) and surface current vectors.
  * **NOAA CoastWatch ERDDAP**: VIIRS daily chlorophyll-*a* concentrations and biological productivity.
  * **IMD Bulletin Feed**: Active cyclone warnings, depression tracks, and meteorological bulletins.
  * **Survey of India & MoEFCC**: Official International Maritime Boundary Line (IMBL) datum and Marine Protected Area (MPA) boundaries.

* **Geospatial Intelligence & Safe Routing**:
  * **A* Nautical Pathfinding**: Calculates optimal sea routes avoiding shallow depths, severe wave hazards, and restricted conservation zones.
  * **Geofence Containment & Watchdog**: Proactively tracks registered vessels and alerts if approaching maritime borders (e.g., IMBL) or storm systems.

* **Cross-Platform Mobile Client (Expo SDK 57)**:
  * **Voice-First Interaction**: Push-to-talk audio input powered by modern `expo-audio`.
  * **Interactive Maritime Maps**: Leaflet WebView map with real-time ocean parameter heatmaps, safe routes, and danger buffers.
  * **Resilient Network Client**: Automatic Metro host discovery, Android emulator bridge (`10.0.2.2`), and LAN IP failover with 90s synthesis timeout.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Mobile Client** | React Native 0.86, Expo SDK 57, React 19, TypeScript, Zustand, Leaflet Map WebView, Expo Audio, Reanimated 4 |
| **Backend Framework** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| **Agentic AI & LLM** | LangGraph, Google GenAI SDK (`google-genai` v2+), Gemini 2.5 Flash |
| **Database & GIS** | Supabase (PostgreSQL 17 + PostGIS), SQLAlchemy 2.0, GeoAlchemy2, Shapely, PyProj, SQLite Spatial Fallback |
| **Data Sources** | INCOIS THREDDS, Copernicus Marine (CMEMS), NOAA CoastWatch, IMD Meteorological Bulletins |

---

## 4. Repository Structure

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

## 5. Quickstart & Setup Guide

### Prerequisites
* **Python 3.11+**
* **Node.js 18+** & **npm**
* **Google Gemini API Key** (for agentic reasoning)
* **Supabase Project** (optional for cloud persistence; local spatial database is built-in)

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
   Edit `.env` with your credentials:
   ```ini
   PORT=8000
   ENVIRONMENT=development
   LOG_LEVEL=INFO

   # Google Gemini AI
   GEMINI_API_KEY=your_actual_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash

   # Database (Supabase or Local SQLite Spatial)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   DATABASE_URL=sqlite:///./app.db
   ```

4. **Initialize database schema and seed boundary zones**:
   ```bash
   python -c "from app.db.init_db import init_db; from app.db.seed_zones import main; init_db(); main()"
   ```

5. **Start the FastAPI server listening on all network interfaces**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * **Interactive Swagger Documentation**: `http://localhost:8000/docs`
   * **Health Check**: `http://localhost:8000/health`

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
   Set your host machine's LAN IP (or leave blank for automatic Metro IP resolution):
   ```ini
   EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LOCAL_IP>:8000
   ```

3. **Start the Expo development server**:
   ```bash
   npx expo start -c
   ```

4. **Run on Device or Simulator**:
   * **Physical Device**: Scan the QR code using the **Expo Go** app on Android/iOS (ensure your phone is connected to the same WiFi network as your computer).
   * **Android Emulator**: Press `a` in the terminal (automatically routes to `http://10.0.2.2:8000`).
   * **Web Preview**: Press `w` in the terminal.

---

## 6. Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/query` | Process marine advisory query through LangGraph multi-agent pipeline. |
| `GET` | `/api/v1/evidence/{query_id}` | Retrieve complete grounding evidence trace, latency breakdown, and sources. |
| `POST` | `/api/v1/route` | Calculate safe nautical navigation path via A* avoidance algorithm. |
| `GET` | `/api/v1/oceanstate` | Retrieve fused multi-source ocean parameters (SST, Waves, Wind, Chlorophyll). |
| `POST` | `/api/v1/watchdog/subscribe` | Register vessel location for proactive geofence monitoring. |
| `GET` | `/api/v1/watchdog/alerts` | Poll real-time boundary proximity or severe weather alerts. |
| `GET` | `/api/v1/sync/payload` | Download offline geospatial bundle for disconnected coastal operation. |

---

## 7. Verification & Testing

* **Backend Test Suite**:
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

---

## 8. License & Acknowledgments

Developed for the **Smart India Hackathon (SIH26176)** in collaboration with the **Indian Space Research Organisation (ISRO)** and the Department of Space. Data services provided by **INCOIS**, **Copernicus Marine Service**, **NOAA CoastWatch**, and **IMD**.
