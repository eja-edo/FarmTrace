# PowerShell script to upgrade chaincode to v2.1 with Private Data Collections
# This upgrades supplychain_cc from v2.0 (sequence 1) to v2.1 (sequence 2)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Chaincode Upgrade - v2.1 with Private Data Collections" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$CC_NAME = "supplychain_cc"
$CC_VERSION = "2.1"
$CC_SEQUENCE = 2
$CHANNEL_NAME = "supplychain-channel"
$CC_PATH = "../../../chaincode/go"
$COLLECTIONS_CONFIG = "../../../chaincode/go/collections_config.json"

Write-Host "`n[1/7] Tidying Go dependencies..." -ForegroundColor Yellow
docker run --rm `
  -v ${PWD}/../../../chaincode/go:/work `
  -w /work `
  golang:1.19 go mod tidy

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to tidy Go modules" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Go modules tidied successfully" -ForegroundColor Green

Write-Host "`n[2/7] Packaging chaincode v2.1..." -ForegroundColor Yellow
docker exec fabric-tools bash -c "peer lifecycle chaincode package /chaincode/${CC_NAME}_${CC_VERSION}.tar.gz --path /chaincode/go --lang golang --label ${CC_NAME}_${CC_VERSION}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Chaincode packaging failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Chaincode packaged successfully" -ForegroundColor Green

Write-Host "`n[3/7] Installing chaincode on all peers..." -ForegroundColor Yellow

$PEERS = @(
    @{Name="peer0.manufacturer.example.com:7051"; MSP="OrgManufacturerMSP"; TLS="/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt"},
    @{Name="peer0.shipper.example.com:8051"; MSP="OrgShipperMSP"; TLS="/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt"},
    @{Name="peer0.warehouse.example.com:9051"; MSP="OrgWarehouseMSP"; TLS="/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt"},
    @{Name="peer0.retailer.example.com:10051"; MSP="OrgRetailerMSP"; TLS="/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt"}
)

foreach ($peer in $PEERS) {
    Write-Host "Installing on $($peer.Name)..." -ForegroundColor Cyan
    docker exec -e CORE_PEER_ADDRESS=$($peer.Name) `
                -e CORE_PEER_LOCALMSPID=$($peer.MSP) `
                -e CORE_PEER_TLS_ROOTCERT_FILE=$($peer.TLS) `
                fabric-tools bash -c "peer lifecycle chaincode install /chaincode/${CC_NAME}_${CC_VERSION}.tar.gz"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X Installation failed on $($peer.Name)" -ForegroundColor Red
    } else {
        Write-Host "OK Installed on $($peer.Name)" -ForegroundColor Green
    }
}

Write-Host "`n[4/7] Querying installed chaincode package ID..." -ForegroundColor Yellow
$PACKAGE_ID = docker exec fabric-tools bash -c "peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label==\"${CC_NAME}_${CC_VERSION}\") | .package_id'" | Out-String
$PACKAGE_ID = $PACKAGE_ID.Trim()

if ([string]::IsNullOrWhiteSpace($PACKAGE_ID)) {
    Write-Host "X Failed to get package ID" -ForegroundColor Red
    exit 1
}
Write-Host "OK Package ID: $PACKAGE_ID" -ForegroundColor Green

Write-Host "`n[5/7] Approving chaincode for all organizations..." -ForegroundColor Yellow

foreach ($peer in $PEERS) {
    Write-Host "Approving for $($peer.MSP)..." -ForegroundColor Cyan
    $approveCmd = "peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --collections-config /chaincode/go/collections_config.json"
    docker exec -e CORE_PEER_ADDRESS=$($peer.Name) `
                -e CORE_PEER_LOCALMSPID=$($peer.MSP) `
                -e CORE_PEER_TLS_ROOTCERT_FILE=$($peer.TLS) `
                fabric-tools bash -c $approveCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X Approval failed for $($peer.MSP)" -ForegroundColor Red
    } else {
        Write-Host "OK Approved by $($peer.MSP)" -ForegroundColor Green
    }
}

Write-Host "`n[6/7] Checking commit readiness..." -ForegroundColor Yellow
$checkCmd = "peer lifecycle chaincode checkcommitreadiness --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --collections-config /chaincode/go/collections_config.json --output json"
docker exec fabric-tools bash -c $checkCmd

Write-Host "`n[7/7] Committing chaincode definition..." -ForegroundColor Yellow
$commitCmd = "peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --collections-config /chaincode/go/collections_config.json --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt"
docker exec fabric-tools bash -c $commitCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nX CHAINCODE COMMIT FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "OK Chaincode v2.1 Upgrade Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Version: $CC_VERSION" -ForegroundColor Cyan
Write-Host "Sequence: $CC_SEQUENCE" -ForegroundColor Cyan
Write-Host "Private Data Collections: 3" -ForegroundColor Cyan
Write-Host "  - priceData (Manufacturer + Retailer)" -ForegroundColor Cyan
Write-Host "  - shipmentDetails (Shipper + Warehouse)" -ForegroundColor Cyan
Write-Host "  - handoverSignatures (All 4 orgs)" -ForegroundColor Cyan

Write-Host "`n[VERIFICATION] Query committed chaincode:" -ForegroundColor Yellow
$queryCmd = "peer lifecycle chaincode querycommitted --channelID ${CHANNEL_NAME} --name ${CC_NAME}"
docker exec fabric-tools bash -c $queryCmd
