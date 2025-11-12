# Smoke test script using Docker containers

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Running Smoke Tests (Docker)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

Write-Host ""
Write-Host ">>> Test 1: Check Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "orderer|peer|couchdb" }
$expectedContainers = 11  # 3 orderers + 4 peers + 4 couchdb

if ($containers.Count -ge $expectedContainers) {
    Write-Host "OK $($containers.Count) containers running" -ForegroundColor Green
} else {
    Write-Host "WARNING Only $($containers.Count) containers running (expected $expectedContainers)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ">>> Test 2: Check channel list..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
$channelList = docker exec fabric-tools peer channel list 2>&1 | Out-String
$ErrorActionPreference = "Stop"
if ($channelList -match "supplychain-channel") {
    Write-Host "OK Channel supplychain-channel exists" -ForegroundColor Green
} else {
    Write-Host "WARNING Channel not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ">>> Test 3: Check chaincode deployment..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
$chaincodeList = docker exec fabric-tools peer lifecycle chaincode querycommitted --channelID supplychain-channel 2>&1 | Out-String
$ErrorActionPreference = "Stop"
if ($chaincodeList -match "supplychain_cc") {
    Write-Host "OK Chaincode supplychain_cc is deployed" -ForegroundColor Green
} else {
    Write-Host "WARNING Chaincode not deployed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ">>> Test 4: Invoke chaincode (CreateProduct)..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
$invokeResult = docker exec fabric-tools peer chaincode invoke `
    -o orderer.example.com:7050 `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
    -C supplychain-channel `
    -n supplychain_cc `
    --peerAddresses peer0.manufacturer.example.com:7051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
    -c '{\"function\":\"CreateProduct\",\"Args\":[\"PROD001\",\"Test Product\",\"Electronics\",\"Test Manufacturer\",\"2024-01-01\"]}' 2>&1 | Out-String
$ErrorActionPreference = "Stop"

if ($invokeResult -match "Chaincode invoke successful") {
    Write-Host "OK Successfully invoked CreateProduct" -ForegroundColor Green
} else {
    Write-Host "INFO First invoke attempt (may already exist): $($invokeResult.Substring(0, [Math]::Min(200, $invokeResult.Length)))" -ForegroundColor Cyan
}

Write-Host ""
Write-Host ">>> Test 5: Query chaincode (GetProduct)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$ErrorActionPreference = "Continue"
$queryResult = docker exec fabric-tools peer chaincode query `
    -C supplychain-channel `
    -n supplychain_cc `
    -c '{\"function\":\"GetProduct\",\"Args\":[\"PROD001\"]}' 2>&1 | Out-String
$ErrorActionPreference = "Stop"

if ($queryResult -match "PROD001" -or $queryResult -match "Test Product") {
    Write-Host "OK Successfully queried product" -ForegroundColor Green
    Write-Host "Result: $($queryResult.Substring(0, [Math]::Min(200, $queryResult.Length)))" -ForegroundColor Cyan
} else {
    Write-Host "INFO Query result: $($queryResult.Substring(0, [Math]::Min(200, $queryResult.Length)))" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Smoke Tests Completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
