#!/bin/bash
# Direct chaincode test via CLI

TIMESTAMP=$(date +%s)
PRODUCT_ID="PROD-$TIMESTAMP"

echo "Testing CreateProduct with ID: $PRODUCT_ID"

peer chaincode invoke \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C supplychain-channel \
  -n supplychain_cc \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  --peerAddresses peer0.retailer.example.com:10051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt \
  -c "{\"function\":\"CreateProduct\",\"Args\":[\"$PRODUCT_ID\",\"Test Widget\",\"BATCH-$TIMESTAMP\",\"Factory\",\"2025-01-01T00:00:00Z\",\"HASH-$TIMESTAMP\"]}" \
  --waitForEvent

if [ $? -eq 0 ]; then
    echo "✓ Product created successfully"
    
    echo "Querying product..."
    peer chaincode query \
      -C supplychain-channel \
      -n supplychain_cc \
      -c "{\"function\":\"GetProduct\",\"Args\":[\"$PRODUCT_ID\"]}"
else
    echo "✗ Failed to create product"
    exit 1
fi
