# Simple test script to verify chaincode functions
$ErrorActionPreference = "Stop"

Write-Host "===================================="  -ForegroundColor Cyan
Write-Host "Testing Chaincode Functions" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Test 1: Create Product
Write-Host "`nTest 1: Creating product PROD001..." -ForegroundColor Yellow

docker exec fabric-tools peer chaincode invoke `
    -o orderer.example.com:7050 `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
    -C supplychain-channel `
    -n supplychain_cc `
    --peerAddresses peer0.manufacturer.example.com:7051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
    -c '{\"function\":\"CreateProduct\",\"Args\":[\"PROD001\",\"Test Widget\",\"BATCH123\",\"Vietnam\",\"2025-11-03\",\"admin\",\"ipfs123\"]}'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Product created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create product (may already exist)" -ForegroundColor Yellow
}

# Wait for transaction to commit
Start-Sleep -Seconds 3

# Test 2: Query Product
Write-Host "`nTest 2: Querying product PROD001..." -ForegroundColor Yellow

$result = docker exec fabric-tools peer chaincode query `
    -C supplychain-channel `
    -n supplychain_cc `
    -c '{\"function\":\"GetProduct\",\"Args\":[\"PROD001\"]}' 2>&1 | Out-String

if ($result -match "PROD001") {
    Write-Host "✓ Product query successful" -ForegroundColor Green
    Write-Host "`nProduct data:" -ForegroundColor Cyan
    Write-Host $result -ForegroundColor White
} else {
    Write-Host "✗ Failed to query product" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Yellow
}

# Test 3: Request Handover to Shipper
Write-Host "`nTest 3: Requesting handover to shipper..." -ForegroundColor Yellow

docker exec fabric-tools peer chaincode invoke `
    -o orderer.example.com:7050 `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
    -C supplychain-channel `
    -n supplychain_cc `
    --peerAddresses peer0.manufacturer.example.com:7051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
    -c '{\"function\":\"RequestHandoverToShipper\",\"Args\":[\"PROD001\",\"SHIP001\",\"WB123456\",\"signature123\"]}'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Handover request created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create handover request" -ForegroundColor Yellow
}

# Wait for transaction
Start-Sleep -Seconds 3

# Test 4: Get Pending Handovers
Write-Host "`nTest 4: Getting pending handovers..." -ForegroundColor Yellow

$pendingResult = docker exec fabric-tools peer chaincode query `
    -C supplychain-channel `
    -n supplychain_cc `
    -c '{\"function\":\"GetPendingHandoversForOrg\",\"Args\":[]}' 2>&1 | Out-String

if ($pendingResult -match "HANDOVER" -or $pendingResult -match "PENDING") {
    Write-Host "✓ Pending handovers retrieved" -ForegroundColor Green
    Write-Host "`nPending handovers:" -ForegroundColor Cyan
    Write-Host $pendingResult -ForegroundColor White
} else {
    Write-Host "Info: No pending handovers or error" -ForegroundColor Cyan
    Write-Host $pendingResult
}

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "Testing Completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
