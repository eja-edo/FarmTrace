# PowerShell wrapper for ECDSA signature generation using Docker
# Usage: .\generate-signature-docker.ps1 -Org "shipper" -Message "HANDOVER-ID:nonce:receiverID"

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("manufacturer", "shipper", "warehouse", "retailer")]
    [string]$Org,
    
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

# Map org to MSP path in fabric-tools container (mounted at /opt/gopath/src/github.com/hyperledger/fabric/peer)
$cryptoBase = "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations"
$mspPaths = @{
    "manufacturer" = "$cryptoBase/manufacturer.example.com"
    "shipper" = "$cryptoBase/shipper.example.com"
    "warehouse" = "$cryptoBase/warehouse.example.com"
    "retailer" = "$cryptoBase/retailer.example.com"
}

$mspPath = $mspPaths[$Org]

# Find private key in fabric-tools container
$findKeyCmd = "find $mspPath/users/Admin@*/msp/keystore -name '*_sk' 2>/dev/null | head -1"
$privKey = docker exec fabric-tools bash -c $findKeyCmd 2>$null

if ([string]::IsNullOrWhiteSpace($privKey)) {
    Write-Error "Private key not found for org: $Org in path: $mspPath`nRun 'docker exec fabric-tools ls $mspPath' to verify path"
    exit 1
}

# Generate ECDSA signature
$signCmd = "echo -n '$Message' | openssl dgst -sha256 -sign '$privKey' 2>/dev/null | od -An -tx1 | tr -d ' \n'"
$signature = docker exec fabric-tools bash -c $signCmd

if ([string]::IsNullOrWhiteSpace($signature)) {
    Write-Error "Failed to generate signature"
    exit 1
}

Write-Output $signature
