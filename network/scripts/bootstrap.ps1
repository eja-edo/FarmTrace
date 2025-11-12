#!/usr/bin/env pwsh
# Bootstrap script for Hyperledger Fabric Network
# This script sets up the entire network from scratch

$ErrorActionPreference = "Stop"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Fabric Supply Chain Network Bootstrap" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Set working directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "`n>>> Step 1: Cleaning up previous network..." -ForegroundColor Yellow
& "$SCRIPT_DIR\cleanup.ps1"

Write-Host "`n>>> Step 2: Generating crypto materials..." -ForegroundColor Yellow
& "$SCRIPT_DIR\generateCrypto.ps1"

Write-Host "`n>>> Step 3: Generating genesis block and channel artifacts..." -ForegroundColor Yellow
& "$SCRIPT_DIR\generateChannelArtifacts.ps1"

Write-Host "`n>>> Step 4: Starting network..." -ForegroundColor Yellow
docker-compose -f docker-compose.yaml up -d

Write-Host "`nWaiting for network to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n>>> Step 5: Creating channel..." -ForegroundColor Yellow
& "$SCRIPT_DIR\createChannel.ps1"

Write-Host "`n>>> Step 6: Deploying chaincode..." -ForegroundColor Yellow
& "$SCRIPT_DIR\deployChaincode.ps1"

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "Network bootstrap completed successfully!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

Write-Host "`nNetwork endpoints:" -ForegroundColor Cyan
Write-Host "  Orderer:        localhost:7050" -ForegroundColor White
Write-Host "  Manufacturer:   localhost:7051" -ForegroundColor White
Write-Host "  Shipper:        localhost:8051" -ForegroundColor White
Write-Host "  Warehouse:      localhost:9051" -ForegroundColor White
Write-Host "  Retailer:       localhost:10051" -ForegroundColor White
Write-Host "`nCouchDB instances:" -ForegroundColor Cyan
Write-Host "  Manufacturer:   http://localhost:5984/_utils" -ForegroundColor White
Write-Host "  Shipper:        http://localhost:6984/_utils" -ForegroundColor White
Write-Host "  Warehouse:      http://localhost:7984/_utils" -ForegroundColor White
Write-Host "  Retailer:       http://localhost:8984/_utils" -ForegroundColor White
Write-Host "`nCredentials: admin / adminpw" -ForegroundColor White
