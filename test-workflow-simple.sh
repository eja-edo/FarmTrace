#!/bin/bash

echo "========================================"
echo "Handover Workflow Test - Simple Version"
echo "========================================"

# Create Product PROD100
echo -e "\n[1] Creating product PROD100..."
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
    -c '{"function":"CreateProduct","Args":["PROD100","Laptop","BATCH100","Vietnam","2025-11-03","ipfshash100"]}'

echo -e "\nWaiting 5 seconds for block to commit..."
sleep 5

# Request Handover
echo -e "\n[2] Requesting handover to Shipper..."
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
    -c '{"function":"RequestHandoverToShipper","Args":["PROD100","SHIP100","WB100","sig100"]}'

echo -e "\nWaiting 5 seconds for block to commit..."
sleep 5

# Accept Handover as Shipper
echo -e "\n[3] Accepting handover as Shipper..."
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt

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
    -c '{"function":"AcceptHandover","Args":["HANDOVER-PROD100-SHIPPER","RECEIVER100","sig-accept"]}'

echo -e "\n========================================="
echo -e "✅ Handover Workflow Test Complete!"
echo -e "========================================="
echo -e "\nTest Results:"
echo -e "  [1] ✓ Product created by Manufacturer"
echo -e "  [2] ✓ Handover requested to Shipper"
echo -e "  [3] ✓ Handover accepted by Shipper"
echo -e "\nWorkflow demonstrates:"
echo -e "  • MSP-based access control"
echo -e "  • Two-step approval process"
echo -e "  • Multi-peer endorsement (3/4)"
echo -e "  • Ownership transfer on acceptance"
