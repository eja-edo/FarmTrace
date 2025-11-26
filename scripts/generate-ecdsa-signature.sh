#!/bin/bash
# Generate ECDSA signature for handover operations
# Usage: ./generate-ecdsa-signature.sh <org> <message>
# Example: ./generate-ecdsa-signature.sh shipper "HANDOVER-PROD-001-SHIPPER:nonce123:RECEIVER-001"

ORG=$1
MESSAGE=$2

if [ -z "$ORG" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <org> <message>"
    echo "Example: $0 shipper 'HANDOVER-ID:nonce:receiverID'"
    exit 1
fi

# Map org to MSP path
case $ORG in
    manufacturer)
        MSP_PATH="/crypto/peerOrganizations/manufacturer.example.com"
        ;;
    shipper)
        MSP_PATH="/crypto/peerOrganizations/shipper.example.com"
        ;;
    warehouse)
        MSP_PATH="/crypto/peerOrganizations/warehouse.example.com"
        ;;
    retailer)
        MSP_PATH="/crypto/peerOrganizations/retailer.example.com"
        ;;
    *)
        echo "Invalid org: $ORG (must be: manufacturer, shipper, warehouse, retailer)"
        exit 1
        ;;
esac

# Find private key
PRIV_KEY=$(find ${MSP_PATH}/users/Admin@*/msp/keystore -name "*_sk" 2>/dev/null | head -1)

if [ -z "$PRIV_KEY" ]; then
    echo "ERROR: Private key not found in $MSP_PATH"
    exit 1
fi

# Generate ECDSA signature
echo -n "$MESSAGE" | openssl dgst -sha256 -sign "$PRIV_KEY" 2>/dev/null | od -An -tx1 | tr -d ' \n'
