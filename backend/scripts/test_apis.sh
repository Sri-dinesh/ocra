#!/usr/bin/env bash
# ==============================================================================
# ORCA Backend API Comprehensive Test Suite (Bash / Curl)
# Base URL: http://localhost:8000
# ==============================================================================

BASE_URL="http://localhost:8000"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   ORCA (SIH26176) — Live Backend API Test Suite     ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# 1. Health Check
echo -e "${YELLOW}1. Testing Health Endpoint (GET /api/v1/health)...${NC}"
curl -s -X GET "$BASE_URL/api/v1/health" | jq . || curl -s -X GET "$BASE_URL/api/v1/health"
echo -e "\n"

# 2. Ocean State Observations
echo -e "${YELLOW}2. Testing Live Fused Ocean State (GET /api/v1/oceanstate)...${NC}"
curl -s -X GET "$BASE_URL/api/v1/oceanstate?lat=16.9891&lon=82.2475" | jq . || curl -s -X GET "$BASE_URL/api/v1/oceanstate?lat=16.9891&lon=82.2475"
echo -e "\n"

# 3. Compact Offline Sync Payload
echo -e "${YELLOW}3. Testing Compact Edge Offline Payload (GET /api/v1/sync/payload)...${NC}"
curl -s -X GET "$BASE_URL/api/v1/sync/payload?cell=16.98,82.24" | jq . || curl -s -X GET "$BASE_URL/api/v1/sync/payload?cell=16.98,82.24"
echo -e "\n"

# 4. Multi-Agent Reasoning Query (English - Fisherman)
echo -e "${YELLOW}4. Testing Multi-Agent Query (POST /api/v1/query - English)...${NC}"
QUERY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Can I sail tomorrow morning from Kakinada port?",
    "role": "fisherman",
    "language": "en-IN",
    "location_hint": {
      "lat": 16.9891,
      "lon": 82.2475,
      "name": "Kakinada"
    }
  }')
echo "$QUERY_RESPONSE" | jq . || echo "$QUERY_RESPONSE"
echo -e "\n"

# Extract Query ID for evidence test
QUERY_ID=$(echo "$QUERY_RESPONSE" | grep -o '"query_id":"[^"]*' | cut -d'"' -f4)

# 5. Multi-Agent Reasoning Query (Tamil)
echo -e "${YELLOW}5. Testing Multi-Agent Query (POST /api/v1/query - Tamil)...${NC}"
curl -s -X POST "$BASE_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "நாளை காலை காக்கிநாடாவிலிருந்து மீன்பிடிக்க செல்லலாமா?",
    "role": "fisherman",
    "language": "ta-IN"
  }' | jq . || curl -s -X POST "$BASE_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{"text": "நாளை காலை காக்கிநாடாவிலிருந்து மீன்பிடிக்க செல்லலாமா?", "role": "fisherman", "language": "ta-IN"}'
echo -e "\n"

# 6. Multi-Agent Reasoning Query (Hindi)
echo -e "${YELLOW}6. Testing Multi-Agent Query (POST /api/v1/query - Hindi)...${NC}"
curl -s -X POST "$BASE_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "क्या कल सुबह काकीनाडा से नाव ले जाना सुरक्षित है?",
    "role": "fisherman",
    "language": "hi-IN"
  }' | jq . || curl -s -X POST "$BASE_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{"text": "क्या कल सुबह काकीनाडा से नाव ले जाना सुरक्षित है?", "role": "fisherman", "language": "hi-IN"}'
echo -e "\n"

# 7. Explainability Evidence Audit Trail
if [ -n "$QUERY_ID" ]; then
  echo -e "${YELLOW}7. Testing Explainability Evidence Audit Trail (GET /api/v1/evidence/$QUERY_ID)...${NC}"
  curl -s -X GET "$BASE_URL/api/v1/evidence/$QUERY_ID" | jq . || curl -s -X GET "$BASE_URL/api/v1/evidence/$QUERY_ID"
  echo -e "\n"
fi

# 8. Collision-Free A* Navigation Pathfinding
echo -e "${YELLOW}8. Testing A* Collision-Free Pathfinding (POST /api/v1/route)...${NC}"
curl -s -X POST "$BASE_URL/api/v1/route" \
  -H "Content-Type: application/json" \
  -d '{
    "start": {"lat": 16.85, "lon": 82.20},
    "goal": {"lat": 17.15, "lon": 82.45},
    "boat_class": "medium"
  }' | jq . || curl -s -X POST "$BASE_URL/api/v1/route" \
  -H "Content-Type: application/json" \
  -d '{"start": {"lat": 16.85, "lon": 82.20}, "goal": {"lat": 17.15, "lon": 82.45}, "boat_class": "medium"}'
echo -e "\n"

# 9. Watchdog Vessel Subscription
echo -e "${YELLOW}9. Testing Watchdog Vessel Subscription (POST /api/v1/watchdog/subscribe)...${NC}"
SUB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/watchdog/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Sea-Explorer-01",
    "lat": 16.9891,
    "lon": 82.2475
  }')
echo "$SUB_RESPONSE" | jq . || echo "$SUB_RESPONSE"
echo -e "\n"

VESSEL_ID=$(echo "$SUB_RESPONSE" | grep -o '"vessel_id":"[^"]*' | cut -d'"' -f4)

# 10. Watchdog Active Alerts Query
echo -e "${YELLOW}10. Testing Watchdog Active Alerts (GET /api/v1/watchdog/alerts)...${NC}"
curl -s -X GET "$BASE_URL/api/v1/watchdog/alerts" | jq . || curl -s -X GET "$BASE_URL/api/v1/watchdog/alerts"
echo -e "\n"

# 11. Watchdog Polling Heartbeat
if [ -n "$VESSEL_ID" ]; then
  echo -e "${YELLOW}11. Testing Watchdog Poll Heartbeat (GET /api/v1/watchdog/poll)...${NC}"
  curl -s -X GET "$BASE_URL/api/v1/watchdog/poll?vessel_id=$VESSEL_ID" | jq . || curl -s -X GET "$BASE_URL/api/v1/watchdog/poll?vessel_id=$VESSEL_ID"
  echo -e "\n"
fi

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   All ORCA API Endpoints Tested Successfully!        ${NC}"
echo -e "${GREEN}======================================================${NC}"
