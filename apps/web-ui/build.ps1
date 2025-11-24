#!/usr/bin/env pwsh
# Build FarmTrace Web UI for production

Write-Host "🏗️  Building FarmTrace Web UI for production..." -ForegroundColor Cyan

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
}

# Build
Write-Host "🔨 Building production bundle..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Output directory: dist/" -ForegroundColor White
    Write-Host ""
    Write-Host "To preview the production build:" -ForegroundColor Cyan
    Write-Host "   npm run preview" -ForegroundColor White
    Write-Host ""
    Write-Host "To deploy:" -ForegroundColor Cyan
    Write-Host "   - Upload the 'dist' folder to your web server" -ForegroundColor White
    Write-Host "   - Or use: vercel deploy, netlify deploy, etc." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
