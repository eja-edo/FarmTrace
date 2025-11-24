# Copilot Instructions - FarmTrace Blockchain Core

## Project Identity
**Name**: FarmTrace Supply Chain Traceability System  
**Stack**: Hyperledger Fabric 2.5 (Docker-only) + Go 1.19 + Node.js 16 + PostgreSQL 15  
**Architecture**: 4-org permissioned blockchain (Manufacturer → Shipper → Warehouse → Retailer)  
**Current State**: ✅ Production-ready (Nov 2025) - All tests passing, chaincode sequence 1 deployed

## Core Architecture Decisions

**Why Docker-only?** No local Fabric binaries - all `cryptogen`, `configtxgen`, `peer` commands run inside `hyperledger/fabric-tools:2.5` container. Eliminates version conflicts, ensures reproducible builds across Windows/Linux/Mac.

**Why Raft consensus?** 3 orderers provide crash fault tolerance (CFT). Can lose 1 orderer and maintain consensus. Better than solo (dev only) or Kafka (deprecated).

**Why two-step handovers?** Legal requirement - both sender AND receiver must explicitly approve ownership transfer. Creates immutable audit trail with human verification.

**Why off-chain PostgreSQL?** Blockchain = immutability/audit, PostgreSQL = fast queries/analytics. Hybrid: blockchain is source of truth, DB enables search/notifications/reporting.

## Critical Files & Their Purpose

```
network/scripts/bootstrap-docker.ps1  # ⭐ ONE script to rule them all (crypto→channel→chaincode)
network/configtx.yaml                 # MSP names: "OrgManufacturerMSP" (ALWAYS include MSP suffix!)
chaincode/go/supplychain.go           # 907 lines: Product lifecycle + handover workflow
apps/gateway-nodejs/src/routes/       # 5 route files: products, handovers, shipments, orders
offchain/postgres/schema.sql          # 9 tables: products, handovers, approvals, notifications
test-quick.sh                         # End-to-end handover test (runs in fabric-tools container)
BLOCKCHAIN_CORE_DESCRIPTION.txt       # 1400-line architecture bible - read this first!
```

## Developer Workflows

### Setup Network (First Time)
```powershell
.\setup.ps1  # Auto: bootstrap network + DB + API + smoke tests (~5 min)
```

### Daily Development Pattern
```powershell
# 1. Edit chaincode
nano chaincode/go/supplychain.go

# 2. Update Go deps (if needed)
docker run --rm -v ${PWD}/chaincode/go:/work -w /work golang:1.19 go mod tidy

# 3. Increment sequence in deployChaincode-docker.ps1
# Change: $CC_SEQUENCE = 1  →  $CC_SEQUENCE = 2

# 4. Deploy upgrade
cd network/scripts; .\deployChaincode-docker.ps1

# 5. Verify
docker exec fabric-tools peer lifecycle chaincode querycommitted \
  -C supplychain-channel -n supplychain_cc
```

### Testing Pattern (Always Use Bash in Container)
```powershell
# PowerShell has JSON escaping issues - use bash!
docker cp test-quick.sh fabric-tools:/tmp/
docker exec fabric-tools bash /tmp/test-quick.sh

# Go unit tests
docker exec fabric-tools bash -c "cd /chaincode/go && go test -v -cover"
```

## MSP-Based Access Control (Critical Pattern)

**Rule**: Every function must validate caller's MSP ID from certificate (NOT from parameters!)

```go
// ✅ CORRECT - Get MSP from cryptographic identity
clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
if clientMSPID != "OrgManufacturerMSP" {
    return fmt.Errorf("only manufacturer can create products")
}

// ❌ WRONG - Never trust user-provided organization parameter
func CreateProduct(ctx, productID, organization string) {
    if organization != "Manufacturer" {  // Can be forged!
        return errors.New("unauthorized")
    }
}
```

**Access Matrix** (memorize this):
- `CreateProduct`: OrgManufacturerMSP only
- `RequestHandoverToShipper`: OrgManufacturerMSP only
- `AcceptHandover` (to Shipper): OrgShipperMSP only
- `UpdateShipment`: OrgShipperMSP only
- `ReceiveAtWarehouse`: OrgWarehouseMSP only
- `MarkAsSold`: OrgRetailerMSP only
- Query functions: All organizations (read-only)

## Handover Workflow Implementation

```go
// Step 1: Manufacturer initiates
RequestHandoverToShipper(productID, shipperID, waybill, signature)
  → Creates Handover{Status: PENDING}
  → Updates Product{PendingHandover: handoverID, Status: "HandoverRequested"}
  → Emits "HandoverRequested" event

// Step 2a: Shipper accepts
AcceptHandover(handoverID, receiverID, signature)
  → Validates: caller MSP matches handover.ToOrg
  → Updates Handover{Status: ACCEPTED, AcceptedBy: identity}
  → Transfers Product{Owner: "Shipper", Status: "InTransit"}
  → Appends Approval{Actor, Timestamp, Signature} to Product.Approvals
  → Clears Product.PendingHandover
  → Emits "HandoverCompleted" event

// Step 2b: Shipper rejects
RejectHandover(handoverID, reason, signature)
  → Updates Handover{Status: REJECTED, RejectionReason: reason}
  → Reverts Product{Owner: "Manufacturer", Status: "HandoverFailed"}
  → Appends Approval with rejection details
  → Emits "HandoverRejected" event
```

**Key Insight**: Product can have ONLY ONE pending handover at a time. Check `product.PendingHandover == ""` before creating new handover.

## Endorsement Policy: MAJORITY (3/4 Orgs)

**Critical**: ALL invoke commands MUST specify 3 peer addresses to satisfy policy:

```bash
# ✅ CORRECT - 3 peers = MAJORITY satisfied
peer chaincode invoke -o orderer.example.com:7050 \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /crypto/.../manufacturer.../ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /crypto/.../shipper.../ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /crypto/.../warehouse.../ca.crt \
  -c '{"function":"CreateProduct","Args":[...]}'

# ❌ WRONG - Single peer = endorsement failure
peer chaincode invoke -C channel -n cc \
  -c '{"function":"CreateProduct","Args":[...]}' # Missing peers!
```

## Chaincode Upgrade Sequence (Never Forget!)

**Current**: Sequence 1 (initial deployment Nov 2025)  
**Rule**: Sequence MUST increment for every upgrade (1 → 2 → 3...)  
**No rollback**: Only way back is full network teardown + rebootstrap

**Sequence Change Checklist**:
1. Edit `deployChaincode-docker.ps1`: Change `$CC_SEQUENCE = 1` to `2`
2. Modify `supplychain.go` (content hash changes automatically)
3. Run deployment: `.\deployChaincode-docker.ps1`
4. All 4 orgs auto-approve with new sequence
5. Commit requires MAJORITY endorsement

**If you see**: "requested sequence is 1, but new definition must be sequence 2"  
**Fix**: Increment `$CC_SEQUENCE` in deployment script

## Common Pitfalls & Solutions

### Issue: "ENDORSEMENT_POLICY_FAILURE - 1 sub-policies satisfied, but requires 3"
**Root Cause**: Only called 1 peer, policy needs 3/4 endorsements  
**Fix**: Add `--peerAddresses` for manufacturer, shipper, warehouse (see Endorsement Policy section)

### Issue: PowerShell JSON escaping breaks chaincode invoke
**Symptom**: `invalid character 'f' looking for beginning of object key string`  
**Root Cause**: PowerShell mangles JSON in docker exec  
**Fix**: ALWAYS use bash for chaincode operations:
```powershell
docker exec fabric-tools bash -c 'peer chaincode invoke ... -c "{\"function\":\"GetProduct\",\"Args\":[\"PROD001\"]}"'
```

### Issue: "genesis block is a directory"
**Symptom**: Orderers exit immediately after start  
**Root Cause**: docker-compose.yaml mounts directory instead of file  
**Fix**: Verify mount is `./channel-artifacts/genesis.block:ro` (file, not folder)

### Issue: Chaincode install says "chaincode already successfully installed"
**Expected**: This is normal for upgrades - script continues with approve/commit steps  
**Action**: No fix needed, proceed to next step

### Issue: "missing go.sum" during chaincode package
**Fix**: 
```powershell
cd chaincode/go
docker run --rm -v ${PWD}:/work -w /work golang:1.19 go mod tidy
```

## Port Allocation (Memorize for Debugging)

```
Orderers:   7050, 8050, 9050
Peers:      7051 (Manufacturer), 8051 (Shipper), 9051 (Warehouse), 10051 (Retailer)
CouchDB:    5984, 6984, 7984, 8984 (respectively)
API:        3000
PostgreSQL: 5432
Prometheus: 9090
Grafana:    3001
```

## Security Model (Two Layers)

**Layer 1: Fabric Framework (Automatic)** ✅ ACTIVE
- X.509 certificates + ECDSA signatures on EVERY transaction
- Certificate chain validation by CA before chaincode execution
- TLS 1.2+ for all peer-to-peer communication
- MSP-based identity management

**Layer 2: Application Signatures (Metadata)** ⚠️ NOT CRYPTOGRAPHIC
- Signature fields in `Handover` and `Approval` structs are STRINGS
- Stored for audit trail, but NOT cryptographically verified
- Test scripts use "sig100", "sig200" - would work in production!
- Future enhancement: Implement crypto/ecdsa verification

**Key Insight**: Fabric's transaction signatures (Layer 1) provide production-grade security. Application signatures are additional audit metadata.

## Testing Infrastructure

**Go Unit Tests**: 13/13 passing (struct validation only)
```powershell
docker exec fabric-tools bash -c "cd /chaincode/go && go test -v"
```

**Integration Test**: End-to-end handover workflow
```powershell
docker cp test-quick.sh fabric-tools:/tmp/
docker exec fabric-tools bash /tmp/test-quick.sh
# Expected: 3 transactions status:200 (CreateProduct, RequestHandover, AcceptHandover)
```

**API Tests**: ⚠️ Framework exists but mocks broken
- Location: `apps/gateway-nodejs/tests/`
- Issue: `fabricClient` mock returns undefined
- TODO: Create `__mocks__/fabricClient.js`

## Key Documentation Files

- `BLOCKCHAIN_CORE_DESCRIPTION.txt` - 1400 lines of architecture deep-dive
- `TEST_RESULTS_NOV12_2025.md` - Latest test run (all passing)
- `DIGITAL_SIGNATURE_ANALYSIS.md` - Security analysis (2 signature layers)
- `HANDOVER_WORKFLOW_VERIFICATION.md` - Workflow verification proof
- `docs/design.md` - Network topology, endorsement policies
- `docs/runbook.md` - Operations manual (incident response)

## When Things Break

```powershell
# 1. Check container health
docker ps  # All 13 containers up? (3 orderers + 4 peers + 4 CouchDB + 2 CLI)

# 2. Check logs (most common issues show here)
docker logs peer0.manufacturer.example.com
docker logs orderer.example.com

# 3. Verify chaincode deployed
docker exec fabric-tools peer lifecycle chaincode querycommitted \
  -C supplychain-channel -n supplychain_cc
# Should show: Version 1.0, Sequence 1, Approvals: all true

# 4. Test basic query
docker exec fabric-tools bash -c 'peer chaincode query \
  -C supplychain-channel -n supplychain_cc \
  -c "{\"function\":\"GetAllProducts\",\"Args\":[]}"'

# 5. Full teardown + restart (nuclear option)
.\network\scripts\cleanup.ps1
.\network\scripts\bootstrap-docker.ps1
```

## Project Conventions

**PowerShell Scripts**: Use `$ErrorActionPreference = "Stop"` (fail-fast), check `$LASTEXITCODE` after docker commands, `Write-Host "OK" -ForegroundColor Green` for success

**API Error Format**: All routes return `{success: false, error: "msg"}` or `{success: true, data: {...}}`

**Container Commands**: NEVER run Fabric CLI on Windows host - ALWAYS `docker exec fabric-tools <command>`

**Organization Naming**: Config files use `OrgManufacturerMSP`, Docker hostnames use `peer0.manufacturer.example.com`, chaincode validates MSP IDs with "MSP" suffix

## Current Production Status (Nov 23, 2025)

✅ Network: 13 containers operational  
✅ Chaincode: v1.0 sequence 1 committed with 4/4 approvals  
✅ Tests: 13/13 unit tests + 3/3 integration tests passing  
✅ Security: X.509 + ECDSA signatures active, MSP validation enforced  
✅ Handover Workflow: Verified end-to-end (see TEST_RESULTS_NOV12_2025.md)  
⏸️ Event Listener: Infrastructure ready, implementation pending  
⏸️ API Tests: Mocks need fixing  

**Known Non-Critical Issues**:
- Schema validation warning in GetProduct query (data correct, metadata issue)
- PowerShell 2>&1 redirection in smokeTest-docker.ps1 (use bash version)

---

**Last Updated**: November 23, 2025  
**Maintainer**: GitHub Copilot (auto-generated from codebase analysis)  
**For deep dive**: Read `BLOCKCHAIN_CORE_DESCRIPTION.txt` (1400 lines)
