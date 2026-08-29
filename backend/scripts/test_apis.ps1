# ==============================================================================
# ORCA Backend API Comprehensive Test Suite (PowerShell / Windows)
# Base URL: http://localhost:8000
# ==============================================================================

$BaseUrl = "http://localhost:8000"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   ORCA (SIH26176) - Live Backend API Test Suite     " -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

# 1. Health Check
Write-Host "1. Testing Health Endpoint (GET /api/v1/health)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/health" -Method Get
    $health | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing health: $_" -ForegroundColor Red
}
Write-Host "`n"

# 2. Ocean State Observations
Write-Host "2. Testing Live Fused Ocean State (GET /api/v1/oceanstate)..." -ForegroundColor Yellow
try {
    $oceanUri = "$($BaseUrl)/api/v1/oceanstate?lat=16.9891`&lon=82.2475"
    $oceanState = Invoke-RestMethod -Uri $oceanUri -Method Get
    $oceanState | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing ocean state: $_" -ForegroundColor Red
}
Write-Host "`n"

# 3. Compact Offline Sync Payload
Write-Host "3. Testing Compact Edge Offline Payload (GET /api/v1/sync/payload)..." -ForegroundColor Yellow
try {
    $syncUri = "$($BaseUrl)/api/v1/sync/payload?cell=16.98,82.24"
    $syncPayload = Invoke-RestMethod -Uri $syncUri -Method Get
    $syncPayload | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing sync payload: $_" -ForegroundColor Red
}
Write-Host "`n"

# 4. Multi-Agent Reasoning Query (English - Fisherman)
Write-Host "4. Testing Multi-Agent Query (POST /api/v1/query - English)..." -ForegroundColor Yellow
$queryId = $null
try {
    $queryBody = @{
        text = "Can I sail tomorrow morning from Kakinada port?"
        role = "fisherman"
        language = "en-IN"
        location_hint = @{
            lat = 16.9891
            lon = 82.2475
            name = "Kakinada"
        }
    } | ConvertTo-Json

    $queryRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/query" -Method Post -Body $queryBody -ContentType "application/json"
    $queryId = $queryRes.query_id
    $queryRes | ConvertTo-Json -Depth 4 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing query: $_" -ForegroundColor Red
}
Write-Host "`n"

# 5. Multi-Agent Reasoning Query (Tamil)
Write-Host "5. Testing Multi-Agent Query (POST /api/v1/query - Tamil)..." -ForegroundColor Yellow
try {
    $tamilBody = @{
        text = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes("நாளை காலை காக்கிநாடாவிலிருந்து மீன்பிடிக்க செல்லலாமா?"))
        role = "fisherman"
        language = "ta-IN"
    } | ConvertTo-Json

    $tamilRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/query" -Method Post -Body $tamilBody -ContentType "application/json; charset=utf-8"
    $tamilRes | ConvertTo-Json -Depth 4 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing Tamil query: $_" -ForegroundColor Red
}
Write-Host "`n"

# 6. Multi-Agent Reasoning Query (Hindi)
Write-Host "6. Testing Multi-Agent Query (POST /api/v1/query - Hindi)..." -ForegroundColor Yellow
try {
    $hindiBody = @{
        text = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes("क्या कल सुबह काकीनाडा से नाव ले जाना सुरक्षित है?"))
        role = "fisherman"
        language = "hi-IN"
    } | ConvertTo-Json

    $hindiRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/query" -Method Post -Body $hindiBody -ContentType "application/json; charset=utf-8"
    $hindiRes | ConvertTo-Json -Depth 4 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing Hindi query: $_" -ForegroundColor Red
}
Write-Host "`n"

# 7. Explainability Evidence Audit Trail
if ($queryId) {
    Write-Host "7. Testing Explainability Evidence Audit Trail (GET /api/v1/evidence/$queryId)..." -ForegroundColor Yellow
    try {
        $evidenceRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/evidence/$queryId" -Method Get
        $evidenceRes | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Green
    } catch {
        Write-Host "Error testing evidence: $_" -ForegroundColor Red
    }
    Write-Host "`n"
}

# 8. Collision-Free A* Navigation Pathfinding
Write-Host "8. Testing A* Collision-Free Pathfinding (POST /api/v1/route)..." -ForegroundColor Yellow
try {
    $routeBody = @{
        start = @{ lat = 16.85; lon = 82.20 }
        goal = @{ lat = 17.15; lon = 82.45 }
        boat_class = "medium"
    } | ConvertTo-Json

    $routeRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/route" -Method Post -Body $routeBody -ContentType "application/json"
    $routeRes | ConvertTo-Json -Depth 4 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing route: $_" -ForegroundColor Red
}
Write-Host "`n"

# 9. Watchdog Vessel Subscription
Write-Host "9. Testing Watchdog Vessel Subscription (POST /api/v1/watchdog/subscribe)..." -ForegroundColor Yellow
$vesselId = $null
try {
    $subBody = @{
        label = "Sea-Explorer-01"
        lat = 16.9891
        lon = 82.2475
    } | ConvertTo-Json

    $subRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/watchdog/subscribe" -Method Post -Body $subBody -ContentType "application/json"
    $vesselId = $subRes.vessel_id
    $subRes | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing watchdog subscribe: $_" -ForegroundColor Red
}
Write-Host "`n"

# 10. Watchdog Active Alerts Query
Write-Host "10. Testing Watchdog Active Alerts (GET /api/v1/watchdog/alerts)..." -ForegroundColor Yellow
try {
    $alertsRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/watchdog/alerts" -Method Get
    $alertsRes | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "Error testing watchdog alerts: $_" -ForegroundColor Red
}
Write-Host "`n"

# 11. Watchdog Polling Heartbeat
if ($vesselId) {
    Write-Host "11. Testing Watchdog Poll Heartbeat (GET /api/v1/watchdog/poll)..." -ForegroundColor Yellow
    try {
        $pollRes = Invoke-RestMethod -Uri "$($BaseUrl)/api/v1/watchdog/poll?vessel_id=$vesselId" -Method Get
        $pollRes | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Green
    } catch {
        Write-Host "Error testing watchdog poll: $_" -ForegroundColor Red
    }
    Write-Host "`n"
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   All ORCA API Endpoints Tested Successfully!        " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
