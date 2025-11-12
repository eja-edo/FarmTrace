#!/usr/bin/env pwsh
# Install Hyperledger Fabric binaries and Docker images

$ErrorActionPreference = "Stop"

$FABRIC_VERSION = "2.5.4"
$CA_VERSION = "1.5.7"

Write-Host "Installing Hyperledger Fabric v$FABRIC_VERSION" -ForegroundColor Yellow

# Create bin directory
$BIN_DIR = "$HOME\fabric-bin"
if (-not (Test-Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR | Out-Null
}

# Download binaries
Write-Host "Downloading Fabric binaries..." -ForegroundColor Cyan

$ARCH = "amd64"
$OS = "windows"

$BINARY_FILE = "hyperledger-fabric-$OS-$ARCH-$FABRIC_VERSION.tar.gz"
$DOWNLOAD_URL = "https://github.com/hyperledger/fabric/releases/download/v$FABRIC_VERSION/$BINARY_FILE"

try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile "$BIN_DIR\$BINARY_FILE"
    tar -xzf "$BIN_DIR\$BINARY_FILE" -C $BIN_DIR
    Remove-Item "$BIN_DIR\$BINARY_FILE"
} catch {
    Write-Host "ERROR: Failed to download binaries" -ForegroundColor Red
    Write-Host "Please download manually from: $DOWNLOAD_URL" -ForegroundColor Yellow
    exit 1
}

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$BIN_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$BIN_DIR\bin", "User")
    Write-Host "Added $BIN_DIR\bin to PATH" -ForegroundColor Green
    Write-Host "Please restart your PowerShell session for PATH changes to take effect" -ForegroundColor Yellow
}

# Pull Docker images
Write-Host "`nPulling Docker images..." -ForegroundColor Cyan

$images = @(
    "hyperledger/fabric-peer:$FABRIC_VERSION",
    "hyperledger/fabric-orderer:$FABRIC_VERSION",
    "hyperledger/fabric-ccenv:$FABRIC_VERSION",
    "hyperledger/fabric-tools:$FABRIC_VERSION",
    "hyperledger/fabric-baseos:$FABRIC_VERSION",
    "hyperledger/fabric-ca:$CA_VERSION",
    "couchdb:3.3"
)

foreach ($image in $images) {
    Write-Host "Pulling $image..." -ForegroundColor Yellow
    docker pull $image
}

Write-Host "`nFabric installation completed!" -ForegroundColor Green
Write-Host "Binary location: $BIN_DIR\bin" -ForegroundColor Cyan

# Verify installation
Write-Host "`nVerifying installation..." -ForegroundColor Yellow
docker images | Select-String "hyperledger"
