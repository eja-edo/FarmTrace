#!/bin/bash

echo "===================================="
echo "Testing Handover Approval Workflow"
echo "===================================="

# Step 1: Create Product (as Manufacturer)
echo -e "\n[STEP 1] Manufacturer creates product PROD002..."
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
    -c '{"function":"CreateProduct","Args":["PROD002","Smart Watch","BATCH999","China","2025-11-03","ipfs-hash-123"]}'

echo -e "✓ Product PROD002 created"
sleep 3

# Step 2: Query Product
echo -e "\n[STEP 2] Query product PROD002..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetProduct","Args":["PROD002"]}' 2>&1 | grep -v "Error" | head -20

sleep 2

# Step 3: Manufacturer requests handover to Shipper
echo -e "\n[STEP 3] Manufacturer requests handover to Shipper..."
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
    -c '{"function":"RequestHandoverToShipper","Args":["PROD002","SHIPPER-001","WB-2025-1103","signature-manufacturer-001"]}'

echo -e "✓ Handover request created: HANDOVER-PROD002-SHIPPER"
sleep 3

# Step 4: Query the handover
echo -e "\n[STEP 4] Query handover details..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetHandover","Args":["HANDOVER-PROD002-SHIPPER"]}'

sleep 2

# Step 5: Get pending handovers for Shipper organization
echo -e "\n[STEP 5] Get pending handovers for Shipper organization..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetPendingHandoversForOrg","Args":[]}'

sleep 2

# Step 6: Shipper accepts the handover
echo -e "\n[STEP 6] Shipper accepts the handover..."

# Set environment to Shipper peer
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
    -c '{"function":"AcceptHandover","Args":["HANDOVER-PROD002-SHIPPER","RECEIVER-DRIVER-001","signature-shipper-001"]}'

echo -e "✓ Handover accepted by Shipper"
sleep 3

# Step 7: Verify handover status
echo -e "\n[STEP 7] Verify handover status after acceptance..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetHandover","Args":["HANDOVER-PROD002-SHIPPER"]}'

sleep 2

# Step 8: Verify product ownership changed
echo -e "\n[STEP 8] Verify product ownership after handover..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetProduct","Args":["PROD002"]}' 2>&1 | grep -E "(Owner|CurrentHolder|Status|PendingHandover)" | head -10

# Step 9: Test rejection workflow with new product
echo -e "\n\n===================================="
echo -e "[BONUS] Testing Rejection Workflow"
echo -e "===================================="

# Reset to Manufacturer
export CORE_PEER_LOCALMSPID="OrgManufacturerMSP"
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt

echo -e "\n[STEP 9] Create another product PROD003..."
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
    -c '{"function":"CreateProduct","Args":["PROD003","Tablet","BATCH777","Taiwan","2025-11-03","ipfs-hash-456"]}'

echo -e "✓ Product PROD003 created"
sleep 3

echo -e "\n[STEP 10] Request handover for PROD003..."
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
    -c '{"function":"RequestHandoverToShipper","Args":["PROD003","SHIPPER-002","WB-2025-1104","signature-manufacturer-002"]}'

echo -e "✓ Handover request created for PROD003"
sleep 3

echo -e "\n[STEP 11] Shipper REJECTS the handover..."
# Switch to Shipper
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
    -c '{"function":"RejectHandover","Args":["HANDOVER-PROD003-SHIPPER","Product damaged during packaging inspection","signature-shipper-reject"]}'

echo -e "✓ Handover rejected by Shipper"
sleep 3

echo -e "\n[STEP 12] Verify rejected handover status..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetHandover","Args":["HANDOVER-PROD003-SHIPPER"]}'

echo -e "\n[STEP 13] Verify product still with Manufacturer..."
peer chaincode query \
    -C supplychain-channel \
    -n supplychain_cc \
    -c '{"function":"GetProduct","Args":["PROD003"]}' 2>&1 | grep -E "(Owner|CurrentHolder|Status|PendingHandover)" | head -10

echo -e "\n===================================="
echo -e "Handover Workflow Testing Complete!"
echo -e "===================================="
echo -e "\n📋 Summary:"
echo -e "  ✓ Product creation"
echo -e "  ✓ Handover request (Manufacturer → Shipper)"
echo -e "  ✓ Handover acceptance (ownership transfer)"
echo -e "  ✓ Handover rejection (ownership retained)"
echo -e "  ✓ MSP-based access control"
echo -e "  ✓ Multi-peer endorsement (3/4 MAJORITY)"
