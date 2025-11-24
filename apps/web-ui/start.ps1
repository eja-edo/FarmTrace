#!/usr/bin/env pwsh
# Start FarmTrace Web UI

Write-Host "🚀 Starting FarmTrace Web UI..." -ForegroundColor Cyan

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Navigate to web-ui directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found, creating from .env.example" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file" -ForegroundColor Green
    }
}

# Check if API is running
Write-Host "🔍 Checking API Gateway connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API Gateway is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Cannot connect to API Gateway (http://localhost:3000)" -ForegroundColor Yellow
    Write-Host "   Make sure the blockchain network and API Gateway are running" -ForegroundColor Yellow
    Write-Host "   You can start them with: cd ../.. && .\setup.ps1" -ForegroundColor Yellow
}

# Start development server
Write-Host ""
Write-Host "🎨 Starting development server..." -ForegroundColor Cyan
Write-Host "   UI will be available at: http://localhost:3001" -ForegroundColor White
Write-Host "   API proxy target: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npm run dev
