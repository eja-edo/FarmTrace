#!/bin/bash

# Comprehensive V2 API Gateway Test
# Tests all V2 endpoints with real blockchain integration
# Requires: Network running, chaincode v2.7 deployed

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Use host.docker.internal to reach host from Docker container
API_URL="http://host.docker.internal:3000"
TESTS_PASSED=0
TESTS_FAILED=0

# Generate unique product ID
PRODUCT_ID="PROD-API-$(date +%s)-$(printf '%08X' $RANDOM)"
HANDOVER_ID_1=""
HANDOVER_ID_2=""

echo "========================================"
echo " V2 API GATEWAY COMPREHENSIVE TEST"
echo " Testing: Products + Handovers + Signatures"
echo "========================================"
echo ""
echo "Product ID: $PRODUCT_ID"
echo "API URL: $API_URL"
echo ""

# Helper function
test_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# ============================================
# TEST 1: Health Check
# ============================================
echo "=== TEST 1: Health Check ==="
echo -n "GET /health... "
curl -s "$API_URL/health" | jq -e '.status == "OK"' > /dev/null
test_status
echo ""

# ============================================
# TEST 2: Create Product (Manufacturer)
# ============================================
echo "=== TEST 2: Create Product (Manufacturer) ==="
echo -n "POST /api/v2/products... "
RESPONSE=$(curl -s -X POST "$API_URL/api/v2/products" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: manufacturer:user1" \
  -d "{
    \"id\": \"$PRODUCT_ID\",
    \"name\": \"Premium Rice\",
    \"batch\": \"BATCH-001\",
    \"origin\": \"An Giang\",
    \"manufactureDate\": \"2025-11-26\",
    \"metaHash\": \"ipfs://QmHash123\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
sleep 2
echo ""

# ============================================
# TEST 3: Get Product
# ============================================
echo "=== TEST 3: Get Product ==="
echo -n "GET /api/v2/products/$PRODUCT_ID... "
RESPONSE=$(curl -s "$API_URL/api/v2/products/$PRODUCT_ID")

if echo "$RESPONSE" | jq -e '.success == true and .data.id == "'$PRODUCT_ID'" and .data.status == "Manufactured"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# TEST 4: Get All Products
# ============================================
echo "=== TEST 4: Get All Products ==="
echo -n "GET /api/v2/products... "
RESPONSE=$(curl -s "$API_URL/api/v2/products")

if echo "$RESPONSE" | jq -e '.success == true and .count >= 1' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.count')
    echo -e "${GREEN}✓ PASSED${NC} (Found $COUNT products)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# TEST 5: Request Handover (Manufacturer → Shipper)
# ============================================
echo "=== TEST 5: Request Handover (Manufacturer → Shipper) ==="

# Generate signature
MFG_SIG=$(docker exec fabric-tools bash -c "
source /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk > /dev/null 2>&1
echo \"handover-request-${PRODUCT_ID}-shipper\" | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk | xxd -p -c 256
" 2>/dev/null | tail -1)

echo "  Generated signature (${#MFG_SIG} chars)"
echo -n "POST /api/v2/handovers/manufacturer-shipper... "

RESPONSE=$(curl -s -X POST "$API_URL/api/v2/handovers/manufacturer-shipper" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: manufacturer:user1" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"shipperId\": \"SHIPPER-001\",
    \"waybill\": \"WB-123456\",
    \"signature\": \"$MFG_SIG\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    HANDOVER_ID_1=$(echo "$RESPONSE" | jq -r '.data.handoverId')
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  Handover ID: ${HANDOVER_ID_1:0:40}..."
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
sleep 2
echo ""

# ============================================
# TEST 6: Get Handover Details
# ============================================
echo "=== TEST 6: Get Handover Details ==="
echo -n "GET /api/v2/handovers/$HANDOVER_ID_1... "
RESPONSE=$(curl -s "$API_URL/api/v2/handovers/$HANDOVER_ID_1")

if echo "$RESPONSE" | jq -e '.success == true and .data.status == "PENDING"' > /dev/null 2>&1; then
    NONCE=$(echo "$RESPONSE" | jq -r '.data.nonce')
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  Nonce: ${NONCE:0:40}..."
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# TEST 7: Accept Handover (Shipper)
# ============================================
echo "=== TEST 7: Accept Handover (Shipper) ==="

# Generate acceptance signature with nonce
SIG_MESSAGE="${HANDOVER_ID_1}:${NONCE}:DRIVER-001"
SHIPPER_SIG=$(docker exec fabric-tools bash -c "
echo '$SIG_MESSAGE' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp/keystore/*_sk | xxd -p -c 256
" 2>/dev/null | tail -1)

echo "  Generated signature (${#SHIPPER_SIG} chars)"
echo -n "POST /api/v2/handovers/$HANDOVER_ID_1/accept... "

RESPONSE=$(curl -s -X POST "$API_URL/api/v2/handovers/$HANDOVER_ID_1/accept" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: shipper:user1" \
  -d "{
    \"receiverId\": \"DRIVER-001\",
    \"signature\": \"$SHIPPER_SIG\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
sleep 2
echo ""

# ============================================
# TEST 8: Verify Product Owner Changed
# ============================================
echo "=== TEST 8: Verify Product Owner Changed ==="
echo -n "GET /api/v2/products/$PRODUCT_ID (verify owner=Shipper)... "
RESPONSE=$(curl -s "$API_URL/api/v2/products/$PRODUCT_ID")

if echo "$RESPONSE" | jq -e '.success == true and .data.owner == "Shipper" and .data.status == "InTransit"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# TEST 9: Get Product History
# ============================================
echo "=== TEST 9: Get Product History ==="
echo -n "GET /api/v2/products/$PRODUCT_ID/history... "
RESPONSE=$(curl -s "$API_URL/api/v2/products/$PRODUCT_ID/history")

if echo "$RESPONSE" | jq -e '.success == true and .count >= 2' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.count')
    echo -e "${GREEN}✓ PASSED${NC} (Found $COUNT history records)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# TEST 10: Request Handover Rejection Test
# ============================================
echo "=== TEST 10: Create Test Product for Rejection ==="
REJECT_PRODUCT_ID="PROD-REJECT-$(date +%s)-$(printf '%08X' $RANDOM)"

echo -n "Creating product... "
curl -s -X POST "$API_URL/api/v2/products" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: manufacturer:user1" \
  -d "{
    \"id\": \"$REJECT_PRODUCT_ID\",
    \"name\": \"Test Rice\",
    \"batch\": \"TEST-BATCH\",
    \"origin\": \"Test Origin\",
    \"manufactureDate\": \"2025-11-26\"
  }" | jq -e '.success == true' > /dev/null 2>&1
test_status
sleep 2

# Request handover for rejection test
echo -n "Requesting handover... "
MFG_SIG_REJECT=$(docker exec fabric-tools bash -c "
echo 'handover-request-${REJECT_PRODUCT_ID}-shipper' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp/keystore/*_sk | xxd -p -c 256
" 2>/dev/null | tail -1)

RESPONSE=$(curl -s -X POST "$API_URL/api/v2/handovers/manufacturer-shipper" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: manufacturer:user1" \
  -d "{
    \"productId\": \"$REJECT_PRODUCT_ID\",
    \"shipperId\": \"SHIPPER-001\",
    \"waybill\": \"WB-REJECT\",
    \"signature\": \"$MFG_SIG_REJECT\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    REJECT_HANDOVER_ID=$(echo "$RESPONSE" | jq -r '.data.handoverId')
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
sleep 2
echo ""

# ============================================
# TEST 11: Reject Handover
# ============================================
echo "=== TEST 11: Reject Handover ==="

# Generate rejection signature
REJECT_SIG=$(docker exec fabric-tools bash -c "
echo 'reject-${REJECT_HANDOVER_ID}' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp/keystore/*_sk | xxd -p -c 256
" 2>/dev/null | tail -1)

echo "  Generated rejection signature (${#REJECT_SIG} chars)"
echo -n "POST /api/v2/handovers/$REJECT_HANDOVER_ID/reject... "

RESPONSE=$(curl -s -X POST "$API_URL/api/v2/handovers/$REJECT_HANDOVER_ID/reject" \
  -H "Content-Type: application/json" \
  -H "X-User-Identity: shipper:user1" \
  -d "{
    \"reason\": \"Damaged packaging detected\",
    \"signature\": \"$REJECT_SIG\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
sleep 2
echo ""

# ============================================
# TEST 12: Verify Rejection State
# ============================================
echo "=== TEST 12: Verify Rejection State ==="
echo -n "GET /api/v2/products/$REJECT_PRODUCT_ID (verify HandoverFailed)... "
RESPONSE=$(curl -s "$API_URL/api/v2/products/$REJECT_PRODUCT_ID")

if echo "$RESPONSE" | jq -e '.success == true and .data.status == "HandoverFailed" and .data.owner == "Manufacturer"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    ((TESTS_FAILED++))
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "========================================"
echo " TEST SUMMARY"
echo "========================================"
echo ""
echo "Product ID: $PRODUCT_ID"
echo "Handover ID: ${HANDOVER_ID_1:0:40}..."
echo "Reject Product ID: $REJECT_PRODUCT_ID"
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
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
