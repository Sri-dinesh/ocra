# ORCA — Implementation Plan: Akash
## Frontend — Expo React Native Mobile App

**SIH26176 | Reports to: Sridinesh (Lead)**

This is your complete, self-contained task list. Everything you need — tech stack, folder structure, and the exact API response shapes to build against — is frozen in `ORCA_Implementation_Plan_LEAD_Sridinesh.md` (§1, §2, §4). Read that document's §1, §2 (the `mobile/` tree), and §4 once before starting. You don't need to read Sridinesh's or Charan's task lists to do your own work, and you never need their code running to build or demo yours.

**Your independence guarantee:** the entire app is built against **mock JSON files that live inside your own folder** (`mobile/src/api/mock/`), which are byte-identical copies of the response shapes frozen in the lead doc §4. You control a single `USE_MOCK` flag. With it on (the default for your whole build), every screen, loading state, error state, and animation works with zero backend running. When the real backend is ready, flipping the flag to `false` and pointing `API_BASE_URL` at Render is the only change required — no rewrites.

---

## 0. Strategic Objectives & Core Scope

### 0.1 Your Core Objectives (Frontend / Akash):
1. **Conversational Voice-First UX**: Deliver an intuitive mobile chat interface with Push-to-Talk voice recording and multilingual TTS playback in Indian regional languages (Tamil, Hindi, Telugu, English).
2. **"Show the Math" Audit Trace (Judge-Facing Differentiator)**: Implement seamless tap-to-reveal evidence cards linking every recommendation back to authoritative sensor sources.
3. **Interactive Marine Mapping (Zero-Cost)**: Embed Leaflet inside WebView with postMessage JS bridge to visualize PFZ hotspots, SST/chlorophyll heatmaps, IMBL geofences, and A* obstacle-avoiding navigation paths.
4. **Resilient Offline Edge Demo**: Integrate Expo SQLite to cache `/api/v1/sync/payload` and detect connectivity transitions, guaranteeing reliable offline responses during airplane-mode demonstrations.
5. **Proactive Watchdog Alert UI**: Build push notifications and an automatic voice alert overlay for critical proximity warnings ("ORCA talks first").
6. **Multi-Persona Tailoring**: Provide a client-side role picker (Fisherman, Researcher, Coast Guard, Policymaker) without server auth dependencies.

---

## 0.2 Your Scope, Precisely

**You own the entire `mobile/` folder** — nobody else touches it. You don't need permission to restructure anything inside `mobile/`, as long as the final result still runs `npx expo start` cleanly and implements the screens/features below.

**You do NOT touch:** anything under `backend/`. If you need a new field in an API response, don't invent it silently — it means the contract (lead doc §4) is incomplete; flag it to Sridinesh so the doc gets updated and both mock files (`backend/app/mock/*.json` and yours) stay in sync.

---

## 0.3 Git Branching & Workflow for Akash

- **Dedicated Branch Name**: `akash`
- **Base Branch**: `main`

### Branch Setup CLI Commands:
Run these commands in your terminal to start your track:
```bash
# 1. Ensure you are on the latest main baseline
git checkout main
git pull origin main

# 2. Create and switch to your dedicated branch
git checkout -b akash

# 3. Publish your branch to remote
git push -u origin akash
```

### Development & Commit Rules:
1. **Work Only on `akash`**: Never commit to `main`, `sridinesh`, or `charan`.
2. **Commit Daily**: Make small, clear conventional commits (e.g. `feat(chat): build push to talk button`).
3. **Push Daily**: Keep remote branch backed up (`git push origin akash`).
4. **Mock-First Verification**: Complete all screens against `USE_MOCK=true` first, then coordinate with Sridinesh on merge day for live backend testing (`USE_MOCK=false`).

---

## 1. Tech Stack You'll Use

| Layer | Choice |
|---|---|
| Framework | Expo (React Native) + TypeScript |
| State management | Zustand |
| Maps | Leaflet (open-source, free) rendered inside a `react-native-webview`, communicating via `postMessage` |
| HTTP client | axios |
| Voice | Speech-to-Text + TTS — Bhashini API primary; Whisper/Piper fallback if you choose to wire a self-hosted fallback (optional stretch, not required for MVP demo) |
| Notifications | Expo Notifications |
| Offline cache | Expo SQLite |
| Navigation | Expo Router (file-based, matches the `app/` tree in lead doc §2) |

All free — Expo, Leaflet, Bhashini, Expo Notifications, and Expo SQLite all have no-cost paths that fully cover this build.

---

## 2. The Mock-First Workflow (Read This Before Starting Any Screen)

This is the core technique that makes your entire track independent of the backend team.

1. Copy the four example response JSONs from lead doc §4.1–§4.4 into `mobile/src/api/mock/`: `mock_query_response.json`, `mock_route_response.json`, `mock_oceanstate_response.json`, `mock_watchdog_alert.json`.
2. Define TypeScript types in `mobile/src/types/contract.ts` that exactly mirror those JSON shapes.
3. Build `mobile/src/api/client.ts` with a single exported flag `USE_MOCK` (default `true`, read from `.env` via `expo-constants`). Every API function (`queryApi.ts`, `routeApi.ts`, `oceanstateApi.ts`) checks this flag: if `true`, resolve the matching mock JSON after a small artificial delay (e.g. 400–900ms, randomized, to simulate real network latency and let you build honest loading states); if `false`, make the real HTTP call to `API_BASE_URL`.
4. Build every screen against the mock path. Test empty states, error states (you can add a `mock_error` variant), and loading states deliberately — a judge will notice a spinner that never resolves or a screen that breaks on an empty array far faster than they'll notice a missing feature.
5. Only when Sridinesh/Charan confirm a real endpoint is live do you test with `USE_MOCK=false` against it — and by then, because you built against the exact contracted shape, it should just work.

**Do**: keep `contract.ts` as the one place types live — every component imports from there, never redefines its own shape of a query response.
**Don't**: let a screen component reach into a mock JSON file directly — always go through `api/client.ts` so the mock/real switch is invisible to your UI code.

---

## Phase 1 — Project Foundation

**Task A1.1 — Scaffold the Expo app**
- Files/Folders: `mobile/` (entire scaffold), `mobile/package.json`, `mobile/app.json`, `mobile/.env.example`
- Depends on: `main` skeleton pushed by Sridinesh
- Done when: `npx expo start` serves the default app on a device/simulator with no errors, TypeScript is configured (`tsc --noEmit` passes on the scaffold), and Expo Router is set up matching the `app/` tree in lead doc §2.

**Task A1.2 — Set up the tab navigation shell**
- Files/Folders: `mobile/app/(tabs)/_layout.tsx`, `mobile/app/_layout.tsx`
- Depends on: A1.1
- Done when: four tabs are visible and switchable — Chat/Home, Map, Alerts, Profile — each rendering a placeholder screen, matching the lead doc §2 file names (`index.tsx`, `map.tsx`, `alerts.tsx`, `profile.tsx`).

**Task A1.3 — Define the API contract types**
- Files/Folders: `mobile/src/types/contract.ts`
- Depends on: A1.1
- Done when: TypeScript interfaces exist for `QueryRequest`, `QueryResponse`, `EvidenceItem`, `RouteRequest`, `RouteResponse`, `OceanStateResponse`, and `WatchdogAlert`, each field-for-field matching lead doc §4.1–§4.4 (and the sync payload in Charan's doc §6.1, for the offline cache type).

**Task A1.4 — Build the mock API client**
- Files/Folders: `mobile/src/api/client.ts`, `mobile/src/api/mock/*.json`, `mobile/src/api/queryApi.ts`, `mobile/src/api/routeApi.ts`, `mobile/src/api/oceanstateApi.ts`
- Depends on: A1.3
- Done when: calling `queryApi.sendQuery(...)`, `routeApi.getRoute(...)`, and `oceanstateApi.getOceanState(...)` from a throwaway test screen all resolve with correctly-typed mock data after a simulated delay, with `USE_MOCK=true` in `.env`.

**Task A1.5 — Set up Zustand stores (empty shells)**
- Files/Folders: `mobile/src/store/chatStore.ts`, `mobile/src/store/mapStore.ts`, `mobile/src/store/alertStore.ts`, `mobile/src/store/settingsStore.ts`
- Depends on: A1.3
- Done when: each store is defined with its core state shape (see Phase 2–5 for what each holds) and a basic action, and a placeholder screen can read/write to at least one store to confirm wiring works.

---

## Phase 2 — Chat / Home Screen (Core Conversational UX)

**Task A2.1 — Build the chat message list UI**
- Files/Folders: `mobile/src/components/chat/ChatBubble.tsx`, `mobile/app/(tabs)/index.tsx`
- Depends on: A1.2, A1.5
- Done when: `chatStore` holds an array of messages (`{id, role: 'user'|'orca', text, timestamp}`), and the chat screen renders them as bubbles, user-right/orca-left, with auto-scroll to the latest message.

**Task A2.2 — Build the text input and send flow**
- Files/Folders: `mobile/app/(tabs)/index.tsx`
- Depends on: A2.1, A1.4
- Done when: typing a query and pressing send appends a user bubble immediately, shows a loading indicator, calls `queryApi.sendQuery()` (mock), and appends the ORCA response bubble with the returned `recommendation` text once resolved.

**Task A2.3 — Build the risk badge component**
- Files/Folders: `mobile/src/components/common/RiskBadge.tsx`
- Depends on: A1.3
- Done when: given a `risk_band` (`low`/`moderate`/`high`/`extreme`), the component renders a color-coded badge matching the PRD's UI bands (§12: 0–25 low/green, 26–50 moderate/yellow, 51–75 high/orange, 76–100 extreme/red), used inline in the ORCA response bubble.

**Task A2.4 — Build the caveat/disclaimer footer**
- Files/Folders: `mobile/src/components/chat/ChatBubble.tsx`
- Depends on: A2.2
- Done when: every ORCA response bubble that includes a `risk_score` also visibly displays the `caveats` array text (e.g. "Prototype risk score — not an official safety certification"), non-dismissable, per the PRD's safety/trust requirements (§16).

**Task A2.5 — Build role selection (client-side only, no auth)**
- Files/Folders: `mobile/app/(tabs)/profile.tsx`, `mobile/src/store/settingsStore.ts`
- Depends on: A1.5
- Done when: the Profile tab lets the user pick a role (`fisherman`/`researcher`/`coast_guard`/`policymaker`), persists it in `settingsStore`, and every subsequent `queryApi.sendQuery()` call includes the selected role in the request body per lead doc §4.1 — this is the entire "auth" model for MVP, exactly as scoped.

**Task A2.6 — Build multi-turn context handling**
- Files/Folders: `mobile/src/store/chatStore.ts`, `mobile/app/(tabs)/index.tsx`
- Depends on: A2.2
- Done when: asking a follow-up like "what about tomorrow?" after an initial query still includes the previously resolved `location_hint` from the last query in the new request (client-side context carry, since there's no server session) — verified by checking the request payload includes the carried-over location.

---

## Phase 3 — Evidence Trace UI (Judge-Facing "Show the Math" Feature)

**Task A3.1 — Build the evidence card component**
- Files/Folders: `mobile/src/components/chat/EvidenceCard.tsx`
- Depends on: A1.3
- Done when: given an `EvidenceItem[]` array (from `QueryResponse.evidence`), the component renders each item as `claim — source — fetched_at`, formatted for readability, in a scrollable list.

**Task A3.2 — Build "Show the math" tap-to-reveal on chat bubbles**
- Files/Folders: `mobile/src/components/chat/ChatBubble.tsx`, `mobile/src/components/chat/EvidenceCard.tsx`
- Depends on: A3.1, A2.2
- Done when: tapping an ORCA response bubble expands (or navigates to) the evidence trace for that specific `query_id`, sourced first from the response already in memory (no extra API call needed for the just-received answer).

**Task A3.3 — Build the standalone evidence detail screen**
- Files/Folders: `mobile/app/evidence/[queryId].tsx`
- Depends on: A3.1, A1.4
- Done when: navigating to `/evidence/{queryId}` calls a mocked `GET /api/v1/evidence/{query_id}` and renders the full trace matching lead doc §4.2's shape — this is the screen used for the "audit" story in the demo.

**Task A3.4 — Add confidence/quality indicators**
- Files/Folders: `mobile/src/components/chat/EvidenceCard.tsx`
- Depends on: A3.1
- Done when: each evidence item visibly reflects data freshness/quality if present (e.g. a small "stale" tag), and the overall response's `confidence` field is shown prominently at the top of the evidence view.

---

## Phase 4 — Map Screen (Leaflet + WebView)

**Task A4.1 — Build the Leaflet HTML bundle**
- Files/Folders: `mobile/src/components/map/leaflet.html`
- Depends on: A1.1
- Done when: a static HTML file using Leaflet (loaded from a CDN or bundled locally) renders a base map centered on the demo region (e.g. Tamil Nadu/Andhra coast) when opened directly in a browser, with no React Native involved yet.

**Task A4.2 — Wrap it in a WebView with a JS bridge**
- Files/Folders: `mobile/src/components/map/LeafletMapView.tsx`
- Depends on: A4.1
- Done when: the Map tab renders the WebView showing the Leaflet map, and a test message sent from React Native via `postMessage` (e.g. "add a marker at lat/lon") is received by the HTML/JS side and actually adds a marker — confirming the bidirectional bridge works.

**Task A4.3 — Render PFZ candidates and markers from a query response**
- Files/Folders: `mobile/src/components/map/LeafletMapView.tsx`, `mobile/src/store/mapStore.ts`
- Depends on: A4.2, A1.4
- Done when: after a chat query resolves with `map_layers` including `"pfz"`, the map screen shows markers for the mocked PFZ candidate locations, using `mapStore` to hold the current set of layers/markers so the Chat and Map tabs can share state.

**Task A4.4 — Render SST/chlorophyll heatmap overlay (demo-level)**
- Files/Folders: `mobile/src/components/map/leaflet.html`, `LeafletMapView.tsx`
- Depends on: A4.3
- Done when: a simple heatmap or color-graded overlay (Leaflet's heatmap plugin, or even a set of colored circles keyed to mocked SST values) renders over the demo region when `map_layers` includes `"sst_heatmap"` — doesn't need to be scientifically precise, needs to be visually convincing for the demo.

**Task A4.5 — Render geofence/restricted-zone polygons**
- Files/Folders: `mobile/src/components/map/leaflet.html`, `LeafletMapView.tsx`
- Depends on: A4.3
- Done when: mocked IMBL and MPA/restricted polygons render as shaded outlines on the map, matching the coordinates in a mocked `zones`-shaped payload you define locally for this purpose (document this local mock shape in a comment, since Charan owns the real zones table).

**Task A4.6 — Render the A\* route vs. naive straight-line route**
- Files/Folders: `mobile/src/components/map/leaflet.html`, `LeafletMapView.tsx`
- Depends on: A4.5
- Done when: given a mocked `RouteResponse`, the map draws the returned route as a polyline, and — for the specific "naive vs ORCA" demo moment (PRD §22-C, TRD §B.8 step 4) — can also draw a simple straight-line polyline between the same start/goal for visual comparison, toggleable.

**Task A4.7 — Add user/vessel position marker**
- Files/Folders: `mobile/src/components/map/LeafletMapView.tsx`, `mapStore.ts`
- Depends on: A4.3
- Done when: a distinct marker shows the user's/demo vessel's current position on the map, updatable via `mapStore` (fed either by device GPS with `expo-location` or by a manually-set demo position for the Watchdog GPS-drift demo).

---

## Phase 5 — Voice I/O

**Task A5.1 — Build the push-to-talk button and recording flow**
- Files/Folders: `mobile/src/components/chat/PushToTalkButton.tsx`, `mobile/src/voice/stt.ts`
- Depends on: A1.1
- Done when: pressing and holding the mic button records audio (using `expo-av` or equivalent), and releasing it produces a captured audio clip ready to send for transcription.

**Task A5.2 — Wire speech-to-text (Bhashini primary)**
- Files/Folders: `mobile/src/voice/stt.ts`
- Depends on: A5.1
- Done when: `transcribe(audioClip, language) -> string` returns real transcribed text for at least English plus one Indian language (Tamil or Hindi) via the Bhashini API, tested with a real recorded phrase.

**Task A5.3 — Feed transcribed text into the existing chat send flow**
- Files/Folders: `mobile/app/(tabs)/index.tsx`
- Depends on: A5.2, A2.2
- Done when: a voice query goes through the exact same `queryApi.sendQuery()` path as a typed query (transcription is just an alternate input method, not a separate pipeline), with `language` set to the detected/selected language.

**Task A5.4 — Wire text-to-speech for ORCA responses**
- Files/Folders: `mobile/src/voice/tts.ts`
- Depends on: A2.2
- Done when: `speak(text, language)` plays back the ORCA response as audio automatically after it arrives (with a mute/replay control), using Bhashini's TTS or `expo-speech` as an offline-capable fallback.

**Task A5.5 — Add language selector**
- Files/Folders: `mobile/app/(tabs)/profile.tsx`, `settingsStore.ts`
- Depends on: A5.2, A5.4
- Done when: the user can pick a language from a short list (English, Tamil, Hindi at minimum, matching the TRD's demo priority §B.2.9), persisted in `settingsStore` and used for both STT and TTS by default.

---

## Phase 6 — Offline Mode (Edge Agent Demo)

**Task A6.1 — Build the SQLite cache layer**
- Files/Folders: `mobile/src/offline/sqliteCache.ts`
- Depends on: A1.1
- Done when: `saveSyncPayload(payload)` and `getLastSyncPayload() -> payload | null` correctly write to and read from an Expo SQLite table, verified by saving a mocked payload (matching Charan's compact schema, lead doc §6.1) and reading it back after an app restart.

**Task A6.2 — Detect connectivity state**
- Files/Folders: `mobile/src/offline/sqliteCache.ts` or a new `mobile/src/offline/connectivity.ts`
- Depends on: A1.1
- Done when: the app correctly detects online/offline transitions using `@react-native-community/netinfo` (or Expo's equivalent), exposed as a simple boolean/state value other components can read.

**Task A6.3 — Build the offline banner**
- Files/Folders: `mobile/src/components/common/OfflineBanner.tsx`
- Depends on: A6.2, A6.1
- Done when: when offline, a persistent banner reads "OFFLINE — using data synced at HH:MM" with the real timestamp pulled from `getLastSyncPayload()`, matching the PRD's exact offline-mode language (§A.4 Tier 1, item 1 in the TRD).

**Task A6.4 — Build the offline-mode query flow**
- Files/Folders: `mobile/app/(tabs)/index.tsx`, `mobile/src/offline/sqliteCache.ts`
- Depends on: A6.3, A2.2
- Done when: when offline, sending a query answers **only** from the last-synced cached payload's fields (never calls the mock/real API), and explicitly says "I don't have fresh enough data for that offline — last sync was at HH:MM" for anything outside the cached payload's scope, mirroring the TRD's offline guardrail (§B.2.7) at the UI layer.

**Task A6.5 — Build the periodic background sync**
- Files/Folders: `mobile/src/offline/sqliteCache.ts`
- Depends on: A6.1, A1.4
- Done when: while online, the app periodically calls the (mocked, then real) sync payload endpoint and writes the result into SQLite via `saveSyncPayload`, so there's always a reasonably fresh cached payload available before connectivity drops — this is what the offline demo (killing WiFi mid-demo) depends on.

---

## Phase 7 — Proactive Watchdog Alerts (Client Side)

**Task A7.1 — Set up Expo Notifications**
- Files/Folders: `mobile/app/_layout.tsx`, `mobile/src/store/alertStore.ts`
- Depends on: A1.1
- Done when: the app requests notification permissions on first launch and a manually-triggered local test notification appears correctly on a real device/simulator.

**Task A7.2 — Build the alert polling/listener (mocked)**
- Files/Folders: `mobile/src/store/alertStore.ts`
- Depends on: A7.1, A1.4
- Done when: with `USE_MOCK=true`, a simulated trigger (e.g. a debug button, or a timer) produces a mocked `WatchdogAlert` (matching lead doc's `mock_watchdog_alert.json`), which both appends to `alertStore` and fires a local push notification.

**Task A7.3 — Build the auto-playing voice overlay for critical alerts**
- Files/Folders: `mobile/src/components/common/` (new `AlertOverlay.tsx`), `alertStore.ts`
- Depends on: A7.2, A5.4
- Done when: a `critical`-severity alert (e.g. `IMBL_PROXIMITY`, `CYCLONE`) triggers a full-screen red banner overlay that appears **without the user asking anything**, auto-plays the alert message via TTS, and can be dismissed — this is the literal "ORCA talks first" demo moment (PRD/TRD §A.1).

**Task A7.4 — Build the Alerts tab history list**
- Files/Folders: `mobile/app/(tabs)/alerts.tsx`
- Depends on: A7.2
- Done when: the Alerts tab shows a reverse-chronological list of all received alerts (mocked), each showing type, severity, message, and timestamp, tappable to show the associated map location.

---

## Phase 8 — Role-Based Views (Researcher / Coast Guard / Policymaker Stretch)

These are Tier-2/Tier-3 per the PRD — build after Phases 1–7 are solid, using remaining time.

**Task A8.1 — Build a lightweight researcher data view**
- Files/Folders: `mobile/app/(tabs)/index.tsx` (role-conditional rendering) or a new screen
- Depends on: A2.5
- Done when: when `role === "researcher"`, the chat/response UI additionally shows a simple data table view (mocked SST/chlorophyll trend values) alongside the normal evidence trace.

**Task A8.2 — Build a Coast Guard map overlay (mocked AIS)**
- Files/Folders: `mobile/src/components/map/LeafletMapView.tsx`
- Depends on: A4.5, A2.5
- Done when: when `role === "coast_guard"`, the map screen additionally renders mocked vessel markers, with one deliberately placed inside a restricted polygon and visually flagged (e.g. red outline), for the demo script's closing moment (TRD §B.8 step 6).

**Task A8.3 — Build a simple policy brief export view (stretch)**
- Files/Folders: `mobile/app/(tabs)/profile.tsx` or a new screen
- Depends on: A8.1
- Done when: when `role === "policymaker"`, a button generates a shareable text/markdown summary of the current session's evidence and recommendations — a real PDF export is optional/stretch, a shareable text summary is the acceptance bar for MVP.

---

## Phase 9 — Polish, Testing, and Demo Readiness

**Task A9.1 — Error and empty states pass**
- Files/Folders: across all screens
- Depends on: Phases 2–7 complete
- Done when: every screen has been manually tested with a mocked error response and a mocked empty response (no evidence items, no route found, no alerts), and none of them show a blank white screen or an unhandled crash.

**Task A9.2 — Loading state consistency pass**
- Files/Folders: across all screens
- Depends on: A9.1
- Done when: every async action (send query, load evidence, load route, sync payload) shows a clear, consistent loading indicator, and none can be double-triggered by rapid double-tapping.

**Task A9.3 — Offline-to-online transition test**
- Files/Folders: manual test, `mobile/src/offline/`
- Depends on: Phase 6 complete
- Done when: toggling airplane mode mid-session correctly flips the offline banner on, correctly answers a cached-scope query offline, and correctly resumes live behavior when connectivity returns — this is rehearsed exactly as it will be demoed (TRD §B.8 step 3).

**Task A9.4 — Prepare the mock-to-real switch checklist**
- Files/Folders: `docs/API_CONTRACT.md`
- Depends on: A9.1–A9.3
- Done when: a short checklist exists (env var to flip, base URL to set, which endpoints to smoke-test first) so that on merge day, pointing the app at the real backend is a five-minute task, not a debugging session.

---

## Do's and Don'ts — Akash-Specific

**Do**
- Build and demo everything against mock data first — never let your progress be blocked on backend availability.
- Keep `contract.ts` types as the single source of truth for shapes in your codebase; if the backend's real shape ever differs from your mock, that's a contract bug to raise, not something to silently work around in a component.
- Label every mocked/cached value honestly in the UI wherever the design shows real data elsewhere (e.g. the offline banner's synced-at timestamp) — this mirrors the backend's own data-honesty requirements and matters for the demo's credibility.
- Make the "show the math" evidence view fast and prominent — it's explicitly one of the judge-facing differentiators (TRD §A.1, §B.8).
- Test on a real device or simulator regularly, not just in a browser preview — WebView/Leaflet and voice APIs behave differently on-device.

**Don't**
- Don't touch anything under `backend/`.
- Don't hardcode the demo region's coordinates in five different files — keep them in one config/constants file so changing the demo location later is a one-line edit.
- Don't build authentication or login screens — there is none for MVP; role selection is a simple client-side picker only.
- Don't let the offline mode silently fabricate an answer when the cached payload doesn't cover the question — it must explicitly say so, matching the backend's own anti-hallucination stance.
- Don't skip manual testing of the offline/airplane-mode flow — it's a headline demo moment and the easiest one to have quietly break.
