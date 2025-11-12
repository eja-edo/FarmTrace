# Create channel using Docker CLI container

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Creating channel using Docker..." -ForegroundColor Yellow

# Wait for network to be ready
Start-Sleep -Seconds 5

# Start fabric-tools container temporarily
docker-compose -f docker-compose-tools.yaml up -d

# Wait for tools container to start
Start-Sleep -Seconds 3

# Create channel
Write-Host "Creating supplychain-channel..." -ForegroundColor Yellow
docker exec fabric-tools peer channel create `
    -o orderer.example.com:7050 `
    -c supplychain-channel `
    -f ./channel-artifacts/supplychain-channel.tx `
    --outputBlock ./channel-artifacts/supplychain-channel.block `
    --tls `
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create channel" -ForegroundColor Red
    docker-compose -f docker-compose-tools.yaml down
    exit 1
}

# Join peers to channel
$peers = @(
    @{Org="OrgManufacturerMSP"; Peer="peer0.manufacturer.example.com:7051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt"},
    @{Org="OrgShipperMSP"; Peer="peer0.shipper.example.com:8051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt"},
    @{Org="OrgWarehouseMSP"; Peer="peer0.warehouse.example.com:9051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt"},
    @{Org="OrgRetailerMSP"; Peer="peer0.retailer.example.com:10051"; MspPath="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp"; TlsCert="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt"}
)

foreach ($peer in $peers) {
    Write-Host "Joining $($peer.Peer) to channel..." -ForegroundColor Yellow
    
    docker exec `
        -e CORE_PEER_LOCALMSPID=$($peer.Org) `
        -e CORE_PEER_ADDRESS=$($peer.Peer) `
        -e CORE_PEER_MSPCONFIGPATH=$($peer.MspPath) `
        -e CORE_PEER_TLS_ROOTCERT_FILE=$($peer.TlsCert) `
        fabric-tools peer channel join -b ./channel-artifacts/supplychain-channel.block
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to join $($peer.Peer) to channel" -ForegroundColor Yellow
    } else {
        Write-Host "Successfully joined $($peer.Peer) to channel" -ForegroundColor Green
    }
}

Write-Host "Channel created and peers joined successfully!" -ForegroundColor Green
