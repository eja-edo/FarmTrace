#!/usr/bin/env pwsh
# Smoke test script - basic functionality tests

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

$CHANNEL_NAME = "supplychain-channel"
$CC_NAME = "supplychain_cc"
$ORDERER_CA = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Running Smoke Tests" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

Write-Host "`n>>> Test 1: Query initial product..." -ForegroundColor Yellow

$queryCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{\"function\":\"GetProduct\",\"Args\":[\"PROD001\"]}'
"@

$result = docker exec cli bash -c $queryCmd
Write-Host $result -ForegroundColor Green

Write-Host "`n>>> Test 2: Create a new product..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyy-MM-dd"
$invokeCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_NAME \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  -c '{\"function\":\"CreateProduct\",\"Args\":[\"TEST001\",\"Test Product\",\"BATCH_TEST\",\"Test Factory\",\"$timestamp\",\"test_hash\"]}'
"@

docker exec cli bash -c $invokeCmd
Start-Sleep -Seconds 3

Write-Host "`n>>> Test 3: Query the new product..." -ForegroundColor Yellow

$queryCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{\"function\":\"GetProduct\",\"Args\":[\"TEST001\"]}'
"@

$result = docker exec cli bash -c $queryCmd
Write-Host $result -ForegroundColor Green

Write-Host "`n>>> Test 4: Ship the product..." -ForegroundColor Yellow

$invokeCmd = @"
export CORE_PEER_LOCALMSPID=OrgShipperMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_NAME \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  -c '{\"function\":\"ShipProduct\",\"Args\":[\"TEST001\",\"SHIPPER001\",\"WB123\",\"Test Warehouse\"]}'
"@

docker exec cli bash -c $invokeCmd
Start-Sleep -Seconds 3

Write-Host "`n>>> Test 5: Get product history..." -ForegroundColor Yellow

$queryCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{\"function\":\"GetProductHistory\",\"Args\":[\"TEST001\"]}'
"@

$result = docker exec cli bash -c $queryCmd
Write-Host $result -ForegroundColor Green

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "All smoke tests completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
