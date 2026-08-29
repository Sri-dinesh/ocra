# ORCA — Implementation Plan: Akash
## Frontend Track — Expo React Native Mobile Application (Live Backend Integration)

**SIH26176 | Reports to: Sridinesh (Lead) | Backend Status: 100% Live & Verified on `main`**

---

## 1. Executive Context & Objectives

### 1.1 Core Strategic Objectives for Akash (Frontend Track)
1. **Conversational Voice-First Interface**:
   - Deliver a responsive chat interface with Push-to-Talk (PTT) audio recording and automated Text-to-Speech (TTS) playback in English, Tamil, Hindi, and Telugu.
2. **"Show the Math" Audit Trail (Key Judge-Facing Differentiator)**:
   - Provide an expandable and navigable evidence view linking every recommendation back to real sensor and model providers (`INCOIS OSF`, `Copernicus CMEMS`, `NOAA ERDDAP`, `IMD`, `OBIS`).
3. **Interactive Maritime Leaflet Map (Zero-Cost)**:
   - Embed Leaflet inside a `react-native-webview` via a bidirectional `postMessage` JavaScript bridge to visualize:
     - Real-time A* collision-free navigation routes vs naive straight lines.
     - Potential Fishing Zones (PFZ) pelagic hotspot coordinates.
     - Fused Sea Surface Temperature (SST) thermal boundaries.
     - IMBL boundaries and Marine Protected Area (MPA) polygons.
4. **Resilient Offline Edge Mode (Airplane-Mode Demo)**:
   - Cache the compact (<1KB) `/api/v1/sync/payload` in local Expo SQLite to answer core safety queries and show an explicit offline banner during connectivity outages.
5. **Proactive Watchdog Alert UI ("ORCA Talks First")**:
   - Poll `/api/v1/watchdog/alerts` for active boundary proximity warnings (<2nm from IMBL) and trigger a full-screen emergency audio/visual overlay.
6. **Multi-Persona Tailoring**:
   - Client-side role switcher (Fisherman, Marine Researcher, Coast Guard, Policymaker) altering UI data density without server authentication complexity.

---

## 2. Technical Stack Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Expo (React Native) + TypeScript | Cross-platform mobile runtime (iOS/Android) |
| **Navigation** | Expo Router (File-based) | Routing across `app/(tabs)/` and `app/evidence/` |
| **State Management** | Zustand | Lightweight global stores (`chatStore`, `mapStore`, `alertStore`, `settingsStore`) |
| **Mapping Engine** | Leaflet.js inside `react-native-webview` | Zero-cost vector and tile rendering with JS bridge |
| **HTTP Client** | Axios (`src/api/client.ts`) | Direct live REST communication with FastAPI backend |
| **Voice / Speech** | Bhashini API / `expo-speech` / `expo-av` | Multilingual STT transcription and TTS audio playback |
| **Local Storage** | Expo SQLite (`src/offline/sqliteCache.ts`) | Offline edge sync payload persistence |
| **Push / System Alerts** | Expo Notifications | Local push notifications for background proximity alerts |

---

## 3. Git Branching & Workflow Rules

- **Dedicated Branch**: `akash`
- **Base Branch**: `main` (Already contains the unified, tested backend)

### Setup Commands:
```bash
# 1. Pull latest main
git checkout main
git pull origin main

# 2. Create and switch to your feature branch
git checkout -b akash

# 3. Publish branch to remote
git push -u origin akash
```

### Development Guidelines:
1. Work exclusively inside the `mobile/` directory.
2. Connect to the live backend running locally at `http://localhost:8000` (or `http://10.0.2.2:8000` on Android Emulator, or your machine's LAN IP on physical devices).
3. Commit feature-by-feature using clear conventional commit messages (e.g., `feat(map): render A* route polyline on leaflet`).

---

## 4. Live API Endpoints & Contract Reference

All endpoints are fully operational on `http://localhost:8000`:

| Endpoint | Method | Input Schema | Output Schema | Purpose |
|---|---|---|---|---|
| `/api/v1/query` | `POST` | `QueryRequest` | `QueryResponse` | Main conversational multi-agent reasoning, risk evaluation, and evidence generation |
| `/api/v1/evidence/{query_id}` | `GET` | Path `query_id` | `EvidenceDetailResponse` | Full explainability audit trail and multi-agent plan steps |
| `/api/v1/route` | `POST` | `RouteRequest` | `RouteResponse` | Collision-free A* maritime path calculation avoiding IMBL and MPAs |
| `/api/v1/oceanstate` | `GET` | Query `lat`, `lon`, `time` | `OceanStateResponse` | Fused environmental observation (SST, waves, wind, chlorophyll, currents) |
| `/api/v1/sync/payload` | `GET` | Query `cell` (`lat,lon`) | `SyncPayloadResponse` | Compact offline edge synchronization payload for SQLite |
| `/api/v1/watchdog/subscribe` | `POST` | `SubscribeRequest` | `SubscribeResponse` | Vessel registration for proactive geofence monitoring |
| `/api/v1/watchdog/alerts` | `GET` | Query `vessel_id` (opt) | `WatchdogAlert[]` | Active and historical emergency proximity alerts |
| `/api/v1/watchdog/poll` | `GET` | Query `vessel_id` | `WatchdogPollResponse` | Periodic heartbeat sync for new active alerts |

---

## 5. Detailed Phase-by-Phase Implementation Plan

### Phase 1: Project Foundation, Shell & Navigation
- **Task A1.1 — Expo App & Dependency Verification**
  - Verify `npx expo start` runs cleanly on iOS/Android simulator and web.
  - Ensure dependencies are installed: `axios`, `zustand`, `react-native-webview`, `expo-router`, `expo-speech`, `expo-av`, `expo-sqlite`, `expo-notifications`, `lucide-react-native`.
- **Task A1.2 — Tab Navigation Layout (`app/(tabs)/_layout.tsx`)**
  - Implement bottom tab navigation with 4 tabs:
    1. `index.tsx` (Chat / Home) — Icon: MessageSquare
    2. `map.tsx` (Marine GIS Map) — Icon: Compass / Map
    3. `alerts.tsx` (Watchdog Alerts) — Icon: Bell / AlertTriangle
    4. `profile.tsx` (Persona & Language Settings) — Icon: User / Settings
- **Task A1.3 — Global TypeScript Contracts (`src/types/contract.ts`)**
  - Maintain authoritative interfaces matching `docs/API_CONTRACT.md`:
    - `QueryRequest`, `QueryResponse`, `EvidenceItem`, `LocationHint`
    - `EvidenceDetailResponse`, `RouteRequest`, `RouteResponse`, `Point`
    - `OceanStateResponse`, `SyncPayloadResponse`, `HazardSummary`, `CellPoint`
    - `WatchdogAlert`, `SubscribeRequest`, `SubscribeResponse`
- **Task A1.4 — API Client Services (`src/api/`)**
  - `client.ts`: Axios instance with `baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000'`.
  - `queryApi.ts`: `sendQuery(req)`, `getEvidence(queryId)`.
  - `routeApi.ts`: `getRoute(req)`.
  - `oceanstateApi.ts`: `getOceanState(lat, lon)`, `getSyncPayload(cell)`.
  - `watchdogApi.ts`: `subscribe(req)`, `getAlerts(vesselId)`, `poll(vesselId)`.
- **Task A1.5 — Zustand State Stores (`src/store/`)**
  - `chatStore.ts`: `messages`, `isLoading`, `sendMessage()`, `clearHistory()`.
  - `mapStore.ts`: `selectedRoute`, `pfzPoints`, `activeLayers`, `vesselPosition`, `setRoute()`, `setPFZ()`.
  - `alertStore.ts`: `alerts`, `unreadCount`, `fetchAlerts()`, `dismissAlert()`.
  - `settingsStore.ts`: `role` (`fisherman` default), `language` (`en-IN` default), `vesselId`, `setRole()`, `setLanguage()`.

---

### Phase 2: Conversational Chat Interface & Risk Visuals
- **Task A2.1 — Chat Bubble Component (`src/components/chat/ChatBubble.tsx`)**
  - User messages aligned right (blue background).
  - ORCA responses aligned left (dark navy card) displaying:
    - Main recommendation text.
    - Inline `RiskBadge` component.
    - "Show the Math" tap-to-reveal toggle button.
    - TTS audio speaker icon for one-tap speech playback.
    - Mandatory safety caveat text footer.
- **Task A2.2 — Risk Badge Component (`src/components/common/RiskBadge.tsx`)**
  - Color-coded severity badge based on `risk_band` & `risk_score`:
    - `low` (0–25): Green `#10B981` ("Low Risk — Clear to Sail")
    - `moderate` (26–50): Yellow `#F59E0B` ("Moderate Risk — Caution")
    - `high` (51–75): Orange `#F97316` ("High Risk — Exercise High Caution")
    - `extreme` (76–100): Red `#EF4444` ("Extreme Risk — DO NOT VENTURE")
- **Task A2.3 — Message Stream & Input Box (`app/(tabs)/index.tsx`)**
  - Auto-scrolling `FlatList` of chat messages.
  - Bottom input bar with text input, submit button, and Push-to-Talk microphone button.
  - Smooth loading skeleton while waiting for `/api/v1/query` response.
- **Task A2.4 — Multi-Turn Client Context Handling**
  - Automatically preserve `location_hint` from prior assistant responses when the user submits follow-up queries (e.g. "what about tomorrow morning?").
- **Task A2.5 — Role Switcher (`app/(tabs)/profile.tsx`)**
  - Persona picker cards for:
    - 🎣 **Fisherman**: Simple, actionable recommendations, large fonts, voice-first.
    - 🔬 **Marine Researcher**: Quantitative SST, chlorophyll, and oceanographic metrics.
    - 🛡️ **Coast Guard**: Geofence alerts, boundary distances, and AIS vessel tracks.
    - 📋 **Policymaker**: Summarized regional safety and seasonal advisories.

---

### Phase 3: "Show the Math" Explainability Audit UI
- **Task A3.1 — Inline Evidence Card Component (`src/components/chat/EvidenceCard.tsx`)**
  - Expandable accordion inside the response bubble displaying:
    - Claim title (e.g., "Significant Wave Height: 1.8m").
    - Data source badge (`INCOIS OSF`, `Copernicus CMEMS`, `NOAA ERDDAP`, `IMD`, `OBIS`).
    - Observation timestamp and data freshness quality indicator (`good`, `stale`, `partial`).
- **Task A3.2 — Standalone Audit Detail Screen (`app/evidence/[queryId].tsx`)**
  - Dedicated audit screen navigated from chat:
    - Displays original query text, resolved intent, and location coordinates.
    - Step-by-step multi-agent execution trace (`Planner` -> `Ocean/Weather/GIS` -> `Guardrail` -> `Risk Engine` -> `Synthesis`).
    - Full list of verified evidence citations backing the final decision.

---

### Phase 4: Interactive Marine GIS Map Screen (Leaflet + WebView)
- **Task A4.1 — Leaflet Maritime HTML Bundle (`src/components/map/leaflet.html`)**
  - Bundled OpenStreetMap / CartoDB maritime basemap.
  - Configured with layer groups for routes, markers, heatmaps, and geofences.
  - Scripted `window.addEventListener('message', ...)` to handle React Native commands.
- **Task A4.2 — WebView Map Container (`src/components/map/LeafletMapView.tsx`)**
  - `WebView` wrapper rendering `leaflet.html` with bidirectional `postMessage` bridge.
  - Methods: `drawRoute(waypoints)`, `addPFZMarkers(points)`, `renderGeofences(polygons)`, `setVessel(lat, lon)`.
- **Task A4.3 — Collision-Free A* Route Visualization**
  - When user requests navigation or routes, call `/api/v1/route`.
  - Draw real A* green route polyline avoiding restricted zones.
  - Optional toggle to show the naive red straight-line route intersecting restricted zones for the demo comparison.
- **Task A4.4 — Potential Fishing Zones (PFZ) Overlay**
  - Render high-density pelagic hotspot pins on the map with popup cards showing distance, SST, and chlorophyll levels.
- **Task A4.5 — Geofences & IMBL Exclusion Boundaries**
  - Draw shaded red polygons for the International Maritime Boundary Line (IMBL) buffer and Marine Protected Areas (MPAs) (e.g., Coringa Sanctuary).
- **Task A4.6 — Vessel GPS Drift & Tracking Marker**
  - Pulsing vessel marker displaying real-time coordinates, heading, and distance-to-boundary metrics.

---

### Phase 5: Multilingual Voice I/O & Audio Synthesis
- **Task A5.1 — Push-to-Talk Audio Recording (`src/components/chat/PushToTalkButton.tsx`)**
  - Mic button with haptic feedback and pulsing recording animation using `expo-av`.
  - On release, converts audio clip for transcription.
- **Task A5.2 — Speech-to-Text Integration (`src/voice/stt.ts`)**
  - Transcribes voice input into query text using Bhashini API or local speech recognizer.
- **Task A5.3 — Text-to-Speech Playback (`src/voice/tts.ts`)**
  - Automatically speaks ORCA recommendations in the chosen language (`ta-IN`, `hi-IN`, `te-IN`, `en-IN`) using `expo-speech` with stop/replay controls.
- **Task A5.4 — Language Selector Setting**
  - Language switcher in Profile tab updating `settingsStore.language`.

---

### Phase 6: Edge Offline Mode (Airplane-Mode Demonstration)
- **Task A6.1 — SQLite Cache Engine (`src/offline/sqliteCache.ts`)**
  - Initialize local SQLite table `sync_cache (cell TEXT PRIMARY KEY, payload JSON, updated_at TIMESTAMP)`.
  - Functions: `saveSyncPayload(payload)`, `getCachedPayload(cell)`.
- **Task A6.2 — Connectivity Monitor (`src/offline/connectivity.ts`)**
  - Detect network state changes using `@react-native-community/netinfo`.
- **Task A6.3 — Persistent Offline Banner (`src/components/common/OfflineBanner.tsx`)**
  - When offline, display top banner: `"OFFLINE MODE — Operating on data synced at HH:MM"`.
- **Task A6.4 — Offline Query Evaluation Engine**
  - If offline when user asks a question, answer strictly from cached SQLite values (wave, wind, SST) without crashing, and explicitly state any missing parameters.
- **Task A6.5 — Periodic Background Sync**
  - While online, periodically fetch `/api/v1/sync/payload?cell=16.98,82.24` to keep offline cache primed.

---

### Phase 7: Proactive Watchdog Alerts ("ORCA Talks First")
- **Task A7.1 — Watchdog Polling Service (`src/store/alertStore.ts`)**
  - Poll `/api/v1/watchdog/alerts?vessel_id={id}` every 20–30s in the background.
  - Append new incoming alerts to `alertStore`.
- **Task A7.2 — Emergency Voice Overlay (`src/components/common/AlertOverlay.tsx`)**
  - When an alert with `severity === "critical"` arrives (e.g. `IMBL_PROXIMITY` < 2nm):
    - Trigger full-screen red warning modal.
    - Automatically play audio warning via TTS ("Warning: You are 1.2nm from IMBL. Immediate course correction required!").
    - Provide "View on Map" and "Dismiss" buttons.
- **Task A7.3 — Alerts History Screen (`app/(tabs)/alerts.tsx`)**
  - Reverse-chronological list of active and historical hazard warnings with severity badges and timestamps.

---

### Phase 8: Role-Specific Specialized Views
- **Task A8.1 — Marine Researcher Quantitative View**
  - When `role === 'researcher'`, show structured tables for SST anomaly and chlorophyll-a trends.
- **Task A8.2 — Coast Guard Patrol View**
  - When `role === 'coast_guard'`, show active vessels on map with flagged boundary breach alerts.

---

### Phase 9: Final Polish & Demo Rehearsal
- **Task A9.1 — Error & Empty States Handling**
  - Test all screens against offline drops, invalid inputs, and API timeouts.
- **Task A9.2 — Airplane Mode Transition Rehearsal**
  - Rehearse live demo flow: Online Chat -> Leaflet Map -> Toggle Airplane Mode -> Offline Query with Banner -> Toggle Online -> Watchdog Emergency Alert overlay.

---

## 6. Do's and Don'ts for Akash

### Do:
- Connect directly to `http://localhost:8000` (or `10.0.2.2` on Android).
- Maintain all types in `src/types/contract.ts`.
- Make the "Show the Math" evidence cards prominent and easy to expand.
- Rehearse the Airplane Mode offline demonstration thoroughly.

### Don't:
- Do not edit files outside of `mobile/`.
- Do not hardcode static mock strings in UI components — use the live API endpoints.
- Do not build complex user authentication forms — persona selection is client-side.
