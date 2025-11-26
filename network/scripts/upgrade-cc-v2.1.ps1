# PowerShell script to upgrade chaincode to v2.1 with Private Data Collections
$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Chaincode Upgrade - v2.1 with PDC"
Write-Host "========================================"

$CC_NAME = "supplychain_cc"
$CC_VERSION = "2.1"
$CC_SEQUENCE = "2"
$CHANNEL_NAME = "supplychain-channel"

# Step 1: Tidy Go modules
Write-Host "`n[1/7] Tidying Go dependencies..." -ForegroundColor Yellow
docker run --rm -v ${PWD}/../../../chaincode/go:/work -w /work golang:1.19 go mod tidy
Write-Host "OK Go modules tidied" -ForegroundColor Green

# Step 2: Package chaincode
Write-Host "`n[2/7] Packaging chaincode v2.1..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode package /chaincode/supplychain_cc_2.1.tar.gz --path /chaincode/go --lang golang --label supplychain_cc_2.1
Write-Host "OK Chaincode packaged" -ForegroundColor Green

# Step 3: Install on all peers
Write-Host "`n[3/7] Installing on all peers..." -ForegroundColor Yellow

Write-Host "Installing on Manufacturer..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051 -e CORE_PEER_LOCALMSPID=OrgManufacturerMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode install /chaincode/supplychain_cc_2.1.tar.gz

Write-Host "Installing on Shipper..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.shipper.example.com:8051 -e CORE_PEER_LOCALMSPID=OrgShipperMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode install /chaincode/supplychain_cc_2.1.tar.gz

Write-Host "Installing on Warehouse..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051 -e CORE_PEER_LOCALMSPID=OrgWarehouseMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode install /chaincode/supplychain_cc_2.1.tar.gz

Write-Host "Installing on Retailer..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.retailer.example.com:10051 -e CORE_PEER_LOCALMSPID=OrgRetailerMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode install /chaincode/supplychain_cc_2.1.tar.gz

Write-Host "OK Installed on all 4 peers" -ForegroundColor Green

# Step 4: Get package ID
Write-Host "`n[4/7] Querying package ID..." -ForegroundColor Yellow
$PACKAGE_ID_RAW = docker exec fabric-tools peer lifecycle chaincode queryinstalled --output json
$PACKAGE_ID = ($PACKAGE_ID_RAW | ConvertFrom-Json).installed_chaincodes | Where-Object { $_.label -eq "supplychain_cc_2.1" } | Select-Object -ExpandProperty package_id

if ([string]::IsNullOrEmpty($PACKAGE_ID)) {
    Write-Host "X Failed to get package ID" -ForegroundColor Red
    exit 1
}
Write-Host "OK Package ID: $PACKAGE_ID" -ForegroundColor Green

# Step 5: Approve for all orgs
Write-Host "`n[5/7] Approving for all organizations..." -ForegroundColor Yellow

Write-Host "Approving for Manufacturer..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051 -e CORE_PEER_LOCALMSPID=OrgManufacturerMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID supplychain-channel --name supplychain_cc --version 2.1 --package-id $PACKAGE_ID --sequence 2 --collections-config /chaincode/go/collections_config.json

Write-Host "Approving for Shipper..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.shipper.example.com:8051 -e CORE_PEER_LOCALMSPID=OrgShipperMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID supplychain-channel --name supplychain_cc --version 2.1 --package-id $PACKAGE_ID --sequence 2 --collections-config /chaincode/go/collections_config.json

Write-Host "Approving for Warehouse..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051 -e CORE_PEER_LOCALMSPID=OrgWarehouseMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID supplychain-channel --name supplychain_cc --version 2.1 --package-id $PACKAGE_ID --sequence 2 --collections-config /chaincode/go/collections_config.json

Write-Host "Approving for Retailer..." -ForegroundColor Cyan
docker exec -e CORE_PEER_ADDRESS=peer0.retailer.example.com:10051 -e CORE_PEER_LOCALMSPID=OrgRetailerMSP -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt fabric-tools peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID supplychain-channel --name supplychain_cc --version 2.1 --package-id $PACKAGE_ID --sequence 2 --collections-config /chaincode/go/collections_config.json

Write-Host "OK All organizations approved" -ForegroundColor Green

# Step 6: Check readiness
Write-Host "`n[6/7] Checking commit readiness..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode checkcommitreadiness --channelID supplychain-channel --name supplychain_cc --version 2.1 --sequence 2 --collections-config /chaincode/go/collections_config.json --output json

# Step 7: Commit
Write-Host "`n[7/7] Committing chaincode..." -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID supplychain-channel --name supplychain_cc --version 2.1 --sequence 2 --collections-config /chaincode/go/collections_config.json --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt

Write-Host "`n========================================"
Write-Host "OK Chaincode v2.1 Deployed!" -ForegroundColor Green
Write-Host "========================================"
Write-Host "Version: 2.1, Sequence: 2" -ForegroundColor Cyan
Write-Host "Private Data Collections: 3" -ForegroundColor Cyan
Write-Host "  - priceData (Manufacturer + Retailer)" -ForegroundColor Cyan
Write-Host "  - shipmentDetails (Shipper + Warehouse)" -ForegroundColor Cyan
Write-Host "  - handoverSignatures (All 4 orgs)" -ForegroundColor Cyan

Write-Host "`n[VERIFICATION]" -ForegroundColor Yellow
docker exec fabric-tools peer lifecycle chaincode querycommitted --channelID supplychain-channel --name supplychain_cc
