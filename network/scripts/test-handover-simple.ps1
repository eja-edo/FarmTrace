#!/usr/bin/env pwsh
# Test Handover Workflow - Simple 6-step validation
# Tests: Create Product → Request Handover → Get Pending → Get Details → Accept → Verify Transfer

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3000/api"

Write-Host "`n=== HANDOVER WORKFLOW TEST ===" -ForegroundColor Cyan
Write-Host "Testing 6-step handover approval process`n" -ForegroundColor Cyan

# Generate unique IDs with timestamp
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$PRODUCT_ID = "PROD-$timestamp"
$HANDOVER_ID = "HANDOVER-$PRODUCT_ID-SHIPPER"

# Test data
$productData = @{
    productId = $PRODUCT_ID
    name = "Test Widget $timestamp"
    category = "Electronics"
    manufacturer = "OrgManufacturer"
    manufacturingDate = "2025-01-15T10:00:00Z"
    expiryDate = "2026-01-15T10:00:00Z"
    batchNumber = "BATCH-$timestamp"
    serialNumber = "SN-$timestamp"
    quantity = 100
    unitPrice = 299.99
    currency = "USD"
    certifications = @("ISO9001", "CE")
    qualityScore = 95.5
    description = "Test product for handover workflow"
} | ConvertTo-Json -Depth 10

$handoverRequest = @{
    productId = $PRODUCT_ID
    shipperId = "SHIP001"
    waybill = "WB-$timestamp"
    signature = "SIGNATURE_MANUFACTURER_$timestamp"
} | ConvertTo-Json

$acceptRequest = @{
    receiverId = "DRIVER-001"
    signature = "SIGNATURE_SHIPPER_$timestamp"
} | ConvertTo-Json

function Test-ApiHealth {
    try {
        $response = Invoke-WebRequest -Uri "$API_URL/products" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

# Check API health
Write-Host "[0/6] Checking API connectivity..." -ForegroundColor Yellow
if (Test-ApiHealth) {
    Write-Host "✓ API is reachable" -ForegroundColor Green
} else {
    Write-Host "✗ API is NOT reachable at $API_URL" -ForegroundColor Red
    Write-Host "   Please ensure API Gateway is running: cd apps/gateway-nodejs ; node src/index.js" -ForegroundColor Yellow
    exit 1
}

# Step 1: Create Product (Manufacturer)
Write-Host "`n[1/6] Creating test product..." -ForegroundColor Yellow
Write-Host "      Product ID: $PRODUCT_ID" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$API_URL/products" `
        -Method POST `
        -ContentType "application/json" `
        -Body $productData `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✓ Product created successfully" -ForegroundColor Green
        Write-Host "   Owner: $($result.data.owner)" -ForegroundColor Gray
        Write-Host "   Status: $($result.data.status)" -ForegroundColor Gray
    } else {
        throw "Failed to create product: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to create product" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Request Handover to Shipper (Manufacturer)
Write-Host "`n[2/6] Requesting handover to shipper..." -ForegroundColor Yellow
Write-Host "      Shipper ID: SHIP001" -ForegroundColor Gray
Write-Host "      Waybill: WB-$timestamp" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/request-shipper" `
        -Method POST `
        -ContentType "application/json" `
        -Body $handoverRequest `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✓ Handover requested successfully" -ForegroundColor Green
        Write-Host "   Handover ID: $($result.data.handoverId)" -ForegroundColor Gray
        Write-Host "   Status: $($result.data.status)" -ForegroundColor Gray
        Write-Host "   From: $($result.data.fromOrg)" -ForegroundColor Gray
        Write-Host "   To: $($result.data.toOrg)" -ForegroundColor Gray
    } else {
        throw "Failed to request handover: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to request handover" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get Pending Handovers (Shipper view)
Write-Host "`n[3/6] Getting pending handovers for shipper..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/pending" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        $pendingCount = $result.data.Count
        Write-Host "✓ Retrieved $pendingCount pending handover(s)" -ForegroundColor Green
        
        $ourHandover = $result.data | Where-Object { $_.productId -eq $PRODUCT_ID }
        if ($ourHandover) {
            Write-Host "   Found our handover: $($ourHandover.handoverId)" -ForegroundColor Gray
            Write-Host "   Product: $($ourHandover.productId)" -ForegroundColor Gray
            Write-Host "   Status: $($ourHandover.status)" -ForegroundColor Gray
        } else {
            Write-Host "   Warning: Our handover not found in pending list" -ForegroundColor Yellow
        }
    } else {
        throw "Failed to get pending handovers: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to get pending handovers" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Get Handover Details
Write-Host "`n[4/6] Getting handover details..." -ForegroundColor Yellow
Write-Host "      Handover ID: $HANDOVER_ID" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/$HANDOVER_ID" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✓ Retrieved handover details" -ForegroundColor Green
        Write-Host "   Product: $($result.data.productId)" -ForegroundColor Gray
        Write-Host "   From: $($result.data.fromOrg)" -ForegroundColor Gray
        Write-Host "   To: $($result.data.toOrg)" -ForegroundColor Gray
        Write-Host "   Status: $($result.data.status)" -ForegroundColor Gray
        Write-Host "   Waybill: $($result.data.waybill)" -ForegroundColor Gray
    } else {
        throw "Failed to get handover details: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to get handover details" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Accept Handover (Shipper)
Write-Host "`n[5/6] Accepting handover (Shipper)..." -ForegroundColor Yellow
Write-Host "      Receiver ID: DRIVER-001" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$API_URL/handovers/$HANDOVER_ID/accept" `
        -Method POST `
        -ContentType "application/json" `
        -Body $acceptRequest `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✓ Handover accepted successfully" -ForegroundColor Green
        Write-Host "   Handover ID: $($result.data.handoverId)" -ForegroundColor Gray
        Write-Host "   Status: $($result.data.status)" -ForegroundColor Gray
        Write-Host "   Approved By: $($result.data.approvedBy)" -ForegroundColor Gray
        Write-Host "   Receiver: $($result.data.receiverId)" -ForegroundColor Gray
    } else {
        throw "Failed to accept handover: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to accept handover" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 6: Verify Ownership Transfer
Write-Host "`n[6/6] Verifying ownership transfer..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/products/$PRODUCT_ID" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        $product = $result.data
        
        if ($product.owner -eq "OrgShipper") {
            Write-Host "✓ Ownership transferred successfully!" -ForegroundColor Green
            Write-Host "   Previous Owner: OrgManufacturer" -ForegroundColor Gray
            Write-Host "   New Owner: $($product.owner)" -ForegroundColor Gray
            Write-Host "   Current Holder: $($product.currentHolder)" -ForegroundColor Gray
            Write-Host "   Status: $($product.status)" -ForegroundColor Gray
            Write-Host "   Pending Handover: $($product.pendingHandover)" -ForegroundColor Gray
            
            if ($product.approvals -and $product.approvals.Count -gt 0) {
                Write-Host "   Approvals: $($product.approvals.Count) recorded" -ForegroundColor Gray
            }
        } else {
            Write-Host "✗ Ownership transfer failed!" -ForegroundColor Red
            Write-Host "   Expected Owner: OrgShipper" -ForegroundColor Red
            Write-Host "   Actual Owner: $($product.owner)" -ForegroundColor Red
            exit 1
        }
    } else {
        throw "Failed to get product details: $($result.error)"
    }
} catch {
    Write-Host "✗ Failed to verify ownership transfer" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Success summary
Write-Host "`n=== TEST COMPLETED SUCCESSFULLY ===" -ForegroundColor Green
Write-Host "✓ All 6 steps passed" -ForegroundColor Green
Write-Host "✓ Handover workflow validated end-to-end" -ForegroundColor Green
Write-Host "✓ Ownership transferred from Manufacturer to Shipper" -ForegroundColor Green
Write-Host "`nTest Product ID: $PRODUCT_ID" -ForegroundColor Cyan
Write-Host "Handover ID: $HANDOVER_ID" -ForegroundColor Cyan
