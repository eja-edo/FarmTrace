# V2 API Gateway Comprehensive Test
# PowerShell version with proper JSON handling

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000"
$TESTS_PASSED = 0
$TESTS_FAILED = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " V2 API GATEWAY COMPREHENSIVE TEST" -ForegroundColor Cyan
Write-Host " Testing: Products + Handovers + Workflows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generate unique product ID
$PRODUCT_ID = "PROD-API-$(Get-Date -Format 'HHmmss')-$((Get-Random -Maximum 9999).ToString('0000'))"
Write-Host "Product ID: $PRODUCT_ID" -ForegroundColor Yellow
Write-Host "API URL: $API_URL" -ForegroundColor Yellow
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host "=== $Name ===" -ForegroundColor Yellow
    try {
        & $Test
        Write-Host "✓ PASSED" -ForegroundColor Green
        $script:TESTS_PASSED++
    } catch {
        Write-Host "✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:TESTS_FAILED++
    }
    Write-Host ""
}

# TEST 1: Health Check
Test-Endpoint "TEST 1: Health Check" {
    $response = Invoke-RestMethod -Uri "$API_URL/health"
    if ($response.status -ne "OK") { throw "Health check failed" }
}

# TEST 2: Create Product (Manufacturer)
Test-Endpoint "TEST 2: Create Product (Manufacturer)" {
    $body = @{
        id = $PRODUCT_ID
        name = "Premium Rice"
        batch = "BATCH-001"
        origin = "An Giang"
        manufactureDate = "2025-11-26"
        metaHash = "ipfs://QmHash123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to create product" }
    Write-Host "  Created: $($response.data.id)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

# TEST 3: Get Product by ID
Test-Endpoint "TEST 3: Get Product by ID" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$PRODUCT_ID" `
        -Headers @{"X-User-Identity" = "manufacturer:user1"}
    
    if (!$response.success -or $response.data.id -ne $PRODUCT_ID) {
        throw "Product not found or ID mismatch"
    }
    Write-Host "  Status: $($response.data.status), Owner: $($response.data.owner)" -ForegroundColor Gray
}

# TEST 4: Get All Products
Test-Endpoint "TEST 4: Get All Products" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products" `
        -Headers @{"X-User-Identity" = "manufacturer:user1"}
    
    if (!$response.success -or $response.count -lt 1) {
        throw "No products found"
    }
    Write-Host "  Found $($response.count) products" -ForegroundColor Gray
}

# TEST 5: Request Handover (Manufacturer → Shipper)
$script:HANDOVER_ID = $null
Test-Endpoint "TEST 5: Request Handover (Manufacturer → Shipper)" {
    # Generate ECDSA signature
    $sigMessage = "handover-request-$PRODUCT_ID-shipper"
    $dockerCmd = "echo '$sigMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk | xxd -p -c 256"
    $signature = docker exec fabric-tools bash -c $dockerCmd 2>$null | Select-Object -Last 1
    
    Write-Host "  Generated signature ($($signature.Length) chars)" -ForegroundColor Gray
    
    $body = @{
        productId = $PRODUCT_ID
        shipperId = "SHIPPER-001"
        waybill = "WB-$(Get-Random)"
        signature = $signature.Trim()
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/manufacturer-shipper" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to request handover" }
    $script:HANDOVER_ID = $response.data.handoverId
    Write-Host "  Handover ID: $($script:HANDOVER_ID.Substring(0, [Math]::Min(40, $script:HANDOVER_ID.Length)))..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

# TEST 6: Get Handover Details
$script:NONCE = $null
Test-Endpoint "TEST 6: Get Handover Details" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$script:HANDOVER_ID" `
        -Headers @{"X-User-Identity" = "shipper:user1"}
    
    if (!$response.success -or $response.data.status -ne "PENDING") {
        throw "Handover not in PENDING state"
    }
    $script:NONCE = $response.data.nonce
    Write-Host "  Status: $($response.data.status), Nonce: $($script:NONCE.Substring(0, [Math]::Min(40, $script:NONCE.Length)))..." -ForegroundColor Gray
}

# TEST 7: Accept Handover (Shipper)
Test-Endpoint "TEST 7: Accept Handover (Shipper)" {
    # Generate acceptance signature with nonce
    $sigMessage = "$($script:HANDOVER_ID):$($script:NONCE):DRIVER-001"
    $dockerCmd = "echo '$sigMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp/keystore/*_sk | xxd -p -c 256"
    $signature = docker exec fabric-tools bash -c $dockerCmd 2>$null | Select-Object -Last 1
    
    Write-Host "  Generated signature ($($signature.Length) chars)" -ForegroundColor Gray
    
    $body = @{
        receiverId = "DRIVER-001"
        signature = $signature.Trim()
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$script:HANDOVER_ID/accept" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "shipper:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to accept handover" }
    Start-Sleep -Seconds 2
}

# TEST 8: Verify Product Owner Changed
Test-Endpoint "TEST 8: Verify Product Owner Changed to Shipper" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$PRODUCT_ID" `
        -Headers @{"X-User-Identity" = "shipper:user1"}
    
    if ($response.data.owner -ne "Shipper" -or $response.data.status -ne "InTransit") {
        throw "Owner not changed to Shipper or status not InTransit"
    }
    Write-Host "  Owner: $($response.data.owner), Status: $($response.data.status)" -ForegroundColor Gray
}

# TEST 9: Get Product History
Test-Endpoint "TEST 9: Get Product History (Audit Trail)" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$PRODUCT_ID/history" `
        -Headers @{"X-User-Identity" = "manufacturer:user1"}
    
    if (!$response.success -or $response.count -lt 2) {
        throw "Insufficient history records (expected >= 2)"
    }
    Write-Host "  Found $($response.count) history records" -ForegroundColor Gray
}

# TEST 10: Test Rejection Workflow
$script:REJECT_PRODUCT_ID = "PROD-REJECT-$(Get-Date -Format 'HHmmss')-$((Get-Random -Maximum 9999).ToString('0000'))"
$script:REJECT_HANDOVER_ID = $null

Test-Endpoint "TEST 10: Create Product for Rejection Test" {
    $body = @{
        id = $script:REJECT_PRODUCT_ID
        name = "Test Rice"
        batch = "TEST-BATCH"
        origin = "Test Origin"
        manufactureDate = "2025-11-26"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to create test product" }
    Start-Sleep -Seconds 2
}

Test-Endpoint "TEST 11: Request Handover for Rejection" {
    $sigMessage = "handover-request-$($script:REJECT_PRODUCT_ID)-shipper"
    $dockerCmd = "echo '$sigMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk | xxd -p -c 256"
    $signature = docker exec fabric-tools bash -c $dockerCmd 2>$null | Select-Object -Last 1
    
    $body = @{
        productId = $script:REJECT_PRODUCT_ID
        shipperId = "SHIPPER-001"
        waybill = "WB-REJECT"
        signature = $signature.Trim()
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/manufacturer-shipper" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "manufacturer:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to request handover" }
    $script:REJECT_HANDOVER_ID = $response.data.handoverId
    Start-Sleep -Seconds 2
}

Test-Endpoint "TEST 12: Reject Handover" {
    $sigMessage = "reject-$($script:REJECT_HANDOVER_ID)"
    $dockerCmd = "echo '$sigMessage' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp/keystore/*_sk | xxd -p -c 256"
    $signature = docker exec fabric-tools bash -c $dockerCmd 2>$null | Select-Object -Last 1
    
    $body = @{
        reason = "Damaged packaging detected"
        signature = $signature.Trim()
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/handovers/$script:REJECT_HANDOVER_ID/reject" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-User-Identity" = "shipper:user1"
        } `
        -Body $body
    
    if (!$response.success) { throw "Failed to reject handover" }
    Start-Sleep -Seconds 2
}

Test-Endpoint "TEST 12: Verify Rejection State" {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v2/products/$script:REJECT_PRODUCT_ID" `
        -Headers @{"X-User-Identity" = "manufacturer:user1"}
    
    if ($response.data.status -ne "HandoverFailed" -or $response.data.owner -ne "Manufacturer") {
        throw "Rejection state incorrect (Status: $($response.data.status), Owner: $($response.data.owner))"
    }
    Write-Host "  Status: $($response.data.status), Owner: $($response.data.owner)" -ForegroundColor Gray
}

# SUMMARY
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Product ID: $PRODUCT_ID" -ForegroundColor Yellow
Write-Host "Handover ID: $($script:HANDOVER_ID.Substring(0, [Math]::Min(40, $script:HANDOVER_ID.Length)))..." -ForegroundColor Yellow
Write-Host "Reject Product ID: $script:REJECT_PRODUCT_ID" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tests Passed: " -NoNewline
Write-Host "$TESTS_PASSED" -ForegroundColor Green
Write-Host "Tests Failed: " -NoNewline
Write-Host "$TESTS_FAILED" -ForegroundColor $(if ($TESTS_FAILED -eq 0) { "Green" } else { "Red" })
Write-Host "Total Tests: $($TESTS_PASSED + $TESTS_FAILED)" -ForegroundColor Cyan
Write-Host ""

if ($TESTS_FAILED -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " ✓ ALL TESTS PASSED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " ✗ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
