#!/bin/bash

echo "===================================="
echo "Testing Chaincode Functions"
echo "===================================="

echo -e "\nTest 1: Creating product PROD001..."
peer chaincode invoke \
    -o orderer.example.com:7050 \
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
    -c '{"function":"CreateProduct","Args":["PROD001","Test Widget","BATCH123","Vietnam","2025-11-03","ipfs123"]}'

echo -e "\n✓ Product creation invoked"

sleep 3

echo -e "\nTest 2: Querying product PROD001..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetProduct","Args":["PROD001"]}'

echo -e "\n✓ Product query completed"

echo -e "\nTest 3: Requesting handover to shipper..."
peer chaincode invoke \
    -o orderer.example.com:7050 \
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
    -c '{"function":"RequestHandoverToShipper","Args":["PROD001","SHIP001","WB123456","signature123"]}'

echo -e "\n✓ Handover request created"

sleep 3

echo -e "\nTest 4: Getting pending handovers..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetPendingHandoversForOrg","Args":[]}'

echo -e "\n===================================="
echo "Testing Completed!"
echo "===================================="
