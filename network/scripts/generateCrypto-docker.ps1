# Generate crypto materials using Docker container

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Generating crypto materials using Docker..." -ForegroundColor Yellow

# Create crypto-config directory if not exists
if (-not (Test-Path "crypto-config")) {
    New-Item -ItemType Directory -Path "crypto-config" | Out-Null
}

# Generate crypto materials using Docker
docker run --rm `
    -v "${PWD}:/work" `
    -w /work `
    hyperledger/fabric-tools:2.5 `
    cryptogen generate --config=crypto-config.yaml --output=crypto-config

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate crypto materials" -ForegroundColor Red
    exit 1
}

Write-Host "Crypto materials generated successfully!" -ForegroundColor Green
