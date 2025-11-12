#!/usr/bin/env pwsh
# Generate crypto materials using cryptogen

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Generating crypto materials..." -ForegroundColor Yellow

# Check if cryptogen is available
$cryptogen = Get-Command cryptogen -ErrorAction SilentlyContinue
if (-not $cryptogen) {
    Write-Host "ERROR: cryptogen tool not found. Please install Hyperledger Fabric binaries." -ForegroundColor Red
    Write-Host "Run: .\scripts\install-fabric.ps1" -ForegroundColor Yellow
    exit 1
}

# Generate crypto materials
cryptogen generate --config=crypto-config.yaml --output=crypto-config

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate crypto materials" -ForegroundColor Red
    exit 1
}

Write-Host "Crypto materials generated successfully!" -ForegroundColor Green
