# Quick Start Testing Guide

## 🚀 Immediate Tests (After Setup)

### 1. Network Health Check

```powershell
# Check all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "orderer|peer|couchdb"

# Expected: 11 containers (3 orderers + 4 peers + 4 CouchDB)
```

### 2. Smoke Test

```powershell
cd network\scripts
.\smokeTest-docker.ps1
```

**Expected Output**:
```
✅ OK 11 containers running
✅ OK Channel supplychain-channel exists
✅ OK Chaincode supplychain_cc is deployed
✅ OK Successfully invoked CreateProduct
✅ OK Successfully queried product
```

### 3. API Health Check

```powershell
# Start API if not running
cd apps\gateway-nodejs
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health
```

**Expected**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T16:30:00.000Z"
}
```

## 🧪 Manual API Testing

### Test 1: Create Product (Manufacturer)

```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "productId": "TEST001",
    "name": "Test Widget",
    "category": "Electronics",
    "manufacturer": "Test Corp",
    "manufactureDate": "2025-11-02"
  }'
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "productId": "TEST001",
    "status": "Manufactured"
  }
}
```

### Test 2: Get Product

```powershell
curl http://localhost:3000/api/products/TEST001
```

**Expected**: Product details with status "Manufactured"

### Test 3: Ship Product

```powershell
curl -X PUT http://localhost:3000/api/products/TEST001/ship `
  -H "Content-Type: application/json" `
  -d '{"shipmentId": "SHIP_TEST001"}'
```

### Test 4: Update Shipment (Shipper)

```powershell
curl -X PUT http://localhost:3000/api/shipments/SHIP_TEST001/update `
  -H "Content-Type: application/json" `
  -d '{
    "status": "In Transit",
    "temperature": 22.5,
    "location": "Highway A"
  }'
```

### Test 5: Receive at Warehouse

```powershell
curl -X PUT http://localhost:3000/api/products/TEST001/warehouse `
  -H "Content-Type: application/json" `
  -d '{"warehouseId": "WH_TEST001"}'
```

### Test 6: Deliver to Retailer

```powershell
curl -X PUT http://localhost:3000/api/products/TEST001/retailer `
  -H "Content-Type: application/json" `
  -d '{"retailerId": "RETAIL_TEST001"}'
```

### Test 7: Mark as Sold

```powershell
curl -X PUT http://localhost:3000/api/products/TEST001/sold `
  -H "Content-Type: application/json" `
  -d '{
    "customerId": "CUSTOMER001",
    "price": 99.99
  }'
```

### Test 8: Get Product History (Traceability)

```powershell
curl http://localhost:3000/api/products/TEST001/history
```

**Expected**: Array of all state changes with timestamps and transaction IDs

## 🔍 Direct Blockchain Testing

### Query Chaincode Directly

```powershell
# Get product from blockchain
docker exec fabric-tools peer chaincode query `
  -C supplychain-channel `
  -n supplychain_cc `
  -c '{"function":"GetProduct","Args":["TEST001"]}'

# Get all products
docker exec fabric-tools peer chaincode query `
  -C supplychain-channel `
  -n supplychain_cc `
  -c '{"function":"GetAllProducts","Args":[]}'

# Get product history
docker exec fabric-tools peer chaincode query `
  -C supplychain-channel `
  -n supplychain_cc `
  -c '{"function":"GetProductHistory","Args":["TEST001"]}'
```

### Invoke Chaincode Directly

```powershell
# Create product via chaincode
docker exec fabric-tools peer chaincode invoke `
  -o orderer.example.com:7050 `
  --tls `
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
  -C supplychain-channel `
  -n supplychain_cc `
  --peerAddresses peer0.manufacturer.example.com:7051 `
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
  -c '{"function":"CreateProduct","Args":["DIRECT001","Direct Test","BATCH001","Factory","2025-11-02","hash123"]}'
```

## 📊 View Data in UI

### CouchDB (Blockchain State)

1. Open browser: http://localhost:5984/_utils
2. Login: `admin` / `adminpw`
3. Navigate to: `supplychain-channel_supplychain_cc` database
4. View all products

### PostgreSQL (Off-chain)

1. Open browser: http://localhost:5050
2. Login: `admin@admin.com` / `admin`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `supplychain`
   - Username: `postgres`
   - Password: `postgres`
4. Query tables: `product_metadata`, `audit_log`, etc.

## 🐛 Troubleshooting Quick Tests

### Issue: API returns 500 error

**Check**:
```powershell
# View API logs
cd apps\gateway-nodejs
npm start  # Watch console output

# Check connection to blockchain
docker logs fabric-tools
docker logs peer0.manufacturer.example.com
```

### Issue: Chaincode query fails

**Check**:
```powershell
# Verify chaincode is deployed
docker exec fabric-tools peer lifecycle chaincode querycommitted `
  --channelID supplychain-channel `
  --name supplychain_cc

# Check peer logs
docker logs peer0.manufacturer.example.com --tail 50
```

### Issue: Channel not found

**Check**:
```powershell
# List channels
docker exec fabric-tools peer channel list

# If empty, recreate channel
cd network\scripts
.\createChannel-docker.ps1
```

## ⚡ Performance Quick Test

### Measure Single Transaction Time

```powershell
Measure-Command {
  curl -X POST http://localhost:3000/api/products `
    -H "Content-Type: application/json" `
    -d '{
      "productId": "PERF001",
      "name": "Performance Test",
      "category": "Test"
    }'
}
```

**Expected**: < 2 seconds for first transaction, < 1 second for subsequent

### Measure Query Time

```powershell
Measure-Command {
  curl http://localhost:3000/api/products/TEST001
}
```

**Expected**: < 500ms

## 📈 Monitoring Quick Check

### Prometheus Metrics

```powershell
# Check if metrics are exposed
curl http://localhost:9090/api/v1/query?query=up

# View all targets
Start-Process "http://localhost:9090/targets"
```

### Container Resource Usage

```powershell
# Check CPU and memory usage
docker stats --no-stream
```

## ✅ Success Criteria

After running these tests, you should see:

- [x] All containers healthy
- [x] Channel created and peers joined
- [x] Chaincode deployed and functional
- [x] API responding to requests
- [x] Product lifecycle working end-to-end
- [x] History/traceability working
- [x] Data persisting in CouchDB
- [x] Metrics being collected

## 🎯 Next Steps

1. **If all tests pass**: Start implementing automated tests from `TESTING_PLAN.md`
2. **If tests fail**: Check `docs/runbook.md` for troubleshooting
3. **For production**: Review `IMPLEMENTATION_ROADMAP.md` for hardening steps

---

**Estimated Time**: 15-20 minutes  
**Difficulty**: Beginner  
**Prerequisites**: Network must be running (`.\setup.ps1` completed)
