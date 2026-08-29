# ORCA — SIH Demo Script & Presentation Flow

## Overview
This document outlines the step-by-step demonstration walkthrough for the Smart India Hackathon (SIH26176) presentation of **ORCA (Marine EcOsystem Reasoning with Collaborative Agents)**.

---

## 1. Demo Narrative Arc
- **Target Persona**: Coastal Fisherman (Ramesh from Kakinada / Rameswaram) & Coast Guard / Coastal Authority Officer.
- **Core Value Proposition**: Turning fragmented marine, meteorological, and GIS data into an intuitive, evidence-backed, multi-turn conversational intelligence system that proactively protects marine lives and optimizes navigation.

---

## 2. Step-by-Step Demo Sequence

### Step 1: Natural Language Query with Indian Regional Voice I/O
- **Action**: User taps the Push-to-Talk button or types: *"Can I go fishing tomorrow morning near Kakinada?"* (in Tamil/Hindi/English).
- **Backend Flow**:
  - Request hits `POST /api/v1/query`.
  - Planner Agent extracts entities: `intent="sail_clearance"`, `location={"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"}`, `time_window="tomorrow morning"`.
  - Parallel sub-agents fetch ocean conditions (INCOIS OSF), weather bulletins (IMD), and GIS boundaries.
  - Guardrail validates all numeric claims against raw sources.
  - Risk Engine computes composite safety risk score (e.g. 22 / Low).
  - Synthesis agent formats localized voice & text response.
- **Judge Highlight**: Fast response with grounded numbers, transparent risk band, and immediate regional TTS playback.

### Step 2: "Show the Math" — Evidence & Audit Trace
- **Action**: User taps the response bubble to reveal the full Evidence Card.
- **Judge Highlight**: Every number in the advice cites its origin (`INCOIS OSF`, `IMD`, `Copernicus CMEMS`) with precise timestamps and confidence ratings. Proves anti-hallucination guardrail in action.

### Step 3: Marine Map & A* Pathfinder vs. Naive Route
- **Action**: Switch to the Map tab.
- **UI Elements**:
  - PFZ (Potential Fishing Zone) overlay with SST & Chlorophyll-a gradients.
  - Geofenced polygons (IMBL & Gulf of Mannar MPA).
  - A* Obstacle-avoidance route bent cleanly around restricted zones compared side-by-side with a naive straight-line route crossing the IMBL.
- **Judge Highlight**: Demonstrates custom A* pathfinding over cost grids with real marine safety constraints.

### Step 4: Edge Offline Resilience (Disconnect WiFi)
- **Action**: Toggle device/simulator into Airplane Mode / Offline.
- **UI Element**: Persistent top banner flips to: `"OFFLINE — using data synced at 06:00 IST"`.
- **Query**: User asks a query on cached coordinates. System responds purely from local SQLite sync cache without server dependency.
- **Query Out of Scope**: User asks about an uncached remote zone; system honestly clarifies data is unavailable offline rather than hallucinating.

### Step 5: Proactive Watchdog Alert ("ORCA Speaks First")
- **Action**: Watchdog daemon simulates GPS drift approaching within 1.2nm of the IMBL.
- **UI Element**: Full-screen high-priority alert overlay pops up automatically without user prompt: `"CRITICAL ALERT: IMBL Proximity Warning - Course correction recommended"`.
- **Judge Highlight**: Proactive safety intervention rather than passive Q&A.

### Step 6: Coast Guard / Policy View (Multi-Role Support)
- **Action**: Switch role to `Coast Guard` in Profile settings.
- **UI Element**: Map view reveals simulated AIS vessel cluster, highlighting vessels entering restricted areas.
