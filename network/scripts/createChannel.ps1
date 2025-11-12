#!/usr/bin/env pwsh
# Create and join channel

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

$CHANNEL_NAME = "supplychain-channel"
$ORDERER_CA = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

Write-Host "Creating and joining channel: $CHANNEL_NAME" -ForegroundColor Yellow

# Function to set peer environment
function Set-PeerEnv {
    param(
        [string]$Org,
        [int]$PeerNum = 0
    )
    
    $env:CORE_PEER_LOCALMSPID = "${Org}MSP"
    $env:CORE_PEER_TLS_ROOTCERT_FILE = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${Org}.example.com/peers/peer${PeerNum}.${Org}.example.com/tls/ca.crt"
    $env:CORE_PEER_MSPCONFIGPATH = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${Org}.example.com/users/Admin@${Org}.example.com/msp"
    
    switch ($Org) {
        "manufacturer" { $env:CORE_PEER_ADDRESS = "peer${PeerNum}.manufacturer.example.com:7051" }
        "shipper" { $env:CORE_PEER_ADDRESS = "peer${PeerNum}.shipper.example.com:8051" }
        "warehouse" { $env:CORE_PEER_ADDRESS = "peer${PeerNum}.warehouse.example.com:9051" }
        "retailer" { $env:CORE_PEER_ADDRESS = "peer${PeerNum}.retailer.example.com:10051" }
    }
}

Write-Host "`n>>> Creating channel..." -ForegroundColor Yellow

# Create channel on manufacturer peer
$createChannelCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA
"@

docker exec cli bash -c $createChannelCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create channel" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 5

Write-Host "`n>>> Joining peers to channel..." -ForegroundColor Yellow

# Join Manufacturer peer
Write-Host "Joining Manufacturer peer..." -ForegroundColor Cyan
$joinCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
"@
docker exec cli bash -c $joinCmd

# Join Shipper peer
Write-Host "Joining Shipper peer..." -ForegroundColor Cyan
$joinCmd = @"
export CORE_PEER_LOCALMSPID=OrgShipperMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
"@
docker exec cli bash -c $joinCmd

# Join Warehouse peer
Write-Host "Joining Warehouse peer..." -ForegroundColor Cyan
$joinCmd = @"
export CORE_PEER_LOCALMSPID=OrgWarehouseMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp
export CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051

peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
"@
docker exec cli bash -c $joinCmd

# Join Retailer peer
Write-Host "Joining Retailer peer..." -ForegroundColor Cyan
$joinCmd = @"
export CORE_PEER_LOCALMSPID=OrgRetailerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp
export CORE_PEER_ADDRESS=peer0.retailer.example.com:10051

peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
"@
docker exec cli bash -c $joinCmd

Start-Sleep -Seconds 3

Write-Host "`n>>> Updating anchor peers..." -ForegroundColor Yellow

# Update anchor peer for Manufacturer
$updateAnchorCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer channel update -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/OrgManufacturerMSPanchors.tx --tls --cafile $ORDERER_CA
"@
docker exec cli bash -c $updateAnchorCmd

Write-Host "`nChannel created and peers joined successfully!" -ForegroundColor Green
