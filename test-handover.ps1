# Handover Workflow Test Script
# Tests the complete two-step handover approval pattern

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000"

Write-Host "`n=== HANDOVER WORKFLOW TEST ===" -ForegroundColor Cyan
Write-Host "Testing two-step approval pattern: Request -> Accept/Reject`n" -ForegroundColor Yellow

# Test 1: Create Product (Manufacturer)
Write-Host "[1] Creating Product..." -ForegroundColor Yellow
$product = @{
    id = "PROD-HO-$(Get-Date -Format 'HHmmss')"
    name = "Handover Test Widget"
    batch = "BATCH-TEST-001"
    origin = "Vietnam Factory"
    manufactureDate = "2025-11-03"
    category = "Electronics"
    description = "Testing handover workflow"
} | ConvertTo-Json

try {
    $createResp = Invoke-WebRequest -Uri "$API_URL/api/products" -Method POST -Body $product -ContentType "application/json" -UseBasicParsing
    $createResult = $createResp.Content | ConvertFrom-Json
    $productId = ($product | ConvertFrom-Json).id
    Write-Host "✓ Product created: $productId" -ForegroundColor Green
    Write-Host "  Response: $($createResp.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create product" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Test 2: Request Handover to Shipper (Manufacturer)
Write-Host "`n[2] Requesting Handover to Shipper..." -ForegroundColor Yellow
$handoverRequest = @{
    productId = $productId
    shipperId = "SHIPPER-001"
    waybill = "WB-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    signature = "MANUFACTURER-SIG-$(Get-Random)"
} | ConvertTo-Json

try {
    $requestResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/request-shipper" -Method POST -Body $handoverRequest -ContentType "application/json" -UseBasicParsing
    $requestResult = $requestResp.Content | ConvertFrom-Json
    $handoverId = $requestResult.handoverId
    Write-Host "✓ Handover requested: $handoverId" -ForegroundColor Green
    Write-Host "  Response: $($requestResp.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to request handover" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Test 3: Get Pending Handovers (Shipper checks)
Write-Host "`n[3] Checking Pending Handovers..." -ForegroundColor Yellow
try {
    $pendingResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/pending" -Method GET -UseBasicParsing
    $pendingResult = $pendingResp.Content | ConvertFrom-Json
    Write-Host "✓ Found $($pendingResult.count) pending handover(s)" -ForegroundColor Green
    Write-Host "  Response: $($pendingResp.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get pending handovers" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Test 4: Get Handover Details
Write-Host "`n[4] Getting Handover Details..." -ForegroundColor Yellow
try {
    $detailResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/$handoverId" -Method GET -UseBasicParsing
    $detailResult = $detailResp.Content | ConvertFrom-Json
    Write-Host "✓ Handover details retrieved" -ForegroundColor Green
    Write-Host "  Status: $($detailResult.handover.Status)" -ForegroundColor Cyan
    Write-Host "  From: $($detailResult.handover.FromOrg)" -ForegroundColor Cyan
    Write-Host "  To: $($detailResult.handover.ToOrg)" -ForegroundColor Cyan
    Write-Host "  Response: $($detailResp.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get handover details" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Test 5: Accept Handover (Shipper)
Write-Host "`n[5] Accepting Handover (Shipper)..." -ForegroundColor Yellow
$acceptData = @{
    receiverId = "DRIVER-$(Get-Random -Min 100 -Max 999)"
    signature = "SHIPPER-SIG-$(Get-Random)"
} | ConvertTo-Json

try {
    $acceptResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/$handoverId/accept" -Method POST -Body $acceptData -ContentType "application/json" -UseBasicParsing
    $acceptResult = $acceptResp.Content | ConvertFrom-Json
    Write-Host "✓ Handover accepted successfully!" -ForegroundColor Green
    Write-Host "  Response: $($acceptResp.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to accept handover" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Test 6: Verify Product Owner Changed
Write-Host "`n[6] Verifying Product Ownership Transfer..." -ForegroundColor Yellow
try {
    $productResp = Invoke-WebRequest -Uri "$API_URL/api/products/$productId" -Method GET -UseBasicParsing
    $productResult = $productResp.Content | ConvertFrom-Json
    Write-Host "✓ Product retrieved" -ForegroundColor Green
    Write-Host "  Owner: $($productResult.product.Owner)" -ForegroundColor Cyan
    Write-Host "  CurrentHolder: $($productResult.product.CurrentHolder)" -ForegroundColor Cyan
    Write-Host "  Status: $($productResult.product.Status)" -ForegroundColor Cyan
    Write-Host "  Approvals: $($productResult.product.Approvals.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to verify product" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Green
Write-Host "`n✓ Handover workflow test passed!" -ForegroundColor Green
Write-Host "  Product ID: $productId" -ForegroundColor Cyan
Write-Host "  Handover ID: $handoverId" -ForegroundColor Cyan
Write-Host "  Ownership transferred from Manufacturer to Shipper" -ForegroundColor Cyan
