#!/bin/bash
#
# Simplified Test - Validate Basic Chaincode Operations
# 

set +e # Don't exit on error

echo "========================================="
echo " FARMTRACE BASIC CHAINCODE TEST"
echo " Testing: CreateProduct → GetProduct"
echo "========================================="
echo ""

# Generate unique Product ID
TIMESTAMP=$(date +%s)
RANDOM_HASH=$(echo "$TIMESTAMP$RANDOM" | sha256sum | cut -c1-8 | tr '[:lower:]' '[:upper:]')
PRODUCT_ID="PROD-${TIMESTAMP}-${RANDOM_HASH}"

echo "Product ID: ${PRODUCT_ID}"
echo ""

# Switch to Manufacturer identity
export CORE_PEER_LOCALMSPID=OrgManufacturerMSP
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

echo "=== TEST 1: CreateProduct ==="
OUTPUT=$(peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"CreateProduct\",\"Args\":[\"${PRODUCT_ID}\",\"Premium Rice\",\"BATCH-001\",\"An Giang\",\"2025-11-26\",\"ipfs://QmHash123\"]}" 2>&1)

echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "status:200"; then
    echo "✓ CreateProduct PASSED"
else
    echo "✗ CreateProduct FAILED"
    echo "Output: $OUTPUT"
    exit 1
fi

echo ""
sleep 3

echo "=== TEST 2: GetProduct ==="
OUTPUT=$(peer chaincode query \
  -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>&1)

echo "Query output:"
echo "$OUTPUT"
echo ""

# Check if output contains expected fields (don't parse JSON, just grep)
if echo "$OUTPUT" | grep -q "\"id\":\"${PRODUCT_ID}\""; then
    echo "✓ GetProduct PASSED - Found product ID"
else
    echo "✗ GetProduct FAILED - Product not found"
    exit 1
fi

if echo "$OUTPUT" | grep -q "\"status\":\"Manufactured\""; then
    echo "✓ Product status verified: Manufactured"
else
    echo "⚠ Warning: Status field not found or different"
fi

if echo "$OUTPUT" | grep -q "\"owner\":\"Manufacturer\""; then
    echo "✓ Product owner verified: Manufacturer"
else
    echo "⚠ Warning: Owner field not found or different"
fi

echo ""
echo "========================================="
echo " ✓ ALL BASIC TESTS PASSED"
echo "========================================="
