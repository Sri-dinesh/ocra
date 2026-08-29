# ORCA Backend API — cURL Testing Guide & Reference

This guide provides copy-pasteable `curl` commands to test and verify all live endpoints of the ORCA backend running locally at `http://localhost:8000`.

---

## 1. System Health Check
Verify that the FastAPI server and database connection pool are alive.

```bash
curl -X GET "http://localhost:8000/api/v1/health" \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "ORCA Marine Intelligence Decision Engine"
}
```

---

## 2. Multi-Agent Reasoning Query (`POST /api/v1/query`)

### 2.1 English Sail Clearance Query
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Can I sail tomorrow morning from Kakinada?",
    "role": "fisherman",
    "language": "en-IN",
    "location_hint": {
      "lat": 16.9891,
      "lon": 82.2475,
      "name": "Kakinada"
    }
  }'
```

**Expected Response (200 OK):**
```json
{
  "query_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "intent": "sail_clearance",
  "recommendation": "Clear to sail from Kakinada. Wave height 1.8m and wind speed 14.0kt are within safe limits. No active cyclone bulletin.",
  "risk_score": 24.5,
  "risk_band": "low",
  "evidence": [
    {
      "id": "EVID-01",
      "claim": "Wave height 1.8m is within safe limits for Kakinada.",
      "source": "INCOIS OSF",
      "supporting_value": 1.8,
      "fetched_at": "2026-08-29T21:40:00Z"
    }
  ],
  "confidence": "high",
  "caveats": [
    "Prototype risk score — not an official maritime safety certification."
  ],
  "map_layers": ["pfz", "sst_heatmap", "geofence"],
  "language": "en-IN"
}
```

---

### 2.2 Tamil Query (மீன்பிடி பாதுகாப்பு)
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "நாளை காலை காக்கிநாடாவிலிருந்து மீன்பிடிக்க செல்லலாமா?",
    "role": "fisherman",
    "language": "ta-IN"
  }'
```

**Expected Response (200 OK):**
```json
{
  "intent": "sail_clearance",
  "recommendation": "காக்கிநாடா-லிருந்து கடலுக்கு செல்லலாம். அலை உயரம் 1.8m, காற்றின் வேகம் 14.0kt பாதுகாப்பான வரம்பில் உள்ளது. தற்போதைய புயல் எச்சரிக்கை இல்லை.",
  "risk_score": 24.5,
  "risk_band": "low",
  "language": "ta-IN"
}
```

---

### 2.3 Hindi Query (सुरक्षा मूल्यांकन)
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "क्या कल सुबह काकीनाडा से नाव ले जाना सुरक्षित है?",
    "role": "fisherman",
    "language": "hi-IN"
  }'
```

---

### 2.4 Ambiguous Short Query (Short-Circuit Clarification)
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "can i go?",
    "role": "fisherman",
    "language": "en-IN"
  }'
```

**Expected Response (200 OK):**
```json
{
  "intent": "clarification_needed",
  "recommendation": "Could you specify which coastal harbor or port you are departing from?",
  "confidence": "low",
  "evidence": []
}
```

---

## 3. Explainability Audit Trail (`GET /api/v1/evidence/{query_id}`)
Replace `{query_id}` with the UUID returned from step 2.

```bash
curl -X GET "http://localhost:8000/api/v1/evidence/YOUR_QUERY_ID_HERE" \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "query_id": "YOUR_QUERY_ID_HERE",
  "raw_query": "Can I sail tomorrow morning from Kakinada?",
  "plan": {
    "intent": "sail_clearance",
    "location": {
      "lat": 16.9891,
      "lon": 82.2475,
      "name": "Kakinada"
    },
    "required_agents": ["ocean", "weather", "gis"]
  },
  "evidence": [
    {
      "claim": "Wave height 1.8m is within safe limits.",
      "source": "INCOIS OSF",
      "supporting_value": 1.8
    }
  ],
  "risk_score": 24.5,
  "risk_band": "low"
}
```

---

## 4. Collision-Free A* Navigation Path (`POST /api/v1/route`)

```bash
curl -X POST "http://localhost:8000/api/v1/route" \
  -H "Content-Type: application/json" \
  -d '{
    "start": [16.85, 82.20],
    "goal": [17.15, 82.45],
    "boat_class": "medium"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "waypoints": [
    [16.85, 82.2],
    [16.9, 82.25],
    [17.0, 82.35],
    [17.15, 82.45]
  ],
  "distance_nm": 22.4,
  "eta_hours": 2.24,
  "warnings": []
}
```

---

## 5. Live Fused Ocean State (`GET /api/v1/oceanstate`)

```bash
curl -X GET "http://localhost:8000/api/v1/oceanstate?lat=16.9891&lon=82.2475" \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "lat": 16.9891,
  "lon": 82.2475,
  "valid_time": "2026-08-29T21:40:00Z",
  "sst_c": 28.4,
  "chl_a_mgm3": 0.45,
  "wave_height_m": 1.8,
  "wind_speed_kt": 14.0,
  "current_speed_ms": 0.35,
  "current_dir_deg": 65.0,
  "quality": "good"
}
```

---

## 6. Edge Offline Sync Payload (`GET /api/v1/sync/payload`)

```bash
curl -X GET "http://localhost:8000/api/v1/sync/payload?cell=16.98,82.24" \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "cell": {
    "lat": 16.98,
    "lon": 82.24
  },
  "synced_at": "2026-08-29T21:40:00Z",
  "valid_until": "2026-08-30T03:40:00Z",
  "sst_c": 28.4,
  "wave_m": 1.8,
  "wind_kt": 14.0,
  "hazards": []
}
```

---

## 7. Proactive Watchdog & Alerts

### 7.1 Register Vessel Subscription
```bash
curl -X POST "http://localhost:8000/api/v1/watchdog/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Sea-Explorer-01",
    "lat": 16.9891,
    "lon": 82.2475
  }'
```

### 7.2 Get Active Emergency Alerts
```bash
curl -X GET "http://localhost:8000/api/v1/watchdog/alerts" \
  -H "Accept: application/json"
```

### 7.3 Poll Heartbeat by Vessel ID
```bash
curl -X GET "http://localhost:8000/api/v1/watchdog/poll?vessel_id=demo-vessel-01" \
  -H "Accept: application/json"
```

---

## 8. Automated Script Execution

You can run the full automated test suite using either of the included scripts:

- **Windows (PowerShell):**
  ```powershell
  .\backend\scripts\test_apis.ps1
  ```

- **Linux / macOS / Git Bash:**
  ```bash
  chmod +x backend/scripts/test_apis.sh
  ./backend/scripts/test_apis.sh
  ```
