#!/bin/bash
#
# FarmTrace Supply Chain - Business Process Test
# Tests complete workflow: Manufacturer → Shipper → Warehouse → Retailer
#
# Based on BUSINESS_PROCESS_AIDS.md specification
#

# Do NOT exit on error - we want to run all tests
set +e

echo "========================================"
echo " FARMTRACE BUSINESS WORKFLOW TEST"
echo " Version: 1.0"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test status
test_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Generate unique Product ID (uppercase alphanumeric with hyphens)
TIMESTAMP=$(date +%s)
RANDOM_HASH=$(echo "$TIMESTAMP$RANDOM" | sha256sum | cut -c1-8 | tr '[:lower:]' '[:upper:]')
PRODUCT_ID="PROD-${TIMESTAMP}-${RANDOM_HASH}"
BATCH_ID="BATCH-$(date +%Y%m%d)-001"
MFG_DATE=$(date +%Y-%m-%d)

echo "Test Data:"
echo "  Product ID: ${PRODUCT_ID}"
echo "  Batch ID: ${BATCH_ID}"
echo "  Manufacture Date: ${MFG_DATE}"
echo ""

# ============================================
# BP1: PRODUCT CREATION (Manufacturer)
# ============================================
echo "=== BP1: Product Creation and Registration ==="
echo "Actor: Manufacturer (OrgManufacturerMSP)"
echo "Action: CreateProduct"
echo ""

# Set Manufacturer identity
export CORE_PEER_LOCALMSPID="OrgManufacturerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

echo -n "Creating product ${PRODUCT_ID}... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"CreateProduct\",\"Args\":[\"${PRODUCT_ID}\",\"Premium Rice\",\"${BATCH_ID}\",\"An Giang Farm\",\"${MFG_DATE}\",\"ipfs://QmHash123\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify product creation
echo -n "Verifying product state... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.status == "Manufactured" and .owner == "Manufacturer"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Status: Manufactured, Owner: Manufacturer)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# BP2: TWO-STEP HANDOVER (Manufacturer → Shipper)
# ============================================
echo "=== BP2: Two-Step Handover Process (Manufacturer → Shipper) ==="
echo ""

# Step 1: Request Handover
echo "--- Step 1: Request Handover (Manufacturer) ---"
echo -n "Manufacturer requesting handover to shipper... "

peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"RequestHandoverToShipper\",\"Args\":[\"${PRODUCT_ID}\",\"SHIPPER-VN-001\",\"WB-${PRODUCT_ID}\",\"sig-manufacturer-001\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Get actual handover ID from product
echo -n "Extracting handover ID... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

HANDOVER_ID=$(echo "$PRODUCT_JSON" | jq -r '.pendingHandover')

if [ "$HANDOVER_ID" != "" ] && [ "$HANDOVER_ID" != "null" ]; then
    echo -e "${GREEN}✓ EXTRACTED${NC} (ID: ${HANDOVER_ID:0:40}...)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (No pending handover found)"
    ((TESTS_FAILED++))
    exit 1
fi

# Verify product state
echo -n "Verifying product state... "
if echo "$PRODUCT_JSON" | jq -e '.status == "HandoverRequested"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Status: HandoverRequested)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# Step 2: Accept Handover (switch to Shipper)
echo "--- Step 2: Accept Handover (Shipper) ---"

# Switch to Shipper identity
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

echo -n "Shipper accepting handover... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"AcceptHandover\",\"Args\":[\"${HANDOVER_ID}\",\"DRIVER-NGUYEN-VAN-A\",\"sig-shipper-001\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify ownership transfer
echo -n "Verifying ownership transfer... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.owner == "Shipper" and .status == "InTransit" and .pendingHandover == ""' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Owner: Shipper, Status: InTransit)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "$PRODUCT_JSON" | jq '.owner, .status, .pendingHandover'
    ((TESTS_FAILED++))
fi

# Verify approval trail
echo -n "Verifying approval trail... "
APPROVAL_COUNT=$(echo "$PRODUCT_JSON" | jq '.approvals | length')
if [ "$APPROVAL_COUNT" -ge 1 ]; then
    echo -e "${GREEN}✓ VERIFIED${NC} (${APPROVAL_COUNT} approval(s) recorded)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (No approvals found)"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# BP3: SHIPMENT WITH TRACKING (Shipper)
# ============================================
echo "=== BP3: Shipment Creation with Tracking ==="
echo "Actor: Shipper (OrgShipperMSP)"
echo ""

WAYBILL="WB-${PRODUCT_ID}"

echo -n "Creating shipment record... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"ShipProduct\",\"Args\":[\"${PRODUCT_ID}\",\"SHIPPER-VN-001\",\"${WAYBILL}\",\"Ho Chi Minh City Warehouse\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Update shipment with location tracking
echo -n "Updating shipment location... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"UpdateShipment\",\"Args\":[\"${WAYBILL}\",\"GPS: 10.8231,106.6297\",\"25.5\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify shipment data
echo -n "Verifying shipment data... "
SHIPMENT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetShipment\",\"Args\":[\"${WAYBILL}\"]}" 2>/dev/null)

if echo "$SHIPMENT_JSON" | jq -e '.productID == "'$PRODUCT_ID'"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Shipment created)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Verify product status
echo -n "Verifying product status... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.status == "Shipped"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Status: Shipped)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# BP2 (continued): HANDOVER TO WAREHOUSE
# ============================================
echo "=== BP2: Handover to Warehouse (Shipper → Warehouse) ==="
echo ""

echo "--- Step 1: Request Handover (Shipper) ---"
echo -n "Shipper requesting handover to warehouse... "

peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"RequestHandoverToWarehouse\",\"Args\":[\"${PRODUCT_ID}\",\"WAREHOUSE-HCM-001\",\"sig-shipper-002\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Get warehouse handover ID
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)
HANDOVER_WH_ID=$(echo "$PRODUCT_JSON" | jq -r '.pendingHandover')

echo "Warehouse Handover ID: ${HANDOVER_WH_ID:0:40}..."
echo ""

echo "--- Step 2: Accept Handover (Warehouse) ---"

# Switch to Warehouse identity
export CORE_PEER_LOCALMSPID="OrgWarehouseMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp
export CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051

echo -n "Warehouse accepting handover... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"AcceptHandover\",\"Args\":[\"${HANDOVER_WH_ID}\",\"STAFF-TRAN-VAN-B\",\"sig-warehouse-001\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify warehouse ownership
echo -n "Verifying warehouse ownership... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.owner == "Warehouse" and .status == "InWarehouse"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Owner: Warehouse, Status: InWarehouse)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# RETAILER DELIVERY AND SALE
# ============================================
echo "=== BP4: Delivery to Retailer ==="
echo "Actor: Warehouse (OrgWarehouseMSP)"
echo ""

echo -n "Warehouse delivering to retailer... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"DeliverToRetailer\",\"Args\":[\"${PRODUCT_ID}\",\"RETAILER-COOPMART-001\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

echo ""
echo "=== BP5: Final Sale (Retailer) ==="
echo "Actor: Retailer (OrgRetailerMSP)"
echo ""

# Switch to Retailer identity
export CORE_PEER_LOCALMSPID="OrgRetailerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp
export CORE_PEER_ADDRESS=peer0.retailer.example.com:10051

echo -n "Retailer marking product as sold... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"MarkAsSold\",\"Args\":[\"${PRODUCT_ID}\",\"INV-${TIMESTAMP}\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify final status
echo -n "Verifying final sale status... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.status == "Sold"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Status: Sold)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# BP6: FULL AUDIT TRAIL VERIFICATION
# ============================================
echo "=== BP6: Product History Query (Traceability) ==="
echo "Actor: Any (Consumer via Retailer)"
echo ""

echo "Querying full product history..."
HISTORY_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProductHistory\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

HISTORY_COUNT=$(echo "$HISTORY_JSON" | jq 'length')
echo "Total history records: ${HISTORY_COUNT}"

if [ "$HISTORY_COUNT" -ge 6 ]; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Complete audit trail with ${HISTORY_COUNT} records)"
    ((TESTS_PASSED++))
    
    echo ""
    echo "History Timeline:"
    echo "$HISTORY_JSON" | jq -r '.[] | "  - \(.timestamp) | Status: \(.record.status) | Owner: \(.record.owner)"'
else
    echo -e "${RED}✗ FAILED${NC} (Expected ≥6 records, got ${HISTORY_COUNT})"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# TEST SUMMARY
# ============================================
echo "========================================"
echo " TEST SUMMARY"
echo "========================================"
echo ""
echo "Product ID: ${PRODUCT_ID}"
echo "Test Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================"
    echo " ✓ ALL TESTS PASSED"
    echo "========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================"
    echo " ✗ SOME TESTS FAILED"
    echo "========================================${NC}"
    exit 1
fi
