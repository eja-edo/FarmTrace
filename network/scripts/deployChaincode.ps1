#!/usr/bin/env pwsh
# Deploy chaincode to all peers

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

$CHANNEL_NAME = "supplychain-channel"
$CC_NAME = "supplychain_cc"
$CC_VERSION = "1.0"
$CC_SEQUENCE = "1"
$CC_SRC_PATH = "/opt/gopath/src/github.com/chaincode/go"
$ORDERER_CA = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

Write-Host "Deploying chaincode: $CC_NAME v$CC_VERSION" -ForegroundColor Yellow

Write-Host "`n>>> Step 1: Package chaincode..." -ForegroundColor Yellow

$packageCmd = @"
peer lifecycle chaincode package ${CC_NAME}.tar.gz --path $CC_SRC_PATH --lang golang --label ${CC_NAME}_${CC_VERSION}
"@

docker exec cli bash -c $packageCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to package chaincode" -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> Step 2: Install chaincode on all peers..." -ForegroundColor Yellow

# Install on Manufacturer peer
Write-Host "Installing on Manufacturer peer..." -ForegroundColor Cyan
$installCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer lifecycle chaincode install ${CC_NAME}.tar.gz
"@
docker exec cli bash -c $installCmd

# Install on Shipper peer
Write-Host "Installing on Shipper peer..." -ForegroundColor Cyan
$installCmd = @"
export CORE_PEER_LOCALMSPID=OrgShipperMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer lifecycle chaincode install ${CC_NAME}.tar.gz
"@
docker exec cli bash -c $installCmd

# Install on Warehouse peer
Write-Host "Installing on Warehouse peer..." -ForegroundColor Cyan
$installCmd = @"
export CORE_PEER_LOCALMSPID=OrgWarehouseMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp
export CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051

peer lifecycle chaincode install ${CC_NAME}.tar.gz
"@
docker exec cli bash -c $installCmd

# Install on Retailer peer
Write-Host "Installing on Retailer peer..." -ForegroundColor Cyan
$installCmd = @"
export CORE_PEER_LOCALMSPID=OrgRetailerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp
export CORE_PEER_ADDRESS=peer0.retailer.example.com:10051

peer lifecycle chaincode install ${CC_NAME}.tar.gz
"@
docker exec cli bash -c $installCmd

Write-Host "`n>>> Step 3: Query installed chaincode to get package ID..." -ForegroundColor Yellow

$queryCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer lifecycle chaincode queryinstalled
"@

$output = docker exec cli bash -c $queryCmd
Write-Host $output

# Extract package ID
$PACKAGE_ID = ($output | Select-String -Pattern "${CC_NAME}_${CC_VERSION}:([a-f0-9]+)" | ForEach-Object { $_.Matches.Groups[0].Value })
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Cyan

if (-not $PACKAGE_ID) {
    Write-Host "ERROR: Could not find package ID" -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> Step 4: Approve chaincode for each organization..." -ForegroundColor Yellow

# Approve for Manufacturer
Write-Host "Approving for Manufacturer..." -ForegroundColor Cyan
$approveCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA
"@
docker exec cli bash -c $approveCmd

# Approve for Shipper
Write-Host "Approving for Shipper..." -ForegroundColor Cyan
$approveCmd = @"
export CORE_PEER_LOCALMSPID=OrgShipperMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA
"@
docker exec cli bash -c $approveCmd

# Approve for Warehouse
Write-Host "Approving for Warehouse..." -ForegroundColor Cyan
$approveCmd = @"
export CORE_PEER_LOCALMSPID=OrgWarehouseMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp
export CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051

peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA
"@
docker exec cli bash -c $approveCmd

# Approve for Retailer
Write-Host "Approving for Retailer..." -ForegroundColor Cyan
$approveCmd = @"
export CORE_PEER_LOCALMSPID=OrgRetailerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp
export CORE_PEER_ADDRESS=peer0.retailer.example.com:10051

peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --tls --cafile $ORDERER_CA
"@
docker exec cli bash -c $approveCmd

Write-Host "`n>>> Step 5: Check commit readiness..." -ForegroundColor Yellow

$checkCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --output json
"@

$readiness = docker exec cli bash -c $checkCmd
Write-Host $readiness

Write-Host "`n>>> Step 6: Commit chaincode definition..." -ForegroundColor Yellow

$commitCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE \
  --tls --cafile $ORDERER_CA \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  --peerAddresses peer0.retailer.example.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
"@

docker exec cli bash -c $commitCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to commit chaincode" -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> Step 7: Initialize chaincode..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

$initCmd = @"
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_NAME \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  -c '{\"function\":\"InitLedger\",\"Args\":[]}'
"@

docker exec cli bash -c $initCmd

Write-Host "`nChaincode deployed successfully!" -ForegroundColor Green
