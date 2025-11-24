#!/bin/bash
echo "=== QUICK TEST: Handover Workflow ==="

# Step 1: Create Product
echo ""
echo "[TEST 1] Creating product..."
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c '{"function":"CreateProduct","Args":["QUICK-TEST-001","Quick Test Product","BATCH-Q1","Factory A","2025-11-12","hash-q1"]}'

echo "Waiting 3 seconds..."
sleep 3

# Step 2: Request Handover
echo ""
echo "[TEST 2] Requesting handover..."
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c '{"function":"RequestHandoverToShipper","Args":["QUICK-TEST-001","SHIPPER-Q1","WB-Q1","sig-mfg-q1"]}'

echo "Waiting 3 seconds..."
sleep 3

# Step 3: Switch to Shipper context and Accept
echo ""
echo "[TEST 3] Shipper accepting handover..."
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c '{"function":"AcceptHandover","Args":["HANDOVER-QUICK-TEST-001-SHIPPER","DRIVER-Q1","sig-ship-q1"]}'

echo "Waiting 3 seconds..."
sleep 3

# Step 4: Query Product
echo ""
echo "[TEST 4] Querying product to verify ownership..."
peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c '{"function":"GetProduct","Args":["QUICK-TEST-001"]}'

echo ""
echo "=== TEST COMPLETED ==="
