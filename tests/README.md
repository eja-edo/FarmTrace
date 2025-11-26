# Blockchain Core Test Suite

**Business Process Validation** - Tests aligned with BUSINESS_PROCESS_AIDS.md specification

---

## 📁 Directory Structure

```
tests/
├── integration/          # End-to-end blockchain tests
│   ├── test-business-workflow.sh     # ⭐ MAIN TEST - Full workflow (BP1-BP6)
│   ├── test-handover-rejection.sh    # Rejection scenario with retry
│   └── smoke-test.ps1                # Quick health check (3 tests)
│
├── monitoring/          # Stability and performance monitoring
│   └── monitor-dev-containers.ps1  # Container crash detection
│
└── unit/               # Chaincode unit tests
    └── supplychain_test.go        # Go struct validation tests
```

---

## 🎯 Primary Tests (Run These First)

### 1. Production Workflow Test ⭐ RECOMMENDED
**File**: `integration/test-production-workflow.sh`  
**Duration**: ~90 seconds  
**Coverage**: Complete workflow with **REAL ECDSA signature validation**

**What it Tests**:
- ✅ **BP1**: Product Creation by Manufacturer (uppercase ID validation)
- ✅ **BP2**: Two-Step Handover Manufacturer → Shipper
  - Request handover with ECDSA signature from manufacturer's private key
  - Accept handover with ECDSA signature + nonce validation (prevents replay attacks)
- ✅ **BP3**: Verify InTransit status after handover
- ✅ **BP4**: Two-Step Handover Shipper → Warehouse
  - Request + Accept with real cryptographic signatures
- ✅ **BP5**: Warehouse delivers to Retailer (single-step)
- ✅ **BP6**: Retailer marks product as Sold
- ✅ **BP7**: Complete audit trail verification (7+ transactions)
- ✅ **Verify**: Final product state (Sold status + approval records)

**Expected Output**:
```bash
=========================================
 FARMTRACE PRODUCTION WORKFLOW TEST
 With Real ECDSA Signature Validation
=========================================

=== BP1: Product Creation (Manufacturer) ===
✓ Product created successfully

=== BP2.1: Request Handover to Shipper (Manufacturer) ===
  Generated manufacturer signature (142 chars)
✓ Handover requested to Shipper

=== BP2.2: Accept Handover (Shipper) ===
  Generated shipper signature (142 chars)
✓ Shipper accepted handover - Ownership transferred

=== BP3: Shipper Has Product (InTransit Status) ===
✓ Product ownership transferred (Owner: Shipper, Status: InTransit)

=== BP4.1: Request Handover to Warehouse (Shipper) ===
✓ Handover requested to Warehouse

=== BP4.2: Accept Handover (Warehouse) ===
✓ Warehouse accepted handover - Product stored

=== BP5: Deliver to Retailer (Warehouse) ===
✓ Product delivered to Retailer

=== BP6: Mark Product as Sold (Retailer) ===
✓ Product marked as SOLD to customer

=== BP7: Verify Product History (Traceability) ===
  Transaction History Count: 7
✓ Complete audit trail verified

=== TEST SUMMARY ===
  ✓ ALL TESTS PASSED
  Production-ready workflow validated!
```

**Run Command**:
```powershell
docker cp tests\integration\test-production-workflow.sh fabric-tools:/tmp/
docker exec fabric-tools bash /tmp/test-production-workflow.sh
```

**Key Features**:
- 🔐 **Real ECDSA Signatures**: Generated from organization private keys (`*_sk` files)
- 🛡️ **Nonce-based Replay Protection**: Each signature includes unique nonce
- 📝 **ASN.1 DER Format**: Standard Fabric cryptographic format (140-144 hex chars)
- ✅ **X.509 Certificate Validation**: Chaincode verifies signatures against caller's cert

---

### 2. Handover Rejection Test
**File**: `integration/test-handover-rejection.sh`  
**Duration**: ~45 seconds  
**Coverage**: Negative scenario handling + state reversion

**What it Tests**:
- ✅ Manufacturer requests handover to Shipper
- ✅ Shipper **rejects** with reason ("Damaged packaging")
- ✅ Product state reverts to Manufacturer with `HandoverFailed` status
- ✅ Manufacturer can retry with new handover request
- ✅ Shipper accepts second attempt
- ✅ Approval trail contains both rejection and acceptance records

**Expected Output**:
```bash
=== HANDOVER REJECTION TEST ===

[TEST 1] Creating product... ✓
[TEST 2] Manufacturer requests handover... ✓
[TEST 3] Shipper rejects handover (Damaged packaging)... ✓
[TEST 4] Verifying state reversion to Manufacturer... ✓
[TEST 5] Manufacturer retries handover request... ✓
[TEST 6] Shipper accepts second attempt... ✓
[TEST 7] Verifying approval trail has rejection + acceptance... ✓

=== TEST RESULTS ===
✓ PASSED: 7/7 tests
Duration: 42 seconds
```

**Run Command**:
```powershell
docker cp tests\integration\test-handover-rejection.sh fabric-tools:/tmp/
docker exec fabric-tools bash /tmp/test-handover-rejection.sh
```

---

## 🚀 Quick Health Check

### Smoke Test (Fast Validation)
**File**: `integration/smoke-test.ps1`  
**Duration**: ~10 seconds  
**Purpose**: Verify network is operational before running full tests

**What it Tests**:
1. All 13 containers running (3 orderers + 4 peers + 4 CouchDB + 2 CLI)
2. Chaincode committed to channel with 4/4 approvals
3. Basic query functionality (GetAllProducts)

**Run Command**:
```powershell
cd network\scripts
.\smokeTest-docker.ps1
```

**Expected Output**:
```
✓ All containers running
✓ Chaincode supplychain_cc sequence 1 committed
✓ Basic query successful
SMOKE TEST PASSED (3/3)
```

---

## 📊 Monitoring & Stability

### Container Stability Monitor
**File**: `monitoring/monitor-dev-containers.ps1`  
**Duration**: 5 minutes (configurable)  
**Purpose**: Detect container crashes or restarts

**What it Monitors**:
- Container uptime tracking
- Restart count anomalies
- Resource usage patterns
- Health check failures

**Run Command**:
```powershell
.\tests\monitoring\monitor-dev-containers.ps1
```

**Use Cases**:
- Pre-production stability validation
- Debugging intermittent failures
- Performance baseline establishment

---

## 🧪 Unit Tests (Go Chaincode)

### Struct Validation Tests
**File**: `unit/supplychain_test.go`  
**Duration**: <5 seconds  
**Coverage**: 13 Go struct validation tests

**Run Command**:
```powershell
docker exec fabric-tools bash -c "cd /chaincode/go && go test -v -cover"
```

**Expected Output**:
```
=== RUN   TestProductStructure
--- PASS: TestProductStructure (0.00s)
=== RUN   TestHandoverStructure
--- PASS: TestHandoverStructure (0.00s)
...
PASS
coverage: 45.2% of statements
ok      supplychain     0.234s
```

---

## 🔧 Troubleshooting

### Test Fails with "ENDORSEMENT_POLICY_FAILURE"
**Cause**: Only 1 peer endorsing, policy needs 3/4  
**Fix**: Ensure `--peerAddresses` includes manufacturer, shipper, warehouse in invoke commands

### Test Fails with "invalid Product ID format"
**Cause**: Product ID must be uppercase alphanumeric with hyphens  
**Fix**: Use `tr '[:lower:]' '[:upper:]'` to uppercase random IDs

### Handover ID Mismatch Errors
**Cause**: Handover IDs are deterministic with txID nonce  
**Fix**: Query `product.pendingHandover` field to get actual handover ID (don't hardcode)

### PowerShell JSON Escaping Issues
**Symptom**: `invalid character 'f' looking for beginning of object key string`  
**Fix**: ALWAYS use bash for chaincode operations:
```powershell
docker exec fabric-tools bash -c 'peer chaincode invoke ...'
```

### Network Not Running
**Fix**: Run bootstrap first:
```powershell
.\network\scripts\bootstrap-docker.ps1
```

---

## 📋 Test Execution Checklist

**Before Running Tests**:
1. ✅ Verify network is running: `docker ps` (should show 13 containers)
2. ✅ Confirm chaincode deployed: `docker exec fabric-tools peer lifecycle chaincode querycommitted -C supplychain-channel -n supplychain_cc`
3. ✅ Check sequence is correct: Fresh network = sequence 1

**Test Order** (Recommended):
1. 🔹 Smoke test (10s) - Verify basic health
2. 🔹 Business workflow test (90s) - Main validation
3. 🔹 Rejection test (45s) - Error handling
4. 🔹 Unit tests (5s) - Code-level validation

**After Tests Pass**:
- Review test outputs in `logs/` directory
- Check audit trails match BUSINESS_PROCESS_AIDS.md
- Verify all state transitions followed state machine rules

---

## 📚 Related Documentation

- `BUSINESS_PROCESS_AIDS.md` - Business process specifications (BP1-BP6)
- `docs/testing/` - Detailed testing guides
- `API_GATEWAY_STATUS.md` - API endpoint test coverage
- `.github/copilot-instructions.md` - Development conventions

---

**Last Updated**: November 26, 2025  
**Test Suite Version**: 2.0 (Business Process Aligned)  
**Network**: Hyperledger Fabric 2.5 + Chaincode v2.6
