# Complete Handover Workflow Test - AUTO SIGNATURE VERSION
# Gateway tự động generate ECDSA signature, UI chỉ cần gửi business data

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " HANDOVER WORKFLOW - AUTO SIGNATURE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PRODUCT_ID = "PROD-AUTO-$(Get-Date -Format 'HHmmss')"
$HANDOVER_ID = $null
$testsPassed = 0
$testsFailed = 0

# STEP 1: Create Product (Manufacturer)
Write-Host "STEP 1: Create Product (Manufacturer)" -ForegroundColor Yellow
Write-Host "POST /api/v2/products" -ForegroundColor Gray
try {
    $body = @{
        id = $PRODUCT_ID
        name = "Premium Rice - Auto Signature Test"
        batch = "BATCH-AUTO-$(Get-Random)"
        origin = "An Giang Province"
        manufactureDate = "2025-11-26"
        metaHash = "ipfs://QmAutoSigTest123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body

    Write-Host "  [PASS] Product Created: $PRODUCT_ID" -ForegroundColor Green
    Write-Host "  Status: $($response.data.status), Owner: $($response.data.owner)`n" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Seconds 2

# STEP 2: Request Handover M→S (AUTO SIGNATURE - NO SIGNATURE SENT!)
Write-Host "STEP 2: Request Handover (Manufacturer → Shipper)" -ForegroundColor Yellow
Write-Host "POST /api/v2/handovers/manufacturer-shipper" -ForegroundColor Gray
Write-Host "  Note: NO signature in request body - gateway auto-generates!" -ForegroundColor Cyan
try {
    $body = @{
        productId = $PRODUCT_ID
        shipperId = "SHIPPER-AUTO-001"
        waybill = "WB-AUTO-$(Get-Random -Maximum 99999)"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/manufacturer-shipper" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body

    $HANDOVER_ID = $response.data.handoverId
    Write-Host "  [PASS] Handover Requested" -ForegroundColor Green
    Write-Host "  Handover ID: $HANDOVER_ID" -ForegroundColor Cyan
    Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
    Write-Host "  From: $($response.data.fromOrg) → To: $($response.data.toOrg)`n" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Seconds 2

# STEP 3: Get Handover Details (verify nonce exists)
Write-Host "STEP 3: Get Handover Details" -ForegroundColor Yellow
Write-Host "GET /api/v2/handovers/$HANDOVER_ID" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$HANDOVER_ID" `
        -Headers @{"X-User-Identity" = "shipper:user1"}

    $NONCE = $response.data.nonce
    Write-Host "  [PASS] Handover Details Retrieved" -ForegroundColor Green
    Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
    Write-Host "  Nonce: $($NONCE.Substring(0, [Math]::Min(40, $NONCE.Length)))..." -ForegroundColor Cyan
    Write-Host "  From: $($response.data.fromOrg) → To: $($response.data.toOrg)`n" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
    exit 1
}

# STEP 4: Accept Handover (AUTO SIGNATURE WITH NONCE - NO SIGNATURE SENT!)
Write-Host "STEP 4: Accept Handover (Shipper)" -ForegroundColor Yellow
Write-Host "POST /api/v2/handovers/$HANDOVER_ID/accept" -ForegroundColor Gray
Write-Host "  Note: Gateway fetches nonce and auto-generates signature!" -ForegroundColor Cyan
try {
    $body = @{
        receiverId = "DRIVER-AUTO-001"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$HANDOVER_ID/accept" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "shipper:user1"
        } `
        -Body $body

    Write-Host "  [PASS] Handover Accepted" -ForegroundColor Green
    Write-Host "  Status: $($response.data.status)`n" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
    exit 1
}

Start-Sleep -Seconds 2

# STEP 5: Verify Product Ownership Changed
Write-Host "STEP 5: Verify Product Owner Changed to Shipper" -ForegroundColor Yellow
Write-Host "GET /api/v2/products/$PRODUCT_ID" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$PRODUCT_ID" `
        -Headers @{"X-User-Identity" = "shipper:user1"}

    $ownerValid = $response.data.owner -eq "Shipper"
    $statusValid = $response.data.status -eq "InTransit"

    if ($ownerValid -and $statusValid) {
        Write-Host "  [PASS] Product Ownership Verified" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  [FAIL] Ownership verification failed" -ForegroundColor Red
        $testsFailed++
    }

    Write-Host "  Owner: $($response.data.owner) (Expected: Shipper)" -ForegroundColor $(if($ownerValid){"Green"}else{"Red"})
    Write-Host "  Status: $($response.data.status) (Expected: InTransit)" -ForegroundColor $(if($statusValid){"Green"}else{"Red"})
    Write-Host "  Current Holder: $($response.data.currentHolder)" -ForegroundColor Gray
    Write-Host "  Pending Handover: $(if($response.data.pendingHandover){'Yes'}else{'None'})" -ForegroundColor Gray

    # Check approval trail
    $approvalCount = $response.data.approvals.Count
    Write-Host "`n  Approval Trail: $approvalCount approval(s)" -ForegroundColor Cyan
    foreach ($approval in $response.data.approvals) {
        Write-Host "    - $($approval.action) by $($approval.actorMSP) at $($approval.timestamp)" -ForegroundColor White
    }
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# SUMMARY
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product ID: $PRODUCT_ID" -ForegroundColor Yellow
Write-Host "Handover ID: $HANDOVER_ID" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if($testsFailed -gt 0){"Red"}else{"Gray"})
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "[SUCCESS] ALL TESTS PASSED" -ForegroundColor Green
    Write-Host "[SUCCESS] Auto-signature generation working correctly!" -ForegroundColor Green
    Write-Host "[SUCCESS] UI does NOT need to handle cryptography!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILED] $testsFailed test(s) failed" -ForegroundColor Red
    exit 1
}
