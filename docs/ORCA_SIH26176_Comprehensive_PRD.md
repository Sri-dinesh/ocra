# **ORCA** 

Marine EcOsystem Reasoning with Collaborative Agents 

#### **Software • SIH26176 • SIH 2026** 

Indian Space Research Organisation (ISRO) Department of Space 

#### **Comprehensive Product Requirements Document** 

Hackathon-oriented MVP with an extensible architecture 

Version 1.0 • 27 August 2026 

ORCA • SIH26176 • Comprehensive PRD 

Page 1 

## **1. Executive Summary** 

ORCA is an Agentic AI-powered conversational marine intelligence and decision-support platform. It allows fishermen, researchers, coastal authorities, disaster-management users and maritime operators to ask natural-language questions about marine conditions and receive synthesized, context-aware, evidence-backed answers through conversation, maps, charts and alerts. 

##### The central product idea is simple: **the user asks a marine question; ORCA determines what information is required, retrieves it from multiple authoritative sources, performs spatial and temporal reasoning, combines the evidence, evaluates operational risk, and explains the result.** 

For the SIH MVP, ORCA focuses on agent orchestration, heterogeneous marine-data fusion, geospatial analysis, temporal alignment, transparent risk scoring, explainability and conversational UX. 

**Primary MVP promise:** turn fragmented marine information into one understandable, traceable decision-support experience. 

## **2. Problem Statement Interpretation** 

Marine stakeholders already have access to large volumes of Earth Observation, oceanographic, meteorological and GIS information. The difficulty is that information is distributed across sources, formats and services, while a single operational question may require several datasets at once. 

- Data is distributed across PFZ, ocean, weather, satellite and GIS services. 

- Different datasets have different spatial resolutions, timestamps and units. 

- Users may not know which source or parameter is relevant. 

- Retrieval alone does not explain how multiple observations interact. 

- Safety-sensitive decisions require explicit evidence, uncertainty and authoritative advisories. 

ORCA is therefore not merely a chatbot or data portal. It is a **marine decision-intelligence orchestration layer** above authoritative data sources. 

Example: “Can I go fishing tomorrow morning near Kakinada?” 

- Determine location and time window. 

- Find PFZ and ocean conditions. 

- Retrieve weather, wind, waves, lightning and cyclone information. 

- Check restricted/geofenced areas. 

- Align observations and forecasts. 

- Fuse information into a common Marine State. 

- Apply transparent risk rules and authoritative-warning precedence. 

- Explain the recommendation with evidence, map layers and caveats. 

## **3. Goals and Non-Goals** 

### **Goals** 

- Natural-language access to marine information. 

- Agentic planning and dynamic tool selection. 

- Cross-source data fusion. 

- Spatial and temporal reasoning. 

- Evidence-backed recommendations. 

- Fishermen safety and hazard alerts. 

ORCA • SIH26176 • Comprehensive PRD 

Page 2 

- PFZ discovery and suitability ranking. 

- Geofencing for restricted/protected zones. 

- Multi-turn context. 

- Indian regional-language support. 

### **Non-goals for MVP** 

- No new numerical weather/ocean forecast model. 

- No satellite computer-vision training required for core MVP. 

- No professional autopilot/navigation system. 

- No presentation of prototype scores as official safety certification. 

- No unnecessary swarm of agents. 

- No assumption that every public webpage is an API; validate access, licensing and update cadence. 

## **4. Target Users** 

|User|Need|Typical use|
|---|---|---|
|Small-scale fishermen|Safe/useful fishing decisions|PFZ, sea/weather safety, route, alerts|
|Researchers/ocean<br>scientists|Explore trends/correlations|SST/chlorophyll history, ecosystem questions|
|Coastal authorities|Situational awareness|Hazards, zones, marine conditions|
|Disaster-management teams|Rapid hazard assessment|Cyclone, lightning, wave/weather context|
|Maritime operators|Operational planning|Route conditions, hazards, geofencing|
|Students/analysts|Marine exploration|Conversational data analysis|



## **5. Core Use Cases** 

|ID|Use case|Priority|
|---|---|---|
|UC-01|Nearest/suitable PFZ today|P0|
|UC-02|Fishing safety tomorrow morning|P0|
|UC-03|Tide/weather/sea conditions near location|P0/P1|
|UC-04|Lightning/cyclone alerts|P0|
|UC-05|High chlorophyll + favorable SST|P1|
|UC-06|Safer route to selected zone|P1|
|UC-07|Why productivity declined|P1|
|UC-08|Avoid hazardous/restricted zones|P0|
|UC-09|Multilingual conversational refinement|P0/P1|



## **6. Functional Requirements** 

### **Conversational interface** 

- Accept natural-language questions. 

- Extract intent, location, time, entities and constraints. 

- Maintain multi-turn context such as “what about tomorrow?”. 

- Respond in the user's language. 

ORCA • SIH26176 • Comprehensive PRD 

Page 3 

- Expose evidence and provenance. 

- Link answers to maps/charts. 

### **Agentic planning** 

- Planner decomposes queries into subtasks. 

- Planner selects only relevant tools/agents. 

- Respect task dependencies. 

- Retry/fallback on failure. 

- Log plan/tool trace for judging/debugging. 

### **Data retrieval/fusion** 

- Retrieve PFZ, SST, chlorophyll, currents, waves, weather and hazards as available. 

- Normalize units, coordinates and timestamps. 

- Attach provenance. 

- Build a common Marine State. 

- Flag stale/incompatible data. 

### **Spatial reasoning** 

- Distance calculations. 

- Point/route intersection with restricted polygons. 

- Boundary/hazard proximity. 

- Interactive map overlays. 

- MVP route scoring using graph/grid/waypoints. 

### **Temporal reasoning** 

- Interpret today/tomorrow morning/next N hours. 

- Map windows to relevant forecast/observation records. 

- Distinguish historical/current/forecast data. 

- Avoid incompatible timestamp combinations. 

### **Risk/recommendation** 

- Transparent prototype risk score. 

- Authoritative-warning hard overrides. 

- PFZ ranking using suitability + constraints. 

- Explain ranking. 

- Show uncertainty/freshness and safety caveat. 

## **7. Proposed System Architecture** 

The architecture uses modular specialized agents. The LLM handles language, planning and explanation; deterministic services handle numerical/geospatial operations; data connectors handle authoritative retrieval. 

|Layer|Components|Responsibility|
|---|---|---|
|Experience|React + TypeScript|Chat, map, charts, alerts|



ORCA • SIH26176 • Comprehensive PRD 

Page 4 

|Layer|Components|Responsibility|
|---|---|---|
|API|FastAPI|Sessions, query and orchestration API|
|Agent orchestration|LangGraph or equivalent|Stateful workflow/tool routing|
|Agents|Planner, Ocean, Weather, GIS, Risk,<br>Response|Specialized tasks|
|Data services|Provider adapters|MOSDAC/INCOIS/IMD/GIS retrieval|
|Processing|Python|Normalization, scoring, time alignment|
|Geospatial|PostGIS + Shapely/GeoPandas|Distance, polygons, routes, geofencing|
|Storage|PostgreSQL/PostGIS|Data, zones, provenance, cache|
|LLM|Gemini or selected model|Planning, language, explanation|



## **8. Agent Specifications** 

|Agent|Responsibilities|Should not do|
|---|---|---|
|Planner|Intent, entities, plan, tool selection, dependencies|Numerical GIS calculations|
|Ocean|SST, chlorophyll, currents, waves, ocean forecasts|Invent values|
|Weather|Weather, wind, lightning, cyclone/warnings|Override official warnings|
|GIS|Distance, containment, boundaries, routes|LLM geometry|
|Risk|Scoring, overrides, ranking|Present prototype score as official|
|Response|Evidence synthesis, explanation, multilingual response|Create unsupported facts|



**Optional:** Visualization/Reporting and Alert agents can be added later; for MVP they may remain deterministic backend modules. 

## **9. Data Strategy and Source Mapping** 

Prioritize authoritative Indian sources. Exact APIs, download mechanisms, licenses, coverage and update frequency must be verified before implementation. 

|Data|Preferred source|Purpose|MVP|
|---|---|---|---|
|PFZ|INCOIS|Fishing-zone candidates/advisories|Core|
|SST|MOSDAC / ISRO EO|Ocean condition|Core|
|Chlorophyll-a|MOSDAC / ocean-colour|Productivity context|Core|
|Ocean currents|MOSDAC / ocean products|Analysis/routing|Core/P1|
|Wave height/period|MOSDAC / ocean forecast|Sea-state risk|Core|
|Weather/wind|IMD / relevant MOSDAC|Safety|Core|
|Lightning|Authoritative IMD/MOSDAC service|Hazard|Core|
|Cyclone warnings|IMD / authoritative Indian service|Hazard|Core|
|Satellite imagery|MOSDAC|Map/context|P1|
|Tides|Authoritative available tide source|Tide conditions|P1|
|Restricted/maritime zones|Government/public GIS|Geofencing|Core|
|MPAs/sensitive zones|Government/public GIS|Environmental constraints|P1|
|Coastline|Authoritative/open GIS|Spatial analysis|Core|
|Historical ocean data|MOSDAC/INCOIS/global permitted<br>source|Trend analysis|P1|



**Data-engineering rule:** build provider adapters so each source can be replaced without changing the agent layer. 

ORCA • SIH26176 • Comprehensive PRD 

Page 5 

## **10. Common Marine State** 

All agents converge on a shared representation so heterogeneous observations can be correlated consistently. 

Recommended logical fields: location {lat, lon}; observed/valid time; source/product; PFZ geometry; SST; chlorophyll; current speed/direction; wave height/period; wind speed/direction; rain; lightning; cyclone/warning state; restricted-zone state; distance; route metrics; confidence/freshness; provenance. 

Conceptual schema: **MarineState(location, valid_time, ocean, weather, hazards, gis, provenance, quality)** . Keep schema versions explicit. 

## **11. End-to-End Workflows** 

### **A. Nearest suitable PFZ** 

- Parse intent/location/time. 

- Resolve location. 

- Retrieve PFZ candidates. 

- Retrieve ocean parameters. 

- Retrieve weather/hazards. 

- Check GIS constraints. 

- Build MarineState per candidate. 

- Score/rank candidates. 

- Generate evidence-backed explanation. 

- Show recommendation on map. 

### **B. Fishing safety** 

- Resolve location/time. 

- Retrieve weather, wind, waves, lightning and cyclone information. 

- Add ocean/current context. 

- Check geofencing if relevant. 

- Apply official-warning precedence. 

- Return transparent risk factors and caveat. 

### **C. Ecosystem productivity analysis** 

- Resolve region/period. 

- Retrieve historical SST/chlorophyll. 

- Align spatially and temporally. 

- Calculate trends/anomalies. 

- Use LLM only to interpret computed evidence. 

- Distinguish correlation from causation. 

## **12. Risk and Recommendation Model** 

Use a deterministic, inspectable prototype model. Factor groups can include wave/sea state, wind, weather, lightning, cyclone/warnings, geofence and distance. Weights must be configurable. 

ORCA • SIH26176 • Comprehensive PRD 

Page 6 

|Factor|Prototype treatment|Priority|
|---|---|---|
|Cyclone warning|Hard override/avoid|Critical|
|Lightning|Large increment/avoid when severe|Critical|
|Wave/sea state|Normalized score|High|
|Wind|Normalized score|High|
|Geofence conflict|Hard constraint|Critical|
|Distance|Ranking factor|Medium|
|SST/chlorophyll|Suitability context, not safety|Fishing|
|Current|Routing/context|Operational|



Example UI bands: 0–25 Low, 26–50 Moderate, 51–75 High, 76–100 Extreme. These are **prototype categories only** , not official safety standards. 

## **13. Innovation and Uniqueness** 

The strongest innovation claim is integration and reasoning, not ownership of any single dataset or AI technique. 

- **Dynamic question-to-workflow planning:** different questions activate different tools. 

- **Cross-source marine reasoning:** PFZ, ocean, weather and GIS are evaluated together. 

- **Marine State abstraction:** heterogeneous data becomes a consistent spatial-temporal state. 

- **Explainable recommendations:** show why a location/route was preferred. 

- **Safety-aware architecture:** deterministic rules and official warnings constrain generative AI. 

- **Conversational continuity:** follow-ups reuse context. 

- **Geospatial-native agentic AI:** language planning coupled with deterministic geometry. 

- **Multilingual access:** lower information barriers. 

Position ORCA as a **decision-support orchestration platform** connecting existing marine information, not replacing official advisory systems. 

## **14. UX and Visualization** 

### **Main layout** 

- Chat panel. 

- Interactive map. 

- Context cards for location/time/data freshness. 

- Evidence drawer with source/timestamp/value/rule. 

- Hazard alert banner. 

### **Example answer** 

##### **Recommended zone: PFZ C** 

Distance: 25 km • Estimated operational risk: Low/Moderate 

Why: favorable fishing indicators; acceptable sea state; no configured geofence conflict. 

**Evidence:** PFZ + ocean + weather + GIS, each timestamped. 

### **Map layers** 

- PFZ markers/polygons. 

ORCA • SIH26176 • Comprehensive PRD 

Page 7 

- SST heatmap. 

- Chlorophyll heatmap. 

- Wave/wind/current overlays where supported. 

- Cyclone/lightning markers. 

- Restricted/protected zones. 

- User position and route. 

## **15. Multilingual and Conversational Intelligence** 

Flow: user language → language/intent parsing → language-neutral task plan → tools/data → evidence → response in detected language. 

For MVP, support English plus a small validated set of Indian languages. Voice input/output is an optional enhancement after core text workflows are stable. 

## **16. Safety, Reliability and Trust** 

- Official/authoritative warnings take precedence. 

- Show source and freshness for time-sensitive data. 

- Say when required data is missing or stale. 

- Never fabricate values, warnings or routes. 

- Label risk scores as prototype decision support. 

- Show safety caveat and official-advisory guidance. 

- Log tool calls and evidence. 

- Use quality/confidence flags when available. 

## **17. Data Quality and Normalization** 

|Issue|Mitigation|
|---|---|
|Different units|Normalize to canonical units such as °C, m, km/h, m/s|
|Coordinates|Convert to WGS84 where appropriate|
|Timestamps|Store timezone, valid time and forecast lead time|
|Spatial resolution|Store resolution; avoid false precision|
|Missing values|Explicit null/quality state|
|Stale data|Freshness checks and visible timestamp|
|Conflicts|Source precedence + visible conflict|
|Provider outage|Cache only when clearly labeled; otherwise partial response|



## **18. Data Pipeline** 

- Provider adapter → raw retrieval. 

- Parser → provider-specific format handling. 

- Normalizer → units/coordinates/timestamps. 

- Validator → schema/range/freshness/quality. 

- Cache → reduce repeated calls. 

ORCA • SIH26176 • Comprehensive PRD 

Page 8 

- Marine State builder → spatial-temporal fusion. 

- Agent/tool layer → query-specific retrieval. 

A scheduled cache/snapshot may be used for difficult feeds. Clearly label cached data; use live retrieval where stable. 

## **19. Recommended Technology Stack** 

|Area|Choice|Reason|
|---|---|---|
|Frontend|React + TypeScript + Tailwind|Fast hackathon UI|
|Map|MapLibre GL / Leaflet|Interactive geospatial visualization|
|Backend|FastAPI + Python|AI/data/GIS ecosystem|
|Agents|LangGraph|Stateful workflow|
|LLM|Gemini or selected model|Planning/language/explanation|
|RAG|Sentence Transformers + vector DB if<br>needed|Advisory/document retrieval|
|Database|PostgreSQL + PostGIS|Relational + geospatial|
|Geo|Shapely + GeoPandas|Geometry|
|Charts|Plotly/Recharts|Visualization|
|Cache|Redis/PostgreSQL cache|Repeated retrieval|
|Deployment|Docker|Reproducibility|
|Observability|Structured logs + agent trace|Transparency|



## **20. Optional RAG / Knowledge Layer** 

RAG is useful for textual marine advisories, definitions and safety guidance. It complements numerical retrieval rather than replacing it. 

Example: retrieve relevant advisory text for “What does this warning mean?” while current hazard values come from structured data. 

## **21. SIH MVP Implementation Plan** 

|Phase|Deliverable|Priority|
|---|---|---|
|0|Validate sources, formats, licensing, update cadence|P0|
|1|Repo, Docker, FastAPI, React, PostgreSQL/PostGIS|P0|
|2|PFZ + SST/chlorophyll + weather + waves + GIS adapters|P0|
|3|Normalization, provenance, temporal/spatial alignment|P0|
|4|Planner, Ocean, Weather, GIS, Risk, Response agents|P0|
|5|PFZ discovery + safety workflow|P0|
|6|Chat + map + evidence + risk UI|P0|
|7|Route scoring|P1|
|8|Historical trend workflow|P1|
|9|Selected Indian languages|P1|
|10|Alerts, caching, observability, demo polish|P0/P1|



## **22. Recommended SIH Demo Scenarios** 

ORCA • SIH26176 • Comprehensive PRD 

Page 9 

**A — Fisherman safety:** “I am near Kakinada. Can I go fishing tomorrow morning?” Show location → planner → retrieval → risk → map → evidence. 

**B — PFZ selection:** “Show the nearest suitable PFZ today.” Show candidates, distance, risk/suitability and ranking reasons. 

**C — Safer route:** “Give me a safer route to that zone.” Show route constraints and restricted-area avoidance. 

**D — Ecosystem reasoning:** “Why has productivity declined here?” Show historical SST/chlorophyll trends and correlation-aware explanation. 

**E — Multilingual follow-up:** Ask in a regional language, then “what about tomorrow?” to demonstrate context. 

## **23. Optional Add-Ons** 

- Voice input/output. 

- WhatsApp/SMS-style alerts where permitted. 

- Personalized profiles and boat capabilities. 

- Vessel-aware thresholds subject to domain validation. 

- More Indian languages. 

- Tide integration. 

- Satellite-image anomaly detection. 

- Computer-vision interpretation of imagery. 

- ML-based fishing-zone suitability. 

- Learned risk calibration after sufficient labeled data. 

- Forecast uncertainty visualization. 

- AIS/vessel tracking where legally/technically available. 

- Offline/low-bandwidth mobile mode. 

- Human-in-the-loop authority review. 

- Event-driven alert agent. 

- Long-term ecosystem trend dashboard. 

## **24. Success Metrics** 

|Metric|MVP interpretation|
|---|---|
|Query understanding|Correct intent/location/time for curated queries|
|Tool selection|Only relevant tools invoked|
|Data freshness|Displayed for time-sensitive data|
|Evidence coverage|Major recommendation factors traceable to source/rule|
|Geospatial correctness|Known distance/containment/route tests pass|
|Temporal correctness|Forecast/observation alignment tests pass|
|Safety behavior|Official hazard overrides prevent unsafe prototype recommendation|
|Latency|Interactive response using cache/parallel calls|
|Multilingual quality|Meaning preserved for selected languages|
|Demo reliability|Core scenarios run from clean deployment|



## **25. Testing Strategy** 

ORCA • SIH26176 • Comprehensive PRD 

Page 10 

### **Unit tests** 

- Unit conversions/normalization. 

- Timestamp and time-window logic. 

- Distance/geofence calculations. 

- Risk scoring. 

- Route constraints. 

### **Integration tests** 

- Provider adapter → normalized schema. 

- Planner → tools. 

- Agents → Marine State. 

- Marine State → Risk → Response. 

### **Evaluation set** 

- Prepare 20–50 representative questions. 

- Include English and selected regional languages. 

- Include ambiguous follow-ups. 

- Include missing/conflicting data. 

- Record expected tools, evidence and acceptable behavior. 

## **26. Security and Privacy** 

- Never expose provider credentials in frontend. 

- Use environment variables/secrets management. 

- Validate coordinates and parameters. 

- Rate-limit expensive queries. 

- Avoid unnecessary retention of precise user location. 

- Minimize profile data. 

- Protect admin/configuration functions. 

## **27. Failure Modes and Fallbacks** 

|Failure|Expected behavior|
|---|---|
|Ocean source unavailable|Return other valid information with explicit missing-ocean notice|
|Weather source unavailable|Do not claim safety; show insufficient-data warning|
|Conflicting sources|Apply precedence and show conflict|
|No PFZ found|Say no PFZ was retrieved for requested region/time|
|Stale forecast|Flag stale data and avoid confident recommendation|
|LLM failure|Fallback to structured response template|
|Map failure|Textual result + coordinates|
|Geofence data missing|Do not claim route is clear; status unknown|



## **28. Provenance and Explainability** 

ORCA • SIH26176 • Comprehensive PRD 

Page 11 

Every evidence item should carry provider, product/dataset, retrieval time, valid time, spatial coverage, value/unit, transformation steps and quality status. 

Recommended UI pattern: **Answer** → **Why** → **Evidence** → **Map** → **Data freshness** → **Advisory caveat.** 

## **29. Deployment Architecture** 

- Frontend container. 

- FastAPI/backend container. 

- PostgreSQL/PostGIS container. 

- Optional Redis. 

- Optional vector DB if RAG is used. 

- Docker Compose locally. 

- Cloud deployment with environment-based credentials. 

Provider adapters should allow a mocked/demo dataset when a live source becomes unavailable during judging. Clearly label simulated/cached data. 

## **30. Suggested Team Responsibilities** 

|Role|Responsibilities|
|---|---|
|AI/Agent lead|Planner, orchestration, prompts, tools, evaluation|
|Data engineer|MOSDAC/INCOIS/IMD adapters, normalization, caching|
|GIS engineer|PostGIS, geofencing, spatial analysis, routes|
|Backend engineer|FastAPI, database, orchestration APIs|
|Frontend engineer|Chat, map, charts, evidence UI|
|Research/domain lead|Source validation, assumptions, safety language|
|DevOps/QA|Docker, deployment, monitoring, tests|



## **31. MVP Deliverables** 

- Working web application. 

- Conversational marine query interface. 

- Agent orchestration graph. 

- PFZ discovery workflow. 

- Marine safety workflow. 

- Interactive map. 

- Validated data adapters. 

- Marine State normalization. 

- Transparent risk engine. 

- Evidence/provenance panel. 

- Geofencing demonstration. 

- Route-planning demonstration. 

- Selected multilingual demonstration. 

- Dockerized deployment. 

ORCA • SIH26176 • Comprehensive PRD 

Page 12 

- Cache/mock fallback. 

- Architecture documentation. 

## **32. MVP Acceptance Criteria** 

- User can ask supported marine questions without knowing dataset names. 

- Planner produces structured plan. 

- At least three specialized agents participate in a core workflow. 

- Data is normalized into common state. 

- Spatial calculations are deterministic. 

- Temporal alignment is explicit. 

- Recommendations include reasons/evidence. 

- Authoritative hazard can override favorable fishing recommendation. 

- Restricted polygon can block route/candidate. 

- Map and chat stay synchronized. 

- Missing/stale data is handled explicitly. 

- Core demo works reliably with live or clearly labeled cached/mock data. 

## **33. Risks and Mitigation** 

|Risk|Impact|Mitigation|
|---|---|---|
|Unstable/undocumented data<br>access|High|Validate early; adapters + cache/mock fallback|
|Licensing restrictions|High|Check terms and use permitted products|
|LLM hallucination|High|Structured tools, provenance, deterministic calculations|
|Too many agents|Medium|Limit MVP to core agents|
|Overambitious satellite ML|High|Keep imagery visualization; ML optional|
|Safety misinterpretation|Critical|Official-warning precedence + disclaimers|
|Latency|Medium|Parallel calls + caching|
|Poor multilingual quality|Medium|Small validated language set|
|Demo outage|High|Snapshot/cache + deterministic demo|



## **34. Reference MVP Architecture** 

**User** → **Conversational UI** → **Planner** → **Specialized Agents** → **Data Connectors** → **Common Marine State** → **Spatial/Temporal Reasoning** → **Risk & Suitability Engine** → **Evidence-backed Response** → **Chat + Map + Alerts** 

Core principle: LLMs reason over tasks and language; connectors retrieve facts; geospatial libraries calculate geometry; deterministic rules calculate scores; the UI communicates the result. 

## **35. Roadmap Beyond SIH** 

|Stage|Capability|
|---|---|
|MVP|PFZ + ocean + weather + GIS + conversational reasoning|
|V1|More live feeds, tides, alerts, multilingual/voice|



ORCA • SIH26176 • Comprehensive PRD 

Page 13 

|Stage|Capability|
|---|---|
|V2|Historical ecosystem analytics and learned suitability models|
|V3|Advanced route optimization and vessel-aware recommendations|
|V4|Operational integration, authority dashboards and validated decision-support models|



## **36. Product Positioning Statement** 

##### **ORCA is a conversational, agentic marine intelligence platform that transforms fragmented Earth Observation, oceanographic, meteorological and geospatial information into explainable, context-aware decision support.** 

For SIH, the strongest strategy is not to implement every item in the problem statement. Demonstrate one coherent loop extremely well: **question** → **plan** → **retrieve** → **correlate** → **reason** → **explain** → **visualize** , using real/validated marine data and deterministic geospatial/safety logic. 

## **Appendix — Core Query Examples** 

- “Where is the nearest PFZ today?” 

- “Which PFZ is closest but still has lower operational risk?” 

- “Can I go fishing tomorrow morning near Kakinada?” 

- “What are the wave, wind, SST and chlorophyll conditions here?” 

- “Are there any lightning or cyclone alerts near me?” 

- “Which regions have high chlorophyll and favorable SST?” 

- “Give me a safer route to the selected PFZ.” 

- “Why has productivity declined in this region over the last three years?” 

- “Is this fishing zone inside or near a restricted area?” 

- “What about tomorrow?” 

ORCA • SIH26176 • Comprehensive PRD 

Page 14 

