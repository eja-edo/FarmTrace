# Handover Workflow Test Script
$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000"

Write-Host "=== HANDOVER WORKFLOW TEST ===" -ForegroundColor Cyan

# Test 1: Create Product
Write-Host "[1] Creating Product..." -ForegroundColor Yellow
$productId = "PROD-HO-$(Get-Date -Format 'HHmmss')"
$product = "{`"id`":`"$productId`",`"name`":`"Handover Test Widget`",`"batch`":`"BATCH-TEST-001`",`"origin`":`"Vietnam Factory`",`"manufactureDate`":`"2025-11-03`",`"category`":`"Electronics`",`"description`":`"Testing handover workflow`"}"

$createResp = Invoke-WebRequest -Uri "$API_URL/api/products" -Method POST -Body $product -ContentType "application/json" -UseBasicParsing
Write-Host "Product created: $productId" -ForegroundColor Green
Start-Sleep -Seconds 2

# Test 2: Request Handover
Write-Host "[2] Requesting Handover to Shipper..." -ForegroundColor Yellow
$waybill = "WB-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$handoverRequest = "{`"productId`":`"$productId`",`"shipperId`":`"SHIPPER-001`",`"waybill`":`"$waybill`",`"signature`":`"MANUFACTURER-SIG-123`"}"

$requestResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/request-shipper" -Method POST -Body $handoverRequest -ContentType "application/json" -UseBasicParsing
$requestResult = $requestResp.Content | ConvertFrom-Json
$handoverId = $requestResult.handoverId
Write-Host "Handover requested: $handoverId" -ForegroundColor Green
Start-Sleep -Seconds 2

# Test 3: Get Pending Handovers
Write-Host "[3] Checking Pending Handovers..." -ForegroundColor Yellow
$pendingResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/pending" -Method GET -UseBasicParsing
$pendingResult = $pendingResp.Content | ConvertFrom-Json
Write-Host "Found $($pendingResult.count) pending handover(s)" -ForegroundColor Green
Start-Sleep -Seconds 1

# Test 4: Get Handover Details
Write-Host "[4] Getting Handover Details..." -ForegroundColor Yellow
$detailResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/$handoverId" -Method GET -UseBasicParsing
Write-Host "Handover details retrieved" -ForegroundColor Green
Write-Host $detailResp.Content
Start-Sleep -Seconds 2

# Test 5: Accept Handover
Write-Host "[5] Accepting Handover (Shipper)..." -ForegroundColor Yellow
$acceptData = "{`"receiverId`":`"DRIVER-001`",`"signature`":`"SHIPPER-SIG-456`"}"

$acceptResp = Invoke-WebRequest -Uri "$API_URL/api/handovers/$handoverId/accept" -Method POST -Body $acceptData -ContentType "application/json" -UseBasicParsing
Write-Host "Handover accepted successfully!" -ForegroundColor Green
Start-Sleep -Seconds 2

# Test 6: Verify Product Owner Changed
Write-Host "[6] Verifying Product Ownership Transfer..." -ForegroundColor Yellow
$productResp = Invoke-WebRequest -Uri "$API_URL/api/products/$productId" -Method GET -UseBasicParsing
$productResult = $productResp.Content | ConvertFrom-Json
Write-Host "Owner: $($productResult.product.Owner)" -ForegroundColor Cyan
Write-Host "CurrentHolder: $($productResult.product.CurrentHolder)" -ForegroundColor Cyan
Write-Host "Status: $($productResult.product.Status)" -ForegroundColor Cyan

Write-Host "=== TEST COMPLETED ===" -ForegroundColor Green
Write-Host "Product ID: $productId" -ForegroundColor Cyan
Write-Host "Handover ID: $handoverId" -ForegroundColor Cyan
