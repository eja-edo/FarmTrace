#!/bin/bash
#
# FarmTrace Supply Chain - Rejection Scenario Test
# Tests handover rejection workflow with REAL ECDSA signatures
#
# Scenario: Manufacturer → Shipper (REJECTED) → Retry → SUCCESS
#

set +e  # Don't exit on error - we want to test failures

echo "========================================"
echo " HANDOVER REJECTION TEST"
echo " Scenario: Manufacturer → Shipper"
echo " Flow: Request → Reject → Retry → Accept"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0

test_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to generate ECDSA signature
generate_signature() {
    local org=$1
    local message=$2
    
    # Map org to crypto path
    local crypto_base="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations"
    local msp_path=""
    
    case $org in
        "manufacturer")
            msp_path="$crypto_base/manufacturer.example.com"
            ;;
        "shipper")
            msp_path="$crypto_base/shipper.example.com"
            ;;
        *)
            echo ""
            return 1
            ;;
    esac
    
    # Find private key
    local priv_key=$(find $msp_path/users/Admin@*/msp/keystore -name '*_sk' 2>/dev/null | head -1)
    
    if [ -z "$priv_key" ]; then
        echo ""
        return 1
    fi
    
    # Generate ECDSA signature (ASN.1 DER format as hex)
    local signature=$(echo -n "$message" | openssl dgst -sha256 -sign "$priv_key" 2>/dev/null | od -An -tx1 | tr -d ' \n')
    
    echo "$signature"
}

# Generate test data
TIMESTAMP=$(date +%s)
RANDOM_HASH=$(echo "$TIMESTAMP$RANDOM" | sha256sum | cut -c1-8 | tr '[:lower:]' '[:upper:]')
PRODUCT_ID="PROD-REJECT-${TIMESTAMP}-${RANDOM_HASH}"
MFG_DATE=$(date +%Y-%m-%d)

echo "Test Product ID: ${PRODUCT_ID}"
echo ""

# ============================================
# SETUP: Create Product
# ============================================
echo "=== SETUP: Create Product (Manufacturer) ==="

export CORE_PEER_LOCALMSPID="OrgManufacturerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

echo -n "Creating product... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"CreateProduct\",\"Args\":[\"${PRODUCT_ID}\",\"Test Rejected Product\",\"BATCH-REJECT-001\",\"Factory\",\"${MFG_DATE}\",\"hash\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

echo ""

# ============================================
# TEST 1: Request Handover (First Attempt)
# ============================================
echo "=== TEST 1: First Handover Request ==="

# Generate ECDSA signature for first request
MFG_SIG_1=$(generate_signature "manufacturer" "handover-request-${PRODUCT_ID}-shipper-first")
echo "  Generated manufacturer signature (${#MFG_SIG_1} chars)"

echo -n "Manufacturer requesting handover... "

peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"RequestHandoverToShipper\",\"Args\":[\"${PRODUCT_ID}\",\"SHIPPER-001\",\"WB-FIRST\",\"${MFG_SIG_1}\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Get handover ID
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)
HANDOVER_ID_1=$(echo "$PRODUCT_JSON" | jq -r '.pendingHandover')

echo "First Handover ID: ${HANDOVER_ID_1:0:40}..."
echo ""

# ============================================
# TEST 2: Reject Handover (Shipper)
# ============================================
echo "=== TEST 2: Shipper Rejects Handover ==="
echo "Reason: Damaged packaging"
echo ""

# Switch to Shipper
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

# Generate rejection signature (optional for RejectHandover - may not validate)
SHIPPER_SIG_REJECT=$(generate_signature "shipper" "reject-${HANDOVER_ID_1}")
echo "  Generated shipper rejection signature (${#SHIPPER_SIG_REJECT} chars)"

echo -n "Shipper rejecting handover... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"RejectHandover\",\"Args\":[\"${HANDOVER_ID_1}\",\"Damaged packaging detected during inspection\",\"${SHIPPER_SIG_REJECT}\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify state reversion
echo -n "Verifying state reversion... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.owner == "Manufacturer" and .status == "HandoverFailed" and .pendingHandover == ""' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Reverted to Manufacturer, Status: HandoverFailed)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "$PRODUCT_JSON" | jq '.owner, .status, .pendingHandover'
    ((TESTS_FAILED++))
fi

# Verify rejection approval logged
echo -n "Verifying rejection approval... "
APPROVAL_COUNT=$(echo "$PRODUCT_JSON" | jq '.approvals | length')
if [ "$APPROVAL_COUNT" -ge 1 ]; then
    LAST_APPROVAL=$(echo "$PRODUCT_JSON" | jq -r '.approvals[-1].action')
    if [ "$LAST_APPROVAL" == "RejectedHandover" ]; then
        echo -e "${GREEN}✓ VERIFIED${NC} (Rejection recorded in approval trail)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Last action: ${LAST_APPROVAL})"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}✗ FAILED${NC} (No approvals found)"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# TEST 3: Retry Handover (Second Attempt)
# ============================================
echo "=== TEST 3: Retry Handover (After Fixing Issue) ==="
echo "Manufacturer fixes packaging and retries"
echo ""

# Switch back to Manufacturer
export CORE_PEER_LOCALMSPID="OrgManufacturerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

# Generate new signature for retry
MFG_SIG_2=$(generate_signature "manufacturer" "handover-request-${PRODUCT_ID}-shipper-retry")
echo "  Generated manufacturer retry signature (${#MFG_SIG_2} chars)"

# Retry from HandoverFailed state (chaincode now allows this)
echo -n "Requesting second handover (from HandoverFailed state)... "
RETRY_OUTPUT=$(peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"RequestHandoverToShipper\",\"Args\":[\"${PRODUCT_ID}\",\"SHIPPER-001\",\"WB-SECOND\",\"${MFG_SIG_2}\"]}" \
  2>&1)

if echo "$RETRY_OUTPUT" | grep -q "status:200"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "ERROR: $RETRY_OUTPUT" | grep -i "error"
    ((TESTS_FAILED++))
fi

sleep 2

# Get second handover ID
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)
HANDOVER_ID_2=$(echo "$PRODUCT_JSON" | jq -r '.pendingHandover')

echo "Second Handover ID: ${HANDOVER_ID_2:0:40}..."

# Verify status
echo -n "Verifying retry status... "
if echo "$PRODUCT_JSON" | jq -e '.status == "HandoverRequested"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Status: HandoverRequested)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================
# TEST 4: Accept Second Handover (Success)
# ============================================
echo "=== TEST 4: Accept Second Handover ==="

# Switch to Shipper
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

# Get handover details to extract nonce
HANDOVER_DATA=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetHandover\",\"Args\":[\"${HANDOVER_ID_2}\"]}" 2>/dev/null)
NONCE_2=$(echo "$HANDOVER_DATA" | jq -r '.nonce')
echo "  Extracted nonce: ${NONCE_2:0:40}..."

# Generate ECDSA signature with nonce for acceptance
RECEIVER_ID="DRIVER-002"
SIG_MESSAGE="${HANDOVER_ID_2}:${NONCE_2}:${RECEIVER_ID}"
SHIPPER_SIG_ACCEPT=$(generate_signature "shipper" "$SIG_MESSAGE")
echo "  Generated shipper acceptance signature (${#SHIPPER_SIG_ACCEPT} chars)"

echo -n "Shipper accepting handover... "
peer chaincode invoke -o orderer.example.com:7050 \
  -C supplychain-channel -n supplychain_cc \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"AcceptHandover\",\"Args\":[\"${HANDOVER_ID_2}\",\"${RECEIVER_ID}\",\"${SHIPPER_SIG_ACCEPT}\"]}" \
  2>&1 | grep -q "status:200"
test_status

sleep 2

# Verify success
echo -n "Verifying successful transfer... "
PRODUCT_JSON=$(peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetProduct\",\"Args\":[\"${PRODUCT_ID}\"]}" 2>/dev/null)

if echo "$PRODUCT_JSON" | jq -e '.owner == "Shipper" and .status == "InTransit"' > /dev/null; then
    echo -e "${GREEN}✓ VERIFIED${NC} (Owner: Shipper, Status: InTransit)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Verify approval trail has both reject and accept
echo -n "Verifying complete approval trail... "
APPROVAL_COUNT=$(echo "$PRODUCT_JSON" | jq '.approvals | length')
if [ "$APPROVAL_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✓ VERIFIED${NC} (${APPROVAL_COUNT} approvals: rejection + acceptance)"
    ((TESTS_PASSED++))
    
    echo ""
    echo "Approval Trail:"
    echo "$PRODUCT_JSON" | jq -r '.approvals[] | "  - \(.action) by \(.actorMSP) at \(.timestamp)"'
else
    echo -e "${RED}✗ FAILED${NC} (Expected ≥2 approvals, got ${APPROVAL_COUNT})"
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
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================"
    echo " ✓ REJECTION WORKFLOW VERIFIED"
    echo " ✓ State reversion working correctly"
    echo " ✓ Retry mechanism functional"
    echo "========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================"
    echo " ✗ SOME TESTS FAILED"
    echo "========================================${NC}"
    exit 1
fi
