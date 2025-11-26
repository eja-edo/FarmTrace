# Complete Handover Workflow Test (Manufacturer → Shipper)
# Tests endpoints: Create Product → Request Handover → Get Details → Accept Handover

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " HANDOVER WORKFLOW TEST (M → S)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PRODUCT_ID = "PROD-FLOW-$(Get-Date -Format 'HHmmss')"
$HANDOVER_ID = $null
$NONCE = $null

# STEP 1: Create Product
Write-Host "STEP 1: Create Product" -ForegroundColor Yellow
Write-Host "POST /api/v2/products" -ForegroundColor Gray
$body = @{
    id = $PRODUCT_ID
    name = "Premium Rice - Handover Test"
    batch = "BATCH-FLOW-$(Get-Random)"
    origin = "An Giang"
    manufactureDate = "2025-11-26"
    metaHash = "ipfs://QmTestHandover"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$API_URL/api/v2/products" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-User-Identity" = "manufacturer:user1"
    } `
    -Body $body

Write-Host "  [OK] Product Created: $PRODUCT_ID" -ForegroundColor Green
Write-Host "  Status: $($response.data.status), Owner: $($response.data.owner)`n" -ForegroundColor Gray
Start-Sleep -Seconds 2

# STEP 2: Generate ECDSA Signature and Request Handover
Write-Host "STEP 2: Request Handover (Manufacturer → Shipper)" -ForegroundColor Yellow
Write-Host "POST /api/v2/handovers/manufacturer-shipper" -ForegroundColor Gray

# Generate signature using Docker container
$sigMessage = "handover-request-$PRODUCT_ID-shipper"
$dockerCmd = "echo '$sigMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk | od -A n -t x1 | tr -d ' \n'"
Write-Host "  Generating ECDSA signature..." -ForegroundColor Gray
$signature = docker exec fabric-tools bash -c $dockerCmd 2>$null
$signature = $signature.Trim()
Write-Host "  [OK] Signature generated: $($signature.Length) chars" -ForegroundColor Green

$body = @{
    productId = $PRODUCT_ID
    shipperId = "SHIPPER-001"
    waybill = "WB-$(Get-Random -Maximum 99999)"
    signature = $signature
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/manufacturer-shipper" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-User-Identity" = "manufacturer:user1"
    } `
    -Body $body

$HANDOVER_ID = $response.data.handoverId
Write-Host "  [OK] Handover Requested" -ForegroundColor Green
Write-Host "  Handover ID: $HANDOVER_ID" -ForegroundColor Cyan
Write-Host "  Status: $($response.data.status), From: $($response.data.fromOrg) → To: $($response.data.toOrg)`n" -ForegroundColor Gray
Start-Sleep -Seconds 2

# STEP 3: Get Handover Details (Extract Nonce)
Write-Host "STEP 3: Get Handover Details" -ForegroundColor Yellow
Write-Host "GET /api/v2/handovers/$HANDOVER_ID" -ForegroundColor Gray

$response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$HANDOVER_ID" `
    -Headers @{"X-User-Identity" = "shipper:user1"}

$NONCE = $response.data.nonce
Write-Host "  [OK] Handover Details Retrieved" -ForegroundColor Green
Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
Write-Host "  Nonce: $($NONCE.Substring(0, [Math]::Min(40, $NONCE.Length)))..." -ForegroundColor Cyan
Write-Host "  From: $($response.data.fromOrg) → To: $($response.data.toOrg)`n" -ForegroundColor Gray

# STEP 4: Accept Handover with Nonce-based Signature
Write-Host "STEP 4: Accept Handover (Shipper)" -ForegroundColor Yellow
Write-Host "POST /api/v2/handovers/$HANDOVER_ID/accept" -ForegroundColor Gray

# Generate acceptance signature with nonce
$receiverId = "DRIVER-001"
$acceptMessage = "${HANDOVER_ID}:${NONCE}:${receiverId}"
$dockerCmd = "echo '$acceptMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp/keystore/*_sk | od -A n -t x1 | tr -d ' \n'"
Write-Host "  Generating acceptance signature with nonce..." -ForegroundColor Gray
$acceptSignature = docker exec fabric-tools bash -c $dockerCmd 2>$null
$acceptSignature = $acceptSignature.Trim()
Write-Host "  [OK] Signature generated: $($acceptSignature.Length) chars" -ForegroundColor Green

$body = @{
    receiverId = $receiverId
    signature = $acceptSignature
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$HANDOVER_ID/accept" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-User-Identity" = "shipper:user1"
    } `
    -Body $body

Write-Host "  [OK] Handover Accepted" -ForegroundColor Green
Write-Host "  Status: $($response.data.status)`n" -ForegroundColor Gray
Start-Sleep -Seconds 2

# STEP 5: Verify Product Owner Changed
Write-Host "STEP 5: Verify Product Owner Changed to Shipper" -ForegroundColor Yellow
Write-Host "GET /api/v2/products/$PRODUCT_ID" -ForegroundColor Gray

$response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$PRODUCT_ID" `
    -Headers @{"X-User-Identity" = "shipper:user1"}

Write-Host "  [OK] Product Verified" -ForegroundColor Green
Write-Host "  Owner: $($response.data.owner) (Expected: Shipper)" -ForegroundColor $(if($response.data.owner -eq "Shipper"){"Green"}else{"Red"})
Write-Host "  Status: $($response.data.status) (Expected: InTransit)" -ForegroundColor $(if($response.data.status -eq "InTransit"){"Green"}else{"Red"})
Write-Host "  Current Holder: $($response.data.currentHolder)" -ForegroundColor Gray
Write-Host "  Pending Handover: $(if($response.data.pendingHandover){'Yes'}else{'None'})" -ForegroundColor Gray

# Check approval trail
$approvalCount = $response.data.approvals.Count
Write-Host "`n  Approval Trail: $approvalCount approval(s)" -ForegroundColor Cyan
foreach ($approval in $response.data.approvals) {
    Write-Host "    - $($approval.action) by $($approval.actorMSP) at $($approval.timestamp)" -ForegroundColor White
}

# SUMMARY
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " WORKFLOW TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Product ID: $PRODUCT_ID" -ForegroundColor Yellow
Write-Host "Handover ID: $HANDOVER_ID" -ForegroundColor Yellow
Write-Host ""

if ($response.data.owner -eq "Shipper" -and $response.data.status -eq "InTransit") {
    Write-Host "[SUCCESS] ALL STEPS PASSED" -ForegroundColor Green
    Write-Host "[SUCCESS] Product successfully transferred from Manufacturer to Shipper" -ForegroundColor Green
    Write-Host "[SUCCESS] Two-party approval workflow completed" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILED] VERIFICATION FAILED" -ForegroundColor Red
    Write-Host "  Owner: $($response.data.owner) (Expected: Shipper)" -ForegroundColor Red
    Write-Host "  Status: $($response.data.status) (Expected: InTransit)" -ForegroundColor Red
    exit 1
}
