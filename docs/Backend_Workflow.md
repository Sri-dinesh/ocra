# ORCA — Backend Workflow & System Architecture
## Complete Technical Reference: Agents, Data Flow, Reasoning Pipeline, Database

**SIH26176 | Owner: Sridinesh (Lead) | Companion to: `ORCA_Implementation_Plan_LEAD_Sridinesh.md`, `ORCA_Implementation_Plan_Charan.md`, `docs/API_CONTRACT.md`**

This document is the definitive explanation of *how the ORCA backend actually works* — not task checklists, but the reasoning behind every moving part: what each component's job is, why it exists, exactly how data flows through it, what every agent's prompt should contain, and how failure is handled at every stage. Read this alongside the implementation plans; those tell you *what to build and in what order*, this tells you *why it's built that way and how it behaves once it's running*.

It also contains a corrected, fully relational database schema (§7) replacing the flat, unrelated tables in the original lead doc. **Read §7 before writing any SQLAlchemy model** — it changes column names, adds foreign keys, and introduces two new tables (`sources`, `evidence_items`) that the original schema was missing.

---

## 1. What the Backend Is Actually For

ORCA's backend is not a REST wrapper around a database. It is a **reasoning pipeline** that takes an ambiguous, natural-language marine question and turns it into a numerically grounded, source-attributed, safety-constrained answer — in a form that can survive being questioned line by line by a judge, a fisherman, or a coast guard officer.

Every design decision in this backend serves one of four objectives. Every agent, table, and endpoint below should be traceable back to one of these:

**Objective 1 — Understand the question correctly.**
A fisherman doesn't say "give me `wave_height_m` for cell (16.98, 82.24) at 2026-08-29T06:00Z." They say "can I go out tomorrow morning near Kakinada?" The backend must reliably turn that into a structured plan: what intent, what location, what time window, what data domains are actually relevant. Getting this wrong means everything downstream is wrong, no matter how good the reasoning is.

**Objective 2 — Never state a number the system didn't actually retrieve.**
This is the single hardest constraint on the whole system, and the one most demo marine-AI projects fail. An LLM asked to "explain the sea conditions" will happily invent a plausible wave height if it isn't forcibly prevented from doing so. ORCA's entire reasoning layer is built around one rule: **the LLM is allowed to plan and explain, never to originate a number**. Every numeric claim in a response must trace back, byte-for-byte, to a value that was actually fetched from a real (or clearly labeled mock) data source.

**Objective 3 — Let deterministic logic own safety, not the LLM.**
Whether a cyclone warning blocks a "go fishing" recommendation is not a judgment call the language model gets to make contextually. It is a hard rule: if a critical hazard is active, the answer is no, full stop, regardless of what a weighted risk score says. Deterministic code owns this decision; the LLM only explains it in natural language afterward.

**Objective 4 — Make every answer auditable.**
Every response the system gives must be traceable, after the fact, to exactly what data it used, where that data came from, when it was fetched, and how fresh it was. This isn't a nice-to-have "evidence view" bolted onto the UI — it is the backend's actual output artifact. The natural-language recommendation is a rendering of the evidence trace, not the other way around.

Everything in the sections below exists to serve one of these four objectives. If you're ever unsure why a component works the way it does, check which objective it's protecting.

---

## 2. High-Level System Architecture

```
                                   ┌─────────────────────────────┐
                                   │   Mobile App (Akash)        │
                                   │   text or voice query        │
                                   └──────────────┬───────────────┘
                                                  │ POST /api/v1/query
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI APPLICATION LAYER                          │
│  (backend/app/api/v1/*.py — request validation, response shaping)            │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      LANGGRAPH ORCHESTRATION LAYER                           │
│                      (backend/app/agents/graph.py)                           │
│                                                                                │
│   ┌──────────────┐                                                           │
│   │ PLANNER AGENT │──── clarification_needed? ──► short-circuit response     │
│   └──────┬────────┘                                                          │
│          │ intent + location + time_window + required_agents                │
│          ▼                                                                    │
│   ┌──────────────────────────── parallel fan-out ─────────────────────────┐  │
│   │  OCEAN AGENT        WEATHER/HAZARD AGENT       GIS AGENT              │  │
│   │  (Charan's fusion)  (Charan's IMD connector)   (Charan's geofence)    │  │
│   └──────────────────────────────┬────────────────────────────────────────┘  │
│                                   │ raw fused data (never shown to user yet)  │
│                                   ▼                                          │
│                     ┌──────────────────────────┐                            │
│                     │  DETERMINISTIC GUARDRAIL   │                           │
│                     │  (validates every value,   │                          │
│                     │   flags stale/missing)     │                          │
│                     └────────────┬───────────────┘                          │
│                                   ▼                                          │
│                     ┌──────────────────────────┐                            │
│                     │  RISK & RECOMMENDATION     │                          │
│                     │  ENGINE (deterministic)    │                          │
│                     │  — hazard hard-override —  │                          │
│                     └────────────┬───────────────┘                          │
│                                   ▼                                          │
│                     ┌──────────────────────────┐                            │
│                     │  SYNTHESIS AGENT (LLM)     │                          │
│                     │  explains guardrail-passed │                          │
│                     │  evidence only, re-checked │                          │
│                     └────────────┬───────────────┘                          │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                    ▼
                     ┌──────────────────────────┐
                     │  EVIDENCE TRACE BUILDER    │
                     │  + persist to query_logs   │
                     └────────────┬───────────────┘
                                   ▼
                     Response → Mobile App
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER (Supabase)                               │
│   PostgreSQL + PostGIS — ocean_states, zones, hazards, sources,              │
│   evidence_items, query_logs, plan_steps, vessels, watchdog_alerts           │
│   (fully relational — see §7)                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ writes (fetched + normalized data)
┌──────────────────────────────────┴───────────────────────────────────────────┐
│                    DATA CONNECTOR LAYER (Charan)                             │
│   INCOIS PFZ · INCOIS OSF · Copernicus CMEMS · NOAA ERDDAP · IMD · OBIS      │
│   each isolated behind a common interface, each fails independently          │
└────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────────┐
                    │  WATCHDOG DAEMON (Charan)                  │
                    │  runs independently of the request/response│
                    │  cycle above — polls vessel positions on a │
                    │  timer, checks hazard/geofence conditions,  │
                    │  writes watchdog_alerts, pushes to mobile   │
                    └──────────────────────────────────────────┘
```

Two things to notice about this diagram, because they're easy to get wrong:

1. **The LangGraph pipeline is entirely synchronous per-request** (a user asks something, the graph runs once, a response comes back). **The Watchdog is entirely asynchronous and request-independent** (it runs on its own clock, regardless of whether anyone is actively chatting). These are two separate execution models sharing the same data layer — don't try to route Watchdog alerts through the query graph, and don't try to make the query graph poll continuously.

2. **Nothing between the Planner and the Synthesis Agent is allowed to talk to the user directly.** Everything in the middle — Ocean/Weather/GIS agents, Guardrail, Risk Engine — produces structured data only. The *only* component that generates the natural-language text the user reads is the Synthesis Agent, and even it is re-validated by the Guardrail's claim-checker before its output is allowed out (§5.5).

---

## 3. Data Flow — Walking Through One Real Request

Trace a single query end to end so every component's role is concrete, not abstract.

**User asks (voice, transcribed by Akash's app):** *"Can I go fishing tomorrow morning near Kakinada?"*

**Step 1 — Request lands.** `POST /api/v1/query` receives `{text, location_hint, role, language}`. FastAPI validates the shape against the Pydantic schema (`backend/app/schemas/query.py`) and hands it to the LangGraph pipeline as a fresh `AgentState`.

**Step 2 — Planner Agent runs.** Calls Gemini with a structured-output prompt (§5.1). Extracts: `intent="sail_clearance"`, `location={16.9891, 82.2475}` (resolved from "Kakinada" — using `location_hint` if present, otherwise the LLM's own geocoding knowledge, verified against a small known-places lookup so it doesn't hallucinate coordinates), `time_window={2026-08-29T00:00 to 12:00 IST}` (interpreting "tomorrow morning"), `required_agents=["ocean","weather","gis"]`.

**Step 3 — Fan-out to domain agents (parallel).** The graph dispatches three calls concurrently:
- **Ocean Agent** calls `fusion.fuse(lat, lon, time_window)` (Charan's code) → SST, chlorophyll, wave height, current data, each tagged with its source and fetch timestamp.
- **Weather/Hazard Agent** calls the IMD connector → checks for active cyclone/high-wave/lightning bulletins covering this cell and time window.
- **GIS Agent** calls `geofence.check_point(lat, lon)` → confirms the point isn't inside a restricted zone, and computes distance to the nearest IMBL point.

None of these three agents call the LLM. They are thin orchestration wrappers around Charan's deterministic connector/geospatial functions. Their only "intelligence" is deciding *which* connector functions to call based on `required_agents` — the actual data retrieval is pure code, not a language model.

**Step 4 — Guardrail runs.** Every value returned in Step 3 is checked: does this value actually exist in what was fetched (not fabricated by a bug or a bad merge), and is it fresh enough (`valid_time` within the configured max-age window)? Anything stale gets flagged, not hidden. Anything missing produces an explicit "no data for X" marker rather than a silent gap.

**Step 5 — Risk Engine runs.** Computes a weighted `risk_score` from wave height, wind, hazard severity, and distance-to-boundary. Checks the hazard hard-override: is there an active cyclone or critical-severity hazard in the evidence? If yes, `sail_clearance=False` regardless of the numeric score. This step never touches the LLM.

**Step 6 — Synthesis Agent runs.** Receives the guardrail-validated evidence (a clean list of `{claim, value, source, fetched_at}` objects) plus the risk score/band/clearance decision. Its job is purely to phrase this as natural, helpful language — it is explicitly forbidden from adding any number, place, or fact not already present in what it was handed. Its output claims are re-validated against the same evidence list (Step 4's validator, run again) before being accepted.

**Step 7 — Evidence trace assembled and persisted.** The final response object (matching `API_CONTRACT.md` §3.1) is built, a `query_logs` row is written along with related `plan_steps` and `evidence_items` rows (§7's relational design), and the response is returned to the mobile app.

**Step 8 — Mobile app renders.** Akash's app shows the recommendation, risk badge, and — on tap — the full evidence trace, each item individually sourced and timestamped.

At no point in this flow does an LLM call produce a number that reaches the user without having first been checked against real fetched data. That's the whole point of the architecture.

---

## 4. Component Responsibilities — What Each Piece Does and Does Not Do

| Component | Does | Never Does |
|---|---|---|
| **Planner Agent** | Extracts intent, location, time window; decides which domain agents are needed; asks for clarification when critical info is missing | Fetch any actual marine data; guess a location with no basis; proceed on an ambiguous query without flagging it |
| **Ocean / Weather / GIS Agents** | Call Charan's deterministic connector/fusion/geofence functions; pass results into shared state | Call the LLM; transform or "interpret" values; silently substitute a default when a fetch fails |
| **Guardrail** | Validates every numeric claim against real source data; flags staleness; produces explicit missing-data markers | Let an unsupported claim pass silently; auto-correct a bad value (it flags, it doesn't guess a fix) |
| **Risk & Recommendation Engine** | Computes the weighted risk score; applies hazard hard-overrides; ranks PFZ candidates; decides sail-clearance | Use the LLM for any part of the score or override decision; let a low numeric score override an active hazard flag |
| **Synthesis Agent** | Turns guardrail-passed evidence into natural language, in the requested language; formats claims for the evidence trace | Introduce any fact, number, or place not already in the evidence it was given; make the sail-clearance call itself (it explains a decision the Risk Engine already made) |
| **Evidence Trace Builder** | Assembles the final structured response + persists the full audit trail relationally | Discard or summarize away individual evidence items — every claim shown to the user must have a corresponding stored row |
| **Watchdog Daemon** | Polls vessel positions and hazard/geofence state on its own clock; triggers alerts; de-duplicates repeat triggers | Run inside the request/response cycle; depend on a user having an open query session |

---

## 5. Agent Prompts — Full Detail

This is the actual prompt engineering contract for each LLM-backed agent. These aren't suggestions — they encode Objective 2 and Objective 3 from §1 directly into the prompt text, because relying on "the model will probably behave" is not acceptable for a safety-adjacent system.

### 5.1 Planner Agent Prompt

**Purpose:** structured extraction only. Temperature should be low (0–0.2) — this is not a creative task.

**System prompt:**
```
You are the Planner component of ORCA, a marine decision-support system. Your only
job is to convert a user's natural-language marine question into a structured plan.
You do not answer the question. You do not know any current ocean, weather, or
hazard data — you have no access to it and must never invent it.

Given the user's query, a role, a language, and an optional location hint, extract:

1. intent — exactly one of:
   - "sail_clearance" (can I go out / is it safe to fish / go to sea)
   - "pfz_lookup" (where is the best/nearest fishing zone)
   - "anomaly_detection" (why did catch/productivity change / trend questions)
   - "route_request" (give me a route / path to a location)
   - "general_query" (conditions lookup, definitions, anything not above)
   - "clarification_needed" (the query is too ambiguous to proceed — see rule below)

2. location — {lat, lon, resolved_name}. Prefer location_hint if provided. If the
   query names a place with no location_hint, resolve it only if you are confident
   of real-world coordinates for a well-known Indian coastal location; otherwise
   set intent to "clarification_needed".

3. time_window — {start_iso, end_iso} in IST. Interpret relative expressions
   ("tomorrow morning", "next 6 hours", "today") relative to the provided
   current_datetime. "Morning" = 06:00–12:00 IST unless otherwise specified.

4. required_agents — subset of ["ocean", "weather", "gis"], based on intent:
   - sail_clearance → ["ocean", "weather", "gis"]
   - pfz_lookup → ["ocean", "weather", "gis"]
   - anomaly_detection → ["ocean"]
   - route_request → ["gis"]
   - general_query → whichever of the three the query concerns

HARD RULE: if you cannot confidently resolve BOTH a location and a time window
(where the intent requires them), you MUST set intent to "clarification_needed"
and required_agents to []. Do not guess a plausible-sounding location or time.
Guessing here causes the system to fetch data for the wrong place, which is a
safety failure, not a UX inconvenience.

Respond ONLY with a single JSON object matching this exact schema. No prose,
no markdown fences, no explanation outside the JSON.

{
  "intent": "...",
  "location": {"lat": 0.0, "lon": 0.0, "resolved_name": "..."} | null,
  "time_window": {"start_iso": "...", "end_iso": "..."} | null,
  "required_agents": ["..."],
  "clarification_prompt": "..." | null
}
```

**User message template:**
```
current_datetime: {current_datetime_iso}
role: {role}
language: {language}
location_hint: {location_hint_json_or_null}
query: "{raw_query}"
```

### 5.2 Ocean / Weather / GIS Agents — No Prompts

Deliberately excluded from this section because these three agents **do not call an LLM at all**. They are orchestration wrappers that call Charan's connector/fusion/geofence functions directly with the `location` and `time_window` from the Planner's output. Treating them as "agents" in the LangGraph sense (graph nodes) is correct; treating them as prompt-driven components is not — that would reintroduce exactly the hallucination risk the whole architecture is built to avoid. Keep them as pure code.

### 5.3 Guardrail — No Prompt (Deterministic)

The Guardrail is pure Python, not an LLM call. Its logic:

```
For each candidate claim the pipeline is about to make (e.g. "wave height is 1.8m"):
    1. Look up the supporting numeric value in the actual fetched source_data dict.
    2. If it is not present, or does not match within tolerance → flag UNSUPPORTED_CLAIM.
    3. If the underlying value's valid_time is older than max_age_hours (default 6h
       for forecasts, 24h for hazard bulletins unless the bulletin states otherwise)
       → flag STALE_DATA, but still surface the value WITH the staleness caveat
       (never silently hide old data — the PRD requires visible freshness, not
       suppression).
    4. If a required field is entirely missing (connector failed / returned None)
       → flag MISSING_DATA, and the Synthesis Agent must say so explicitly rather
       than omitting the topic silently.
```

This step existing as deterministic code (not a prompt) is itself an architectural decision worth stating plainly: **you cannot prompt your way to guaranteed non-hallucination.** You can only structurally prevent the LLM from being the source of truth for any number. That's what this component does.

### 5.4 Risk & Recommendation Engine — No Prompt (Deterministic)

Also pure Python — a weighted formula plus hard-override rules, not an LLM call. Formula sketch (weights configurable in `core/config.py`, tune during testing against the eval set):

```
risk_score = clamp(
    w_wave  * normalize(wave_height_m, 0, 4)      +
    w_wind  * normalize(wind_speed_kt, 0, 40)     +
    w_dist  * (1 - normalize(distance_to_imbl_nm, 0, 50)) +
    w_hazard * hazard_severity_weight(severity),   # 0 if none, up to 1 for critical
    0, 100
)

# Hard override — evaluated AFTER the score, and wins regardless of score value:
if active_hazard.severity in ("critical",) or active_hazard.hazard_type == "cyclone":
    sail_clearance = False
elif geofence_violation:
    sail_clearance = False
else:
    sail_clearance = risk_score < HIGH_RISK_THRESHOLD  # e.g. 75
```

Default suggested weights: `w_wave=0.35, w_wind=0.25, w_dist=0.15, w_hazard=0.25` — tune against real demo-region data during Phase 8 testing, but the *hard override always wins over the weighted score* is not tunable; it is a fixed safety rule per Objective 3.

### 5.5 Synthesis Agent Prompt

**Purpose:** natural-language explanation of already-decided facts. Temperature can be a little higher (0.3–0.5) for natural phrasing, but structure is still enforced via strict output schema.

**System prompt:**
```
You are the Synthesis component of ORCA. You explain marine decision-support
results to the user in clear, natural language. You are NOT permitted to state
any number, place name, or fact that is not explicitly present in the
evidence_items you are given below. If you are unsure whether a detail is
supported, leave it out rather than guess.

You will receive:
- The original query and detected intent
- A sail_clearance decision (true/false) and a risk_score/risk_band —
  these were already decided by deterministic logic; you explain them,
  you do not recompute or second-guess them
- A list of evidence_items, each with: claim_text, source, fetched_at, quality
- A list of caveats that must be included in your response, verbatim in meaning
- The target response language

Your job:
1. Write a short, direct recommendation sentence a fisherman or operator would
   actually find useful — lead with the decision, not a data dump.
2. Reference the 2-4 most decision-relevant evidence items in plain language.
3. If any evidence_item has quality="stale" or quality="missing", say so
   plainly (e.g. "wave data is a few hours old" or "no current cyclone bulletin
   was available for this area, so treat this with extra caution").
4. Include the required caveats near the end, in the target language.
5. Respond in {language}. If you cannot produce fluent output in that language,
   respond in English and note that translation to {language} was unavailable.

Respond ONLY with a single JSON object matching this exact schema:
{
  "recommendation_text": "...",
  "referenced_claims": [
    {"claim_text": "...", "supporting_evidence_item_id": "..."}
  ]
}

Every entry in referenced_claims MUST correspond exactly to text that also
appears in evidence_items you were given — do not add, round, or restate a
number differently than it was given to you.
```

**Post-generation re-validation (code, not prompt):** every `referenced_claims[i].supporting_evidence_item_id` is checked against the actual `evidence_items` list passed in. Any claim whose referenced ID doesn't exist, or whose `claim_text` doesn't match the stored evidence item closely enough, is stripped from `recommendation_text` before the response is returned. This is Task S5.2 from the lead implementation doc, and it's non-negotiable — the prompt reduces the chance of a violation, the code guarantees it can't reach the user.

### 5.6 Voice/Language Handling Note

Language handling for MVP is intentionally simple: Gemini's own multilingual generation handles Tamil/Hindi output directly in the Synthesis prompt (§5.5) rather than a separate translation call — one fewer moving part, one fewer place for meaning to drift. If quality for a given language is poor during testing, fall back to English with a note, rather than shipping a mistranslated safety-relevant sentence.

---

## 6. Failure Modes and How the Backend Handles Each

This section exists because a marine safety tool that fails silently is worse than one that's slow. Every failure mode below must degrade *honestly*, never invisibly.

| Failure | Backend Behavior |
|---|---|
| A connector (e.g. Copernicus) times out or errors | Returns `None` at the connector boundary (never an unhandled exception); fusion layer records the field as missing; Guardrail flags `MISSING_DATA`; Synthesis Agent explicitly says that data type was unavailable |
| Planner can't resolve location or time | `intent="clarification_needed"`; pipeline short-circuits before any domain agent runs; response asks the user for the missing detail |
| Gemini API call fails/times out (Planner or Synthesis) | Retry once with backoff; on second failure, Planner falls back to a template clarification response; Synthesis falls back to a deterministic template response built directly from the evidence_items (no LLM phrasing, just structured facts) rather than returning an error to the user |
| A hazard is active but ocean/weather data is otherwise missing | The hazard hard-override still applies — `sail_clearance=False` is returned even with incomplete supporting ocean data, because hazard precedence does not require complete data to act on |
| Guardrail flags an unsupported claim from the Synthesis Agent | Claim is silently stripped from the response text (not shown, not replaced with a placeholder); logged internally for prompt-quality monitoring |
| Database write fails (Supabase unreachable) | The computed response is still returned to the user (the reasoning pipeline does not depend on successful persistence); the failure is logged; evidence for that specific query simply won't be retrievable later via `/evidence/{query_id}` — acceptable degradation, not a blocking failure |
| Watchdog daemon can't reach a data source mid-poll | Skips that tick for that vessel, logs it, retries next interval — never crashes the daemon loop for one bad tick |

---

## 7. Corrected Database Schema — Fully Relational

### 7.1 What Was Wrong With the Original Schema

The schema in the original lead doc had five tables that didn't reference each other at all:

- `ocean_states`, `zones`, and `hazards` had no foreign keys to anything — they were just flat rows in space.
- `query_logs` stored `plan_json` and `evidence_json` as opaque `jsonb` blobs. This means the plan and the evidence trace are **not queryable relationally** — you can't ask "show me every query where a stale-SST evidence item was used" without parsing JSON inside every row. It also means there's no single canonical place that defines what a "source" is — `source_map` in `ocean_states` and `source` in `hazards` and `source` in `zones` were three separate free-text fields with no shared vocabulary, so "INCOIS OSF" could be spelled three different ways in three different tables with nothing enforcing consistency.
- There was no table modeling a Watchdog **alert** as a real, queryable, historical record — alerts only existed as an ephemeral JSON payload pushed to the client and never durably stored, so "show me the alert history for this vessel" (a real feature, Akash's Alerts tab) had nothing to query against.
- There was no explicit link between a `vessel` and its Watchdog subscription, or between an alert and the specific `hazard`/`zone` row that triggered it.

None of this would break a demo built quickly with hardcoded mocks, but it's the kind of shortcut that makes "production grade" not true, and it makes several real features (evidence audit, alert history, cross-query analytics) either impossible or painfully manual. Below is the corrected version.

### 7.2 Corrected Schema — Entity Relationship Overview

```
sources ──────────────┬────────────────┬───────────────────┐
   │                   │                │                    │
   │(1:N)              │(1:N)           │(1:N)                │(1:N)
   ▼                   ▼                ▼                    ▼
ocean_states        hazards          zones              evidence_items
   │                   │                                      ▲
   │(N:1, nullable)     │(N:1, nullable)                        │(1:N)
   └───────────┬────────┘                                       │
               ▼                                                 │
        watchdog_alerts ──(N:1)──► vessels                       │
                                       │                          │
                                       │(1:N)                     │
                                       ▼                          │
                              watchdog_subscriptions               │
                                                                    │
query_logs ──(1:N)──► plan_steps                                   │
    │                                                               │
    └──────────────────────(1:N)────────────────────────────────────┘
```

### 7.3 Table Definitions

#### `sources` (NEW — canonical source vocabulary)

Every other table that currently has a free-text `source` field now references this table instead. This single change is what makes provenance actually queryable and consistent across the whole system.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `code` | text, unique, not null | short stable identifier, e.g. `incois_osf`, `copernicus_cmems`, `imd_bulletin`, `noaa_erddap`, `incois_pfz`, `obis` |
| `display_name` | text, not null | e.g. `"INCOIS Ocean State Forecast"` — what the UI shows |
| `provider_org` | text | e.g. `"INCOIS"`, `"IMD"`, `"Copernicus Marine Service"` |
| `access_method` | text | `api` / `wms` / `bulk_download` / `mock` — filled in per Charan's Task C2.2 |
| `is_mock` | boolean, default false | `true` for the demo-fallback synthetic source, so mock data is always structurally distinguishable from real data, not just labeled by convention |

**Seed this table first**, before any connector writes a single row anywhere else — every other table's `source_id` foreign key depends on these rows existing.

#### `ocean_states` (revised)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `geom` | geometry(Point, 4326), not null | GIST-indexed |
| `lat`, `lon` | float8, not null | denormalized for easy reads without `ST_X`/`ST_Y` |
| `valid_time` | timestamptz, not null | |
| `fetched_at` | timestamptz, not null | |
| `sst_c` | float8, nullable | |
| `sst_source_id` | uuid, FK → `sources.id`, nullable | **replaces the old flat `source_map` field for this attribute** |
| `chl_a_mgm3` | float8, nullable | |
| `chl_source_id` | uuid, FK → `sources.id`, nullable | |
| `wave_height_m` | float8, nullable | |
| `wave_source_id` | uuid, FK → `sources.id`, nullable | |
| `wind_speed_kt` | float8, nullable | |
| `wind_source_id` | uuid, FK → `sources.id`, nullable | |
| `current_speed_ms` | float8, nullable | |
| `current_dir_deg` | float8, nullable | |
| `current_source_id` | uuid, FK → `sources.id`, nullable | |
| `quality` | text, not null, check in (`good`,`stale`,`partial`) | |

**Why per-field source FKs instead of one `source_map` jsonb:** a single `ocean_states` row is genuinely fused from multiple providers (SST from Copernicus, waves from INCOIS). A single `source_id` column can't represent that; the old `source_map` jsonb *could* represent it but wasn't queryable or FK-constrained. Explicit per-field FK columns give you both: correct multi-provenance representation, and a real foreign key Postgres can enforce and you can join on (e.g. "show me every ocean_state where `wave_source_id` pointed at a source currently `is_mock=true`").

#### `zones` (revised)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text, not null | |
| `zone_type` | text, not null, check in (`imbl`,`mpa`,`restricted`,`pfz`) | |
| `geom` | geometry(Polygon, 4326), not null | GIST-indexed |
| `source_id` | uuid, FK → `sources.id`, not null | **replaces free-text `source`** |
| `active` | boolean, not null, default true | |

#### `hazards` (revised)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `hazard_type` | text, not null, check in (`cyclone`,`high_wave`,`lightning`) | |
| `severity` | text, not null, check in (`low`,`moderate`,`high`,`critical`) | |
| `geom` | geometry(Polygon, 4326), nullable | GIST-indexed when present |
| `valid_from` | timestamptz, not null | |
| `valid_until` | timestamptz, nullable | |
| `source_id` | uuid, FK → `sources.id`, not null | **replaces free-text `source`** |
| `raw_bulletin_ref` | text, nullable | |

#### `vessels` (unchanged structurally, one addition)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `label` | text, not null | |
| `lat`, `lon` | float8, not null | |
| `updated_at` | timestamptz, not null | |

#### `watchdog_subscriptions` (NEW — makes subscriptions a real, queryable relation instead of implicit)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `vessel_id` | uuid, FK → `vessels.id`, not null | |
| `poll_interval_seconds` | int, not null, default 30 | |
| `active` | boolean, not null, default true | |
| `created_at` | timestamptz, not null | |

`POST /api/v1/watchdog/subscribe` now creates a real row here instead of being a stateless acknowledgment — this is what lets the daemon (Charan's Phase 5) query "which vessels are actively subscribed" as a real query instead of an in-memory list that vanishes on restart.

#### `watchdog_alerts` (NEW — durable alert history, replaces ephemeral-only JSON push)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `vessel_id` | uuid, FK → `vessels.id`, not null | |
| `alert_type` | text, not null, check in (`HIGH_WAVE`,`IMBL_PROXIMITY`,`CYCLONE`) | |
| `severity` | text, not null, check in (`low`,`moderate`,`high`,`critical`) | |
| `message` | text, not null | |
| `triggered_hazard_id` | uuid, FK → `hazards.id`, nullable | set when the trigger was a hazard (`HIGH_WAVE`/`CYCLONE`) |
| `triggered_zone_id` | uuid, FK → `zones.id`, nullable | set when the trigger was proximity to a zone (`IMBL_PROXIMITY`) |
| `triggered_at` | timestamptz, not null | |
| `acknowledged` | boolean, not null, default false | for the mobile app's dismiss action |

This is the single biggest functional gap in the original schema — Akash's Alerts tab (Task A7.4) is explicitly supposed to show alert *history*, and there was no table to query for that. Now there is, and it's properly linked to the actual hazard or zone that caused each alert, which also makes the evidence trace for an alert auditable the same way a query's evidence trace is.

#### `query_logs` (revised — this is the big one)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | this is the `query_id` |
| `raw_query` | text, not null | |
| `detected_language` | text, not null | |
| `role` | text, not null, check in (`fisherman`,`researcher`,`coast_guard`,`policymaker`) | |
| `intent` | text, not null | |
| `location_lat`, `location_lon` | float8, nullable | denormalized from the resolved plan, for easy spatial queries across query history without parsing anything |
| `time_window_start`, `time_window_end` | timestamptz, nullable | |
| `risk_score` | float8, nullable | |
| `risk_band` | text, nullable, check in (`low`,`moderate`,`high`,`extreme`) | |
| `sail_clearance` | boolean, nullable | |
| `final_response_text` | text, nullable | |
| `created_at` | timestamptz, not null | |

`plan_json` and `evidence_json` are **removed entirely** and replaced by two real child tables below — this is the core fix.

#### `plan_steps` (NEW — replaces `query_logs.plan_json`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `query_log_id` | uuid, FK → `query_logs.id`, not null | |
| `agent_name` | text, not null, check in (`planner`,`ocean`,`weather`,`gis`,`guardrail`,`risk`,`synthesis`) | |
| `step_order` | int, not null | execution order within the pipeline, for reconstructing the trace in sequence |
| `status` | text, not null, check in (`success`,`skipped`,`failed`) | |
| `duration_ms` | int, nullable | for later latency analysis, useful for the demo's "interactive response" success metric |

This turns the Planner's execution trace (which agents ran, in what order, did any fail) into a real queryable log — genuinely useful both for debugging during the build and as a judge-facing "here's the agent trace" artifact, matching the PRD's explicit requirement to "log plan/tool trace for judging/debugging" (§6, Agentic planning).

#### `evidence_items` (NEW — replaces `query_logs.evidence_json`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | this is the id referenced by `synthesis_agent`'s `supporting_evidence_item_id` (§5.5) |
| `query_log_id` | uuid, FK → `query_logs.id`, not null | |
| `claim_text` | text, not null | the human-readable claim shown to the user |
| `supporting_value` | float8, nullable | the actual numeric value backing the claim, when applicable |
| `source_id` | uuid, FK → `sources.id`, nullable | |
| `ocean_state_id` | uuid, FK → `ocean_states.id`, nullable | set when this evidence item was drawn from a specific fused ocean_states row |
| `hazard_id` | uuid, FK → `hazards.id`, nullable | set when this evidence item was a hazard bulletin |
| `zone_id` | uuid, FK → `zones.id`, nullable | set when this evidence item was a geofence/zone check |
| `quality` | text, not null, check in (`good`,`stale`,`partial`,`missing`) | |
| `fetched_at` | timestamptz, nullable | |

Every evidence item shown to the user in `GET /api/v1/evidence/{query_id}` now traces to a real row, which itself traces (via FK, not string-matching) to the exact `ocean_states`/`hazards`/`zones` row it came from. This is what makes Objective 4 (§1) — full auditability — actually true at the database level, not just true in the API response shape.

### 7.4 Required Indexes

- `GIST` spatial index on every `geometry` column (`ocean_states.geom`, `zones.geom`, `hazards.geom`).
- B-tree index on every foreign key column listed above (`sst_source_id`, `query_log_id`, `vessel_id`, etc.) — Postgres does not create these automatically for FKs, and every one of them will be hit by a `JOIN` in normal operation.
- B-tree index on `query_logs.created_at` and `watchdog_alerts.triggered_at` for the obvious reverse-chronological history queries both the audit view and the Alerts tab need.

### 7.5 Migration Note for Charan

This is a schema *revision*, not a bolt-on — implement it as the actual Phase 1 schema (Task C1.3–C1.8 in Charan's implementation doc), not as a later migration on top of the flat version. Seed `sources` (Task C1.1-adjacent, do it right after enabling PostGIS) before seeding `zones` (Task C1.9), since `zones.source_id` is now a required FK.

---

## 8. Summary — What "Production Grade" Means Here, Concretely

Not a slogan — this is the checklist for whether the backend actually meets the bar this doc sets:

- [ ] No LLM call anywhere in the pipeline can cause a number to reach the user without passing through the Guardrail's claim validator (§5.3, §5.5).
- [ ] A hazard hard-override always beats a numeric risk score, with no code path that lets it be bypassed (§5.4).
- [ ] Every table has real foreign keys where a relationship exists; no relationship is represented only as a free-text string or an opaque jsonb blob (§7).
- [ ] Every evidence item shown to a user resolves, via FK chain, to a real stored source row (§7.3, `evidence_items`).
- [ ] Every failure mode in §6 degrades honestly (visible caveat/missing-data marker) rather than silently.
- [ ] The Watchdog daemon and the query pipeline are architecturally independent — one can be down without affecting the other.
- [ ] Every agent's prompt (§5) is version-controlled text, not something improvised inline in code — so it can be reviewed, tested, and iterated the same way any other component is.