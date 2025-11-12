#!/usr/bin/env pwsh
# Cleanup script - removes all network artifacts and containers

$ErrorActionPreference = "Stop"

Write-Host "Cleaning up network..." -ForegroundColor Yellow

# Stop and remove containers
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

if (Test-Path "docker-compose.yaml") {
    Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yaml down --volumes --remove-orphans
}

# Remove chaincode containers and images
Write-Host "Removing chaincode containers..." -ForegroundColor Yellow
docker ps -a | Select-String "dev-peer" | ForEach-Object {
    $containerId = ($_ -split '\s+')[0]
    docker rm -f $containerId 2>$null
}

docker images | Select-String "dev-peer" | ForEach-Object {
    $imageId = ($_ -split '\s+')[2]
    docker rmi -f $imageId 2>$null
}

# Clean artifacts
Write-Host "Removing generated artifacts..." -ForegroundColor Yellow
if (Test-Path "crypto-config") { Remove-Item -Recurse -Force "crypto-config" }
if (Test-Path "channel-artifacts") { Remove-Item -Recurse -Force "channel-artifacts" }
if (Test-Path "system-genesis-block") { Remove-Item -Recurse -Force "system-genesis-block" }

Write-Host "Cleanup completed!" -ForegroundColor Green
