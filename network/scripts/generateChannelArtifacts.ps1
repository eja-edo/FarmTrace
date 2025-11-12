#!/usr/bin/env pwsh
# Generate genesis block and channel artifacts

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Generating channel artifacts..." -ForegroundColor Yellow

# Check if configtxgen is available
$configtxgen = Get-Command configtxgen -ErrorAction SilentlyContinue
if (-not $configtxgen) {
    Write-Host "ERROR: configtxgen tool not found. Please install Hyperledger Fabric binaries." -ForegroundColor Red
    exit 1
}

# Create directories
New-Item -ItemType Directory -Force -Path "system-genesis-block" | Out-Null
New-Item -ItemType Directory -Force -Path "channel-artifacts" | Out-Null

# Set config path
$env:FABRIC_CFG_PATH = "$PWD"

# Generate genesis block
Write-Host "Generating genesis block..." -ForegroundColor Yellow
configtxgen -profile SupplyChainOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate genesis block" -ForegroundColor Red
    exit 1
}

# Generate channel creation transaction
Write-Host "Generating channel creation transaction..." -ForegroundColor Yellow
configtxgen -profile SupplyChainChannel -outputCreateChannelTx ./channel-artifacts/supplychain-channel.tx -channelID supplychain-channel

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate channel transaction" -ForegroundColor Red
    exit 1
}

# Generate anchor peer transactions
Write-Host "Generating anchor peer updates..." -ForegroundColor Yellow

configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate ./channel-artifacts/OrgManufacturerMSPanchors.tx -channelID supplychain-channel -asOrg OrgManufacturerMSP
configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate ./channel-artifacts/OrgShipperMSPanchors.tx -channelID supplychain-channel -asOrg OrgShipperMSP
configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate ./channel-artifacts/OrgWarehouseMSPanchors.tx -channelID supplychain-channel -asOrg OrgWarehouseMSP
configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate ./channel-artifacts/OrgRetailerMSPanchors.tx -channelID supplychain-channel -asOrg OrgRetailerMSP

Write-Host "Channel artifacts generated successfully!" -ForegroundColor Green
