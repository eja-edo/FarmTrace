# Copilot Instructions - Blockchain Supply Chain (Hyperledger Fabric)

## Architecture Overview

This is a **100% Docker-based Hyperledger Fabric blockchain** for supply chain traceability with 4 organizations: Manufacturer → Shipper → Warehouse → Retailer.

**Key architectural decisions:**
- **Docker-only approach**: No local Fabric binaries needed - all `cryptogen`, `configtxgen`, `peer` commands run in containers (`hyperledger/fabric-tools:2.5`)
- **Dual-script pattern**: Each operation has both legacy script (`bootstrap.ps1`) and Docker version (`bootstrap-docker.ps1`) - **always use `-docker.ps1` variants**
- **Raft consensus**: 3 orderers for production-ready fault tolerance (not solo/Kafka)
- **Off-chain hybrid**: Blockchain stores state/history, PostgreSQL stores metadata/search indexes
- **Handover approval workflow**: Two-step ownership transfer (request → accept/reject) with human verification and cryptographic signatures

## Critical File Locations

```
network/
├── docker-compose.yaml          # Main network (3 orderers + 4 peers + 4 CouchDB)
├── docker-compose-tools.yaml    # fabric-tools container for CLI operations
├── configtx.yaml               # Organizations are "OrgManufacturerMSP" NOT "OrgManufacturer"
└── scripts/
    ├── bootstrap-docker.ps1    # ⭐ Primary setup script
    ├── generateCrypto-docker.ps1
    ├── createChannel-docker.ps1
    └── deployChaincode-docker.ps1

chaincode/go/
├── supplychain.go              # Main smart contract with MSP-based access control
│                               # Includes handover workflow (RequestHandover, AcceptHandover, RejectHandover)
└── go.mod                      # Module: github.com/hyperledger/fabric-samples/supplychain

apps/gateway-nodejs/src/
├── routes/
│   ├── products.js             # Basic product CRUD
│   ├── handovers.js            # Handover approval workflow endpoints (NEW)
│   ├── shipments.js            # Shipment tracking
│   └── orders.js               # Order management
└── utils/fabricClient.js       # Fabric SDK wrapper

offchain/postgres/
└── schema.sql                  # Database schema with handover tables (pending_handovers, handover_approvals, notifications)
```

## Development Workflows

### Setup Network (One Command)
```powershell
.\setup.ps1  # Runs bootstrap-docker.ps1, starts DB, installs API deps, smoke tests
```

### Manual Network Operations
```powershell
# Network lifecycle
cd network
docker-compose down                              # Stop network
docker-compose -f docker-compose.yaml up -d      # Start network only
docker-compose -f docker-compose-tools.yaml up -d # Start CLI container

# Channel operations (via fabric-tools container)
docker exec fabric-tools peer channel list
docker exec fabric-tools peer channel getinfo -c supplychain-channel

# Chaincode queries
docker exec fabric-tools peer chaincode query \
  -C supplychain-channel -n supplychain_cc \
  -c '{"function":"GetProduct","Args":["PROD001"]}'
```

**fabric-tools Container Pattern**: All `peer`, `configtxgen`, `cryptogen` commands run inside `hyperledger/fabric-tools:2.5` container. This container has:
- All crypto materials mounted (`crypto-config/`)
- Channel artifacts mounted (`channel-artifacts/`)
- Chaincode source mounted (for packaging)
- Pre-configured environment variables for peer connections
- **Never** run Fabric CLI commands on Windows host - always `docker exec fabric-tools`

### Chaincode Development Pattern
1. **Modify** `chaincode/go/supplychain.go`
2. **Update dependencies**: `docker run --rm -v ${PWD}:/work -w /work golang:1.19 go mod tidy`
3. **Increment sequence** in `deployChaincode-docker.ps1`: Change `$CC_SEQUENCE = 2` to `3`, etc.
4. **Deploy**: `cd network/scripts ; .\deployChaincode-docker.ps1`
5. **Verify**: `docker exec fabric-tools peer lifecycle chaincode querycommitted -C supplychain-channel -n supplychain_cc`

**Important**: Chaincode upgrades require:
- New package ID (content hash changes automatically)
- Incremented sequence number
- Re-approval by all 4 organizations
- MAJORITY endorsement (3/4 orgs minimum)

**Sequence History** (track this when editing):
- Sequence 1: Initial deployment (basic CRUD)
- Sequence 2: Added handover workflow functions
- Sequence 3: Current (latest deployment)
- **Always increment** before each deployment - no rollback without full network restart

**Access Control Pattern** (MSP validation):
```go
// chaincode/go/supplychain.go - Example from RequestHandoverToShipper
clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
if clientMSPID != "OrgManufacturerMSP" {
    return fmt.Errorf("only manufacturer can request handover")
}
```

**Handover Workflow Pattern** (NEW):
```go
// 1. Manufacturer requests handover
RequestHandoverToShipper(productID, shipperID, waybill, signature)
  → Creates Handover record with status=PENDING
  → Updates product.PendingHandover = handoverID
  
// 2. Shipper accepts/rejects
AcceptHandover(handoverID, receiverID, signature)
  → Changes handover.Status = ACCEPTED
  → Transfers product.Owner and product.CurrentHolder
  → Adds Approval record to product.Approvals array
  
RejectHandover(handoverID, reason, signature)
  → Changes handover.Status = REJECTED
  → Clears product.PendingHandover
  → Logs rejection reason for audit
```

## Common Issues & Solutions

### Issue: "requested sequence is 1, but new definition must be sequence X"
**Cause**: Chaincode already deployed with previous sequence number  
**Fix**: Increment `$CC_SEQUENCE` in `deployChaincode-docker.ps1` (e.g., 1 → 2 → 3)
```powershell
$CC_SEQUENCE = 2  # Change this line before redeploying
```

### Issue: "chaincode already successfully installed"
**Cause**: Same package ID exists from previous deployment  
**Fix**: This is expected for upgrades - script continues with approve/commit steps

### Issue: "genesis block is a directory"
**Cause**: docker-compose.yaml mounts wrong path  
**Fix**: Verify in docker-compose.yaml - should be `./channel-artifacts/genesis.block:ro` (not directory)

### Issue: "invalid number of args" during chaincode package
**Cause**: PowerShell variable expansion in docker exec  
**Fix**: Use hardcoded values: `supplychain_cc.tar.gz` (not `${CC_NAME}.tar.gz`)

### Issue: Chaincode install fails with "missing go.sum"
**Solution**:
```powershell
cd chaincode/go
docker run --rm -v ${PWD}:/work -w /work golang:1.19 go mod tidy
```

### Issue: Orderers exit immediately
**Check**: `docker logs orderer.example.com` - verify genesis block path is file, not directory

### Issue: API returns "endorsement policy failure"
**Cause**: Not enough organizations endorsed transaction (need 3/4 for MAJORITY)  
**Check**: `docker logs peer0.manufacturer.example.com` - look for endorsement errors

### Issue: Docker volume permission errors (Windows)
**Symptom**: "permission denied" when containers try to write to volumes  
**Cause**: Docker Desktop file sharing not enabled for drive  
**Fix**: Docker Desktop → Settings → Resources → File Sharing → Add `E:\` (or your drive)

### Issue: "Error: could not assemble transaction" 
**Cause**: Chaincode parameters don't match function signature  
**Example**: `RequestHandoverToShipper` needs 4 args (productID, shipperID, waybill, signature)  
**Fix**: Check chaincode function definition in `supplychain.go` - args must match exactly

## Project Conventions

### Organization Naming
- **Config files** (configtx.yaml): `OrgManufacturerMSP`, `OrgShipperMSP`, etc.
- **Docker hostnames**: `peer0.manufacturer.example.com`, `orderer.example.com`
- **MSP IDs** in chaincode: Always include "MSP" suffix

### Port Allocation
```
Orderers:       7050, 8050, 9050
Peers:          7051, 8051, 9051, 10051 (Manufacturer, Shipper, Warehouse, Retailer)
CouchDB:        5984, 6984, 7984, 8984
API Gateway:    3000
PostgreSQL:     5432
Prometheus:     9090
Grafana:        3001
```

### PowerShell Scripts Pattern
- Use `$ErrorActionPreference = "Stop"` (fail-fast)
- Check `$LASTEXITCODE` after every docker command
- Output: `Write-Host "OK ..." -ForegroundColor Green` for success, `ERROR ...` -ForegroundColor Red for failures

### API Error Handling
```javascript
// apps/gateway-nodejs/src/middleware/errorHandler.js
// All errors return: { success: false, error: "message" }
// Success returns: { success: true, data: {...} }
```

## Testing Workflows

### Smoke Tests (Docker-based)
```powershell
cd network/scripts
.\smokeTest-docker.ps1  # Tests: containers, channel, chaincode, CreateProduct, GetProduct
```

### API Testing (Manual)
```powershell
# Create product (Manufacturer only)
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{"productId":"PROD001","name":"Widget","category":"Electronics",...}'

# Request handover to shipper (NEW - Manufacturer only)
curl -X POST http://localhost:3000/api/handovers/request-shipper `
  -H "Content-Type: application/json" `
  -d '{"productId":"PROD001","shipperId":"SHIP001","waybill":"WB123","signature":"sig123"}'

# Get pending handovers (NEW - Shipper checks)
curl http://localhost:3000/api/handovers/pending

# Accept handover (NEW - Shipper accepts)
curl -X POST http://localhost:3000/api/handovers/HANDOVER-PROD001-SHIPPER/accept `
  -H "Content-Type: application/json" `
  -d '{"receiverId":"DRIVER001","signature":"sig456"}'

# Get product history (traceability)
curl http://localhost:3000/api/products/PROD001/history
```

## Integration Points

### Blockchain ↔ API Gateway
- **Connection Profile**: `network/connection-manufacturer.json` defines peer/orderer endpoints
- **Identity**: Wallet stored in `apps/gateway-nodejs/wallet/` (enrolled via `enrollAdmin.js`, `registerUser.js`)
- **SDK**: `fabric-network` v2.2.x with Gateway API pattern

### Blockchain ↔ PostgreSQL
- **Event Listener** (TODO): Subscribe to block events, index transactions to `offchain/postgres/schema.sql`
- **Current**: Manual writes via API (not automated sync yet)

### Monitoring
- **Prometheus**: Scrapes orderer:9443-9445, peer:9443-9446 metrics endpoints
- **Grafana dashboards**: `ci-cd/monitoring/` - import JSON configs manually

## Documentation Sources
- **Architecture**: `docs/design.md` (network topology, endorsement policies)
- **Deployment**: `docs/deployment.md` (production checklist, HA setup)
- **Operations**: `docs/runbook.md` (daily checks, incident response)
- **Quick Start**: `QUICKSTART.md` (10-minute tutorial)
- **Docker Migration**: `DOCKER_MIGRATION_SUMMARY.md` (why Docker-only, what changed)

## When Editing This Project

✅ **Always use Docker scripts** (`*-docker.ps1`) - legacy scripts require local binaries  
✅ **Test chaincode changes** by running full `deployChaincode-docker.ps1` (no hot-reload)  
✅ **Check container logs** before filing issues: `docker logs <container_name>`  
✅ **Organization names** must match exactly (case-sensitive MSP IDs)  
⚠️ **Genesis block changes** require full network teardown: `cleanup.ps1` then `bootstrap-docker.ps1`

## Current State (Nov 3, 2025)

**Network**: ✅ 17 containers running (3 orderers + 4 peers + 4 CouchDB + 4 chaincode + fabric-tools + cli)  
**Chaincode**: ✅ v1.0 Sequence 4 deployed and VERIFIED working  
**API**: ✅ 5 endpoints for products + 5 for handovers  
**Database**: ✅ PostgreSQL with 3 handover tables (pending_handovers, handover_approvals, notifications)  
**Tests**: ✅ 13 Go unit tests passing | ✅ Handover workflow VERIFIED end-to-end

**Recent Changes**:
- Added two-step handover approval workflow (replaces automatic transfers)
- New chaincode functions: `RequestHandoverToShipper`, `AcceptHandover`, `RejectHandover`, `GetHandover`, `GetPendingHandoversForOrg`
- New API routes: `/api/handovers/*` with 5 endpoints
- Updated Product struct with `CurrentHolder`, `PendingHandover`, `Approvals[]` fields
- Database schema extended with handover tracking tables
- Testing infrastructure setup (Jest + testify, coverage thresholds at 75%)
- **✅ VERIFIED**: End-to-end handover workflow working (see `HANDOVER_WORKFLOW_VERIFICATION.md`)
- **Bug Fix**: Fixed duplicate variable declaration in `AcceptHandover` (line 675)

## Testing Strategy

### Go Chaincode Tests
```powershell
cd chaincode/go
docker run --rm -v ${PWD}:/work -w /work golang:1.19 go test -v -cover
```

**Current Status**: ✅ 13/13 struct validation tests passing
- Test file: `chaincode/go/supplychain_simple_test.go`
- Coverage: Basic struct tests only (function tests pending)
- Framework: `github.com/stretchr/testify/assert`

### API Tests
```powershell
cd apps/gateway-nodejs
npm test                    # All tests with coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests (planned)
npm run test:watch         # Watch mode
```

**Current Status**: ⚠️ Tests written but need mock fixes
- Test directory: `apps/gateway-nodejs/tests/unit/`
- Issue: `fabricClient` mock returns undefined - need to create `__mocks__/fabricClient.js`
- Framework: Jest + supertest
- Coverage target: 75% (configured in package.json)

### Known Testing Issues
1. **API mocks broken**: Need proper `fabricClient.js` mock implementation
2. **Chaincode function tests missing**: Only struct tests exist (0% function coverage)
3. **Smoke test PowerShell error**: `smokeTest-docker.ps1` has 2>&1 redirection issues
4. **Schema validation warnings**: Contract metadata needs optional field updates (non-blocking)

### Working Test Scripts
- ✅ `test-workflow-simple.sh` - Verified handover workflow (run in fabric-tools container)
- ✅ `test-chaincode.sh` - Basic chaincode function tests
- ⚠️ Use bash scripts in container instead of PowerShell for JSON escaping issues
