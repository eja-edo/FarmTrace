# Bootstrap script for Hyperledger Fabric Network (Docker-only version)
# This script sets up the entire network using only Docker containers

$ErrorActionPreference = "Stop"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Fabric Supply Chain Network Bootstrap" -ForegroundColor Cyan
Write-Host "(Docker-only version)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Set working directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host ""
Write-Host ">>> Step 1: Cleaning up previous network..." -ForegroundColor Yellow
& "$SCRIPT_DIR\cleanup.ps1"

Write-Host ""
Write-Host ">>> Step 2: Generating crypto materials (Docker)..." -ForegroundColor Yellow
& "$SCRIPT_DIR\generateCrypto-docker.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host ">>> Step 3: Generating genesis block and channel artifacts (Docker)..." -ForegroundColor Yellow
& "$SCRIPT_DIR\generateChannelArtifacts-docker.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host ">>> Step 4: Starting network..." -ForegroundColor Yellow
docker-compose -f docker-compose.yaml up -d

Write-Host ""
Write-Host "Waiting for network to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host ">>> Step 5: Creating channel (Docker)..." -ForegroundColor Yellow
& "$SCRIPT_DIR\createChannel-docker.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host ">>> Step 6: Deploying chaincode (Docker)..." -ForegroundColor Yellow
& "$SCRIPT_DIR\deployChaincode-docker.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Network bootstrap completed successfully!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

Write-Host ""
Write-Host "Network endpoints:" -ForegroundColor Cyan
Write-Host "  Orderer:        localhost:7050" -ForegroundColor White
Write-Host "  Manufacturer:   localhost:7051" -ForegroundColor White
Write-Host "  Shipper:        localhost:8051" -ForegroundColor White
Write-Host "  Warehouse:      localhost:9051" -ForegroundColor White
Write-Host "  Retailer:       localhost:10051" -ForegroundColor White
Write-Host ""
Write-Host "CouchDB instances:" -ForegroundColor Cyan
Write-Host "  Manufacturer:   http://localhost:5984/_utils" -ForegroundColor White
Write-Host "  Shipper:        http://localhost:6984/_utils" -ForegroundColor White
Write-Host "  Warehouse:      http://localhost:7984/_utils" -ForegroundColor White
Write-Host "  Retailer:       http://localhost:8984/_utils" -ForegroundColor White
Write-Host ""
Write-Host "Credentials: admin / adminpw" -ForegroundColor White
Write-Host ""
