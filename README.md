# ORCA — Marine EcOsystem Reasoning with Collaborative Agents

> **Smart India Hackathon (SIH26176) • Indian Space Research Organisation (ISRO) Department of Space**

ORCA is an Agentic AI-powered conversational marine intelligence and decision-support platform. It fuses heterogeneous Earth Observation, oceanographic, meteorological, and GIS information into an evidence-backed, multi-turn conversational experience with transparent risk evaluation, A* marine pathfinding, and proactive safety monitoring.

---

## 1. System Architecture

```
                                  ┌───────────────────────────────┐
                                  │       Mobile App (Expo)       │
                                  │   Akash • (Chat, Map, Voice)  │
                                  └───────────────┬───────────────┘
                                                  │ HTTP (REST)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      FastAPI Backend API      │
                                  │       Sridinesh (Lead)        │
                                  └───────┬───────────────┬───────┘
                                          │               │
                     ┌────────────────────┴─────┐   ┌─────┴─────────────────────┐
                     │   LangGraph Agent Brain  │   │     Geospatial Engine     │
                     │  Sridinesh • Reasoning   │   │  Charan • PostGIS, A*     │
                     │  Planner / Synthesis /   │   │  Connectors (INCOIS, IMD, │
                     │  Deterministic Guardrail │   │  Copernicus, NOAA, OBIS)  │
                     └──────────────────────────┘   └───────────────────────────┘
```

---

## 2. Repository Structure

```
orca/
├── README.md
├── .gitignore
├── docs/
│   ├── ORCA_SIH26176_Comprehensive_PRD.md
│   ├── ORCA_Implementation_Plan_LEAD_Sridinesh.md
│   ├── ORCA_Implementation_Plan_Charan.md
│   ├── ORCA_Implementation_Plan_Akash.md
│   ├── API_CONTRACT.md              # Single source of truth for API contracts
│   └── DEMO_SCRIPT.md               # Hackathon demo & presentation script
│
├── backend/                         # FastAPI Backend
│   ├── app/
│   │   ├── main.py                  # FastAPI app entrypoint
│   │   ├── core/                    # Config & Logging
│   │   ├── db/                      # Supabase / SQLAlchemy sessions & migrations
│   │   ├── models/                  # SQLAlchemy DB models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── agents/                  # LangGraph multi-agent orchestration
│   │   ├── reasoning/               # Guardrails, risk score, evidence builder
│   │   ├── connectors/              # INCOIS, Copernicus, NOAA, IMD, OBIS adapters
│   │   ├── geospatial/              # Fusion, geofencing, A* pathfinder, cost grids
│   │   ├── watchdog/                # Proactive polling daemon & alerts
│   │   ├── api/v1/                  # API route handlers (/query, /route, /oceanstate, etc.)
│   │   └── mock/                    # Shared mock JSON files
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── mobile/                          # Expo React Native App
    ├── app/                         # Expo Router pages & tabs (Chat, Map, Alerts, Profile)
    ├── src/
    │   ├── components/              # Chat bubbles, Leaflet MapView, RiskBadge, etc.
    │   ├── store/                   # Zustand state stores
    │   ├── api/                     # API client with USE_MOCK fallback & route handlers
    │   ├── offline/                 # Expo SQLite sync cache
    │   ├── voice/                   # Bhashini STT / TTS wrappers
    │   └── types/                   # contract.ts mirroring backend schemas
    ├── app.json
    ├── package.json
    └── .env.example
```

---

## 3. Team Responsibilities & Git Workflow

| Member | Branch | Scope | Owned Directories |
|---|---|---|---|
| **Sridinesh (Lead)** | `sridinesh` | Multi-agent orchestration, Planner, Synthesis, Guardrail, Risk Engine, `/query`, `/evidence` | `backend/app/agents/`, `backend/app/reasoning/`, `backend/app/api/v1/query.py`, `backend/app/api/v1/evidence.py`, `backend/app/core/`, `backend/app/main.py` |
| **Charan** | `charan` | Data connectors, Supabase PostGIS DB & models, A* pathfinder, geofencing, Watchdog daemon, `/route`, `/oceanstate` | `backend/app/db/`, `backend/app/models/`, `backend/app/connectors/`, `backend/app/geospatial/`, `backend/app/watchdog/`, `backend/app/api/v1/route.py`, `oceanstate.py`, `watchdog.py` |
| **Akash** | `akash` | Expo React Native app, Leaflet WebView map, Push-to-Talk voice, Zustand stores, SQLite offline mode, Watchdog alerts UI | `mobile/` (entire mobile tree) |

### Branch Setup CLI Commands (One Branch Per Member)
```bash
# 1. Fetch main baseline
git checkout main
git pull origin main

# 2. Create and switch to your dedicated branch:
git checkout -b sridinesh   # For Lead (Sridinesh)
git checkout -b charan      # For Backend-B (Charan)
git checkout -b akash       # For Frontend (Akash)

# 3. Publish to GitHub:
git push -u origin <branch_name>
```

### Development & Merge Sequence
1. **Isolated Development**: All code is committed to each developer's dedicated branch (`sridinesh`, `charan`, `akash`). No direct pushes to `main`.
2. **Contract-Frozen**: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) defines the shared request/response models.
3. **Merge Sequence (by Lead)**:
   - `charan` → `main` (Connectors, PostGIS, A* Router)
   - Swap temporary agent stubs (`_stubs.py`) with Charan's real modules
   - `akash` → `main` (Mobile App, Leaflet WebView, Voice UI)
   - `sridinesh` → `main` (LangGraph Agents, Guardrails, Risk Engine)
   - Smoke test end-to-end and tag: `git tag v1.0-demo && git push origin --tags`

---

## 4. Quickstart

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI dev server:
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger docs: `http://localhost:8000/docs`

### Mobile Setup
```bash
cd mobile
npm install
cp .env.example .env

# Start Expo dev client:
npx expo start
```
By default, `EXPO_PUBLIC_USE_MOCK=true` allows the full mobile app to run completely independent of the backend.
