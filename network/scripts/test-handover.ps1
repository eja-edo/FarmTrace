# Test Handover Workflow
$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000/api"

Write-Host "`n=== HANDOVER WORKFLOW TEST ===" -ForegroundColor Cyan

# Generate unique IDs
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$PRODUCT_ID = "PROD-$timestamp"
$HANDOVER_ID = "HANDOVER-$PRODUCT_ID-SHIPPER"

# Step 1: Create Product
Write-Host "`n[1/6] Creating test product: $PRODUCT_ID" -ForegroundColor Yellow
$productJson = @"
{
    "id": "$PRODUCT_ID",
    "name": "Test Widget",
    "batch": "BATCH-$timestamp",
    "origin": "Factory A",
    "manufactureDate": "2025-01-15T10:00:00Z",
    "metaHash": "HASH-$timestamp"
}
"@

try {
    $response = Invoke-WebRequest -Uri "$API_URL/products" -Method POST -ContentType "application/json" -Body $productJson -UseBasicParsing
    Write-Host "OK Product created" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Request Handover
Write-Host "`n[2/6] Requesting handover to shipper" -ForegroundColor Yellow
$handoverJson = @"
{
    "productId": "$PRODUCT_ID",
    "shipperId": "SHIP001",
    "waybill": "WB-$timestamp",
    "signature": "SIG-MANUFACTURER-$timestamp"
}
"@

try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/request-shipper" -Method POST -ContentType "application/json" -Body $handoverJson -UseBasicParsing
    Write-Host "OK Handover requested" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get Pending Handovers
Write-Host "`n[3/6] Getting pending handovers" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/pending" -Method GET -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    Write-Host "OK Found $($result.data.Count) pending handovers" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Get Handover Details
Write-Host "`n[4/6] Getting handover details: $HANDOVER_ID" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/$HANDOVER_ID" -Method GET -UseBasicParsing
    Write-Host "OK Retrieved handover details" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Accept Handover
Write-Host "`n[5/6] Accepting handover" -ForegroundColor Yellow
$acceptJson = @"
{
    "receiverId": "DRIVER-001",
    "signature": "SIG-SHIPPER-$timestamp"
}
"@

try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/$HANDOVER_ID/accept" -Method POST -ContentType "application/json" -Body $acceptJson -UseBasicParsing
    Write-Host "OK Handover accepted" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Verify Ownership Transfer
Write-Host "`n[6/6] Verifying ownership transfer" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/products/$PRODUCT_ID" -Method GET -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.data.owner -eq "OrgShipper") {
        Write-Host "OK Ownership transferred to OrgShipper" -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: Owner is $($result.data.owner), expected OrgShipper" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
Write-Host "Product: $PRODUCT_ID" -ForegroundColor Cyan
Write-Host "Handover: $HANDOVER_ID" -ForegroundColor Cyan
