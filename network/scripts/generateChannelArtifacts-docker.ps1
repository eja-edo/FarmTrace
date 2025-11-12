# Generate channel artifacts using Docker container

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR\..

Write-Host "Generating channel artifacts using Docker..." -ForegroundColor Yellow

# Create channel-artifacts directory if not exists
if (-not (Test-Path "channel-artifacts")) {
    New-Item -ItemType Directory -Path "channel-artifacts" | Out-Null
}

# Generate genesis block
Write-Host "Creating genesis block..." -ForegroundColor Yellow
docker run --rm `
    -v "${PWD}:/work" `
    -w /work `
    -e FABRIC_CFG_PATH=/work `
    hyperledger/fabric-tools:2.5 `
    configtxgen -profile SupplyChainOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate genesis block" -ForegroundColor Red
    exit 1
}

# Generate channel transaction
Write-Host "Creating channel transaction..." -ForegroundColor Yellow
docker run --rm `
    -v "${PWD}:/work" `
    -w /work `
    -e FABRIC_CFG_PATH=/work `
    hyperledger/fabric-tools:2.5 `
    configtxgen -profile SupplyChainChannel -outputCreateChannelTx ./channel-artifacts/supplychain-channel.tx -channelID supplychain-channel

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate channel transaction" -ForegroundColor Red
    exit 1
}

# Generate anchor peer updates for each organization
Write-Host "Creating anchor peer updates..." -ForegroundColor Yellow

$organizations = @("OrgManufacturerMSP", "OrgShipperMSP", "OrgWarehouseMSP", "OrgRetailerMSP")
foreach ($org in $organizations) {
    docker run --rm `
        -v "${PWD}:/work" `
        -w /work `
        -e FABRIC_CFG_PATH=/work `
        hyperledger/fabric-tools:2.5 `
        configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate ./channel-artifacts/${org}anchors.tx -channelID supplychain-channel -asOrg $org
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to generate anchor peer update for $org" -ForegroundColor Yellow
    }
}

Write-Host "Channel artifacts generated successfully!" -ForegroundColor Green
