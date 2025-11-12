# Deploy chaincode using Docker CLI container

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Deploying chaincode using Docker..." -ForegroundColor Yellow

$CHANNEL_NAME = "supplychain-channel"
$CC_NAME = "supplychain_cc"
$CC_VERSION = "1.0"
$CC_SEQUENCE = 4
$CC_PATH = "../chaincode/go"

# Package chaincode
Write-Host "Packaging chaincode..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode package supplychain_cc.tar.gz `
    --path /opt/gopath/src/github.com/hyperledger/fabric/chaincode/go `
    --lang golang `
    --label supplychain_cc_1.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to package chaincode" -ForegroundColor Red
    exit 1
}

# Install on all peers
$peers = @(
    @{Org="OrgManufacturerMSP"; Peer="peer0.manufacturer.example.com:7051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt"},
    @{Org="OrgShipperMSP"; Peer="peer0.shipper.example.com:8051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt"},
    @{Org="OrgWarehouseMSP"; Peer="peer0.warehouse.example.com:9051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt"},
    @{Org="OrgRetailerMSP"; Peer="peer0.retailer.example.com:10051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt"}
)

foreach ($peer in $peers) {
    Write-Host "Installing chaincode on $($peer.Peer)..." -ForegroundColor Yellow
    
    docker exec `
        -e CORE_PEER_LOCALMSPID=$($peer.Org) `
        -e CORE_PEER_ADDRESS=$($peer.Peer) `
        -e CORE_PEER_MSPCONFIGPATH=$($peer.MspPath) `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$($peer.TlsCert) `
        fabric-tools peer lifecycle chaincode install supplychain_cc.tar.gz
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to install chaincode on $($peer.Peer)" -ForegroundColor Yellow
    } else {
        Write-Host "Successfully installed chaincode on $($peer.Peer)" -ForegroundColor Green
    }
}

# Get package ID
Write-Host "Querying installed chaincode..." -ForegroundColor Yellow
$packageId = docker exec fabric-tools peer lifecycle chaincode queryinstalled | Select-String -Pattern "supplychain_cc_1.0" | ForEach-Object { ($_ -split ", ")[0] -replace "Package ID: ", "" }

if (-not $packageId) {
    Write-Host "ERROR: Could not find package ID" -ForegroundColor Red
    exit 1
}

Write-Host "Package ID: $packageId" -ForegroundColor Cyan

# Approve for each org
foreach ($peer in $peers) {
    Write-Host "Approving chaincode for $($peer.Org)..." -ForegroundColor Yellow
    
    docker exec `
        -e CORE_PEER_LOCALMSPID=$($peer.Org) `
        -e CORE_PEER_ADDRESS=$($peer.Peer) `
        -e CORE_PEER_MSPCONFIGPATH=$($peer.MspPath) `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$($peer.TlsCert) `
        fabric-tools peer lifecycle chaincode approveformyorg `
        -o orderer.example.com:7050 `
        --channelID $CHANNEL_NAME `
        --name $CC_NAME `
        --version $CC_VERSION `
        --package-id $packageId `
        --sequence $CC_SEQUENCE `
        --tls `
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to approve chaincode for $($peer.Org)" -ForegroundColor Yellow
    } else {
        Write-Host "Successfully approved chaincode for $($peer.Org)" -ForegroundColor Green
    }
}

# Check commit readiness
Write-Host "Checking commit readiness..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode checkcommitreadiness `
    --channelID $CHANNEL_NAME `
    --name $CC_NAME `
    --version $CC_VERSION `
    --sequence $CC_SEQUENCE `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
    --output json

# Commit chaincode (need MAJORITY = 3/4 orgs)
Write-Host "Committing chaincode..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode commit `
    -o orderer.example.com:7050 `
    --channelID $CHANNEL_NAME `
    --name $CC_NAME `
    --version $CC_VERSION `
    --sequence $CC_SEQUENCE `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
    --peerAddresses peer0.manufacturer.example.com:7051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
    --peerAddresses peer0.shipper.example.com:8051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt `
    --peerAddresses peer0.warehouse.example.com:9051 `
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to commit chaincode" -ForegroundColor Red
    exit 1
}

Write-Host "Chaincode deployed successfully!" -ForegroundColor Green

# Query committed chaincode
Write-Host "Verifying deployment..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME

Write-Host "Chaincode deployment completed!" -ForegroundColor Green
