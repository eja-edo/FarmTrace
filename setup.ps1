# Complete setup script - Setup everything from scratch

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Supply Chain Blockchain - Complete Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host ""
Write-Host ">>> Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "OK Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "ERROR Docker is not installed. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Docker is running
try {
    docker ps | Out-Null
    Write-Host "OK Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js is installed ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Host "ERROR Node.js is not installed. Please install Node.js 16+." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host ">>> Step 1/6: Bootstrapping Fabric network (Docker-only)..." -ForegroundColor Yellow
$ROOT_DIR = $PWD
Set-Location network\scripts
.\bootstrap-docker.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR Failed to bootstrap network" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host ">>> Step 2/6: Starting PostgreSQL database..." -ForegroundColor Yellow
Set-Location $ROOT_DIR
Set-Location offchain\postgres
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR Failed to start PostgreSQL" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for database to be ready..."
Start-Sleep -Seconds 10
Write-Host "OK Database started" -ForegroundColor Green

Write-Host ""
Write-Host ">>> Step 3/6: Installing API dependencies..." -ForegroundColor Yellow
Set-Location $ROOT_DIR
Set-Location apps\gateway-nodejs

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..."
    Copy-Item .env.example .env
}

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR Failed to install API dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "OK API dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host ">>> Step 4/6: Enrolling admin identity..." -ForegroundColor Yellow
npm run enroll-admin
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING Admin enrollment failed (may need Fabric CA running)" -ForegroundColor Yellow
    Write-Host "  You can skip this for now and use direct peer connection" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ">>> Step 5/6: Registering application user..." -ForegroundColor Yellow
npm run register-user
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING User registration failed (may need admin enrolled first)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ">>> Step 6/6: Running smoke tests..." -ForegroundColor Yellow
Set-Location $ROOT_DIR
Set-Location network\scripts
.\smokeTest-docker.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  - API Gateway:  http://localhost:3000" -ForegroundColor White
Write-Host "  - CouchDB Manufacturer: http://localhost:5984/_utils (admin/adminpw)" -ForegroundColor White
Write-Host "  - pgAdmin:      http://localhost:5050 (admin@admin.com/admin)" -ForegroundColor White

Write-Host ""
Write-Host "To start the API server:" -ForegroundColor Cyan
Write-Host "  cd apps\gateway-nodejs" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Yellow

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start API: npm start" -ForegroundColor White
Write-Host "  2. Test API: curl http://localhost:3000/health" -ForegroundColor White
Write-Host "  3. Read docs: docs\deployment.md" -ForegroundColor White
Write-Host "  4. Try examples in QUICKSTART.md" -ForegroundColor White

Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - Quick Start:  QUICKSTART.md" -ForegroundColor White
Write-Host "  - Deployment:   docs\deployment.md" -ForegroundColor White
Write-Host "  - Operations:   docs\runbook.md" -ForegroundColor White
Write-Host "  - Architecture: docs\design.md" -ForegroundColor White

Write-Host ""
Write-Host "Setup monitoring (optional):" -ForegroundColor Cyan
Write-Host "  cd ci-cd\monitoring" -ForegroundColor Yellow
Write-Host "  docker-compose up -d" -ForegroundColor Yellow
Write-Host "  Access Grafana at http://localhost:3001 (admin/admin)" -ForegroundColor Yellow

Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green
Write-Host ""
