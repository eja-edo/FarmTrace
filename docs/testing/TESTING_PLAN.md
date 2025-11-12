# 🧪 Testing Plan - Blockchain Supply Chain

## 📋 Testing Strategy Overview

### Testing Pyramid
```
                 /\
                /  \  E2E Tests (5%)
               /----\
              /      \  Integration Tests (25%)
             /--------\
            /          \  Unit Tests (70%)
           /____________\
```

## 1. 🔬 Unit Tests

### 1.1 Chaincode Unit Tests (Go)

**File**: `chaincode/go/supplychain_test.go`

```go
package main

import (
    "encoding/json"
    "testing"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    "github.com/stretchr/testify/assert"
)

// Test CreateProduct
func TestCreateProduct(t *testing.T) {
    // Setup
    contract := new(SmartContract)
    ctx := new(MockTransactionContext)
    
    // Execute
    err := contract.CreateProduct(ctx, "PROD001", "Widget", "BATCH001", "Factory A", "2025-01-01", "hash123")
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, ctx.GetStub().State["PROD001"])
}

// Test access control
func TestCreateProduct_OnlyManufacturer(t *testing.T) {
    contract := new(SmartContract)
    ctx := new(MockTransactionContext)
    ctx.ClientIdentity.MSPID = "OrgShipperMSP" // Wrong org
    
    err := contract.CreateProduct(ctx, "PROD002", "Widget", "BATCH002", "Factory", "2025-01-01", "hash")
    
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "only manufacturer")
}
```

**Run Tests**:
```powershell
cd chaincode/go
docker run --rm -v ${PWD}:/work -w /work golang:1.19 go test -v ./...
```

### 1.2 API Unit Tests (Node.js)

**File**: `apps/gateway-nodejs/tests/unit/products.test.js`

```javascript
const request = require('supertest');
const app = require('../../src/index');

describe('Product API', () => {
  test('POST /api/products - should create product', async () => {
    const product = {
      productId: 'PROD001',
      name: 'Test Product',
      category: 'Electronics',
      manufacturer: 'Test Corp',
      manufactureDate: '2025-01-01'
    };
    
    const response = await request(app)
      .post('/api/products')
      .send(product)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.productId).toBe('PROD001');
  });
  
  test('GET /api/products/:id - should get product', async () => {
    const response = await request(app)
      .get('/api/products/PROD001')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

**Run Tests**:
```powershell
cd apps/gateway-nodejs
npm test
```

## 2. 🔗 Integration Tests

### 2.1 Chaincode Integration Tests

**File**: `chaincode/go/integration_test.go`

```go
// Test full product lifecycle
func TestProductLifecycle_Integration(t *testing.T) {
    contract := new(SmartContract)
    ctx := setupTestContext(t)
    
    // 1. Create product (Manufacturer)
    ctx.ClientIdentity.MSPID = "OrgManufacturerMSP"
    err := contract.CreateProduct(ctx, "PROD_INT_001", "Widget", "BATCH001", "Factory", "2025-01-01", "hash")
    assert.NoError(t, err)
    
    // 2. Ship product (Manufacturer → Shipper)
    err = contract.ShipProduct(ctx, "PROD_INT_001", "SHIP001")
    assert.NoError(t, err)
    
    // 3. Update shipment (Shipper)
    ctx.ClientIdentity.MSPID = "OrgShipperMSP"
    err = contract.UpdateShipment(ctx, "SHIP001", "In Transit", 25.5, "Warehouse A")
    assert.NoError(t, err)
    
    // 4. Receive at warehouse (Warehouse)
    ctx.ClientIdentity.MSPID = "OrgWarehouseMSP"
    err = contract.ReceiveAtWarehouse(ctx, "PROD_INT_001", "WH001")
    assert.NoError(t, err)
    
    // 5. Deliver to retailer (Warehouse → Retailer)
    err = contract.DeliverToRetailer(ctx, "PROD_INT_001", "RETAIL001")
    assert.NoError(t, err)
    
    // 6. Mark as sold (Retailer)
    ctx.ClientIdentity.MSPID = "OrgRetailerMSP"
    err = contract.MarkAsSold(ctx, "PROD_INT_001", "CUSTOMER001", 99.99)
    assert.NoError(t, err)
    
    // Verify final state
    product, err := contract.GetProduct(ctx, "PROD_INT_001")
    assert.NoError(t, err)
    assert.Equal(t, "Sold", product.Status)
}
```

### 2.2 API Integration Tests

**File**: `apps/gateway-nodejs/tests/integration/api.test.js`

```javascript
describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Setup: Start network, deploy chaincode
    await setupNetwork();
  });
  
  test('Complete supply chain flow', async () => {
    // 1. Create product
    const createRes = await request(app)
      .post('/api/products')
      .send({
        productId: 'INT_PROD_001',
        name: 'Integration Test Widget',
        category: 'Electronics',
        manufacturer: 'Test Corp',
        manufactureDate: '2025-01-01'
      });
    expect(createRes.status).toBe(201);
    
    // 2. Ship product
    const shipRes = await request(app)
      .put('/api/products/INT_PROD_001/ship')
      .send({ shipmentId: 'SHIP_INT_001' });
    expect(shipRes.status).toBe(200);
    
    // 3. Receive at warehouse
    const warehouseRes = await request(app)
      .put('/api/products/INT_PROD_001/warehouse')
      .send({ warehouseId: 'WH_INT_001' });
    expect(warehouseRes.status).toBe(200);
    
    // 4. Deliver to retailer
    const retailerRes = await request(app)
      .put('/api/products/INT_PROD_001/retailer')
      .send({ retailerId: 'RETAIL_INT_001' });
    expect(retailerRes.status).toBe(200);
    
    // 5. Mark as sold
    const soldRes = await request(app)
      .put('/api/products/INT_PROD_001/sold')
      .send({ customerId: 'CUST_INT_001', price: 99.99 });
    expect(soldRes.status).toBe(200);
    
    // 6. Verify history
    const historyRes = await request(app)
      .get('/api/products/INT_PROD_001/history');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThan(4);
  });
});
```

**Run Tests**:
```powershell
cd apps/gateway-nodejs
npm run test:integration
```

## 3. 🌐 End-to-End Tests

### 3.1 E2E Test Script

**File**: `tests/e2e/supply-chain-flow.test.js`

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

describe('E2E: Complete Supply Chain Flow', () => {
  test('Product journey from manufacturer to customer', async () => {
    const productId = `E2E_PROD_${Date.now()}`;
    
    // Step 1: Manufacturer creates product
    const createResponse = await axios.post(`${API_BASE}/products`, {
      productId,
      name: 'E2E Test Product',
      category: 'Electronics',
      manufacturer: 'E2E Corp',
      manufactureDate: '2025-11-01'
    });
    expect(createResponse.status).toBe(201);
    
    // Wait for blockchain commit
    await sleep(2000);
    
    // Step 2: Verify product exists
    const getResponse = await axios.get(`${API_BASE}/products/${productId}`);
    expect(getResponse.data.data.status).toBe('Manufactured');
    
    // Step 3: Ship product
    await axios.put(`${API_BASE}/products/${productId}/ship`, {
      shipmentId: `SHIP_${productId}`
    });
    await sleep(2000);
    
    // Step 4: Update shipment location
    await axios.put(`${API_BASE}/shipments/SHIP_${productId}/update`, {
      status: 'In Transit',
      temperature: 22.5,
      location: 'Highway A'
    });
    await sleep(2000);
    
    // Step 5: Receive at warehouse
    await axios.put(`${API_BASE}/products/${productId}/warehouse`, {
      warehouseId: 'WH_E2E_001'
    });
    await sleep(2000);
    
    // Step 6: Deliver to retailer
    await axios.put(`${API_BASE}/products/${productId}/retailer`, {
      retailerId: 'RETAIL_E2E_001'
    });
    await sleep(2000);
    
    // Step 7: Mark as sold
    await axios.put(`${API_BASE}/products/${productId}/sold`, {
      customerId: 'CUSTOMER_E2E_001',
      price: 199.99
    });
    await sleep(2000);
    
    // Step 8: Verify complete history
    const historyResponse = await axios.get(`${API_BASE}/products/${productId}/history`);
    const history = historyResponse.data.data;
    
    expect(history.length).toBeGreaterThanOrEqual(6);
    expect(history[history.length - 1].record.status).toBe('Sold');
    
    // Step 9: Verify traceability
    const statuses = history.map(h => h.record.status);
    expect(statuses).toContain('Manufactured');
    expect(statuses).toContain('Shipped');
    expect(statuses).toContain('InWarehouse');
    expect(statuses).toContain('AtRetailer');
    expect(statuses).toContain('Sold');
  });
});
```

**Run E2E Tests**:
```powershell
cd tests/e2e
npm test
```

## 4. 🔐 Security Tests

### 4.1 Access Control Tests

**File**: `tests/security/access-control.test.js`

```javascript
describe('Security: Access Control', () => {
  test('Only Manufacturer can create products', async () => {
    // Try to create product as Shipper (should fail)
    const response = await request(app)
      .post('/api/products')
      .set('X-Org-MSP', 'OrgShipperMSP')
      .send({
        productId: 'SEC_PROD_001',
        name: 'Security Test',
        category: 'Test'
      });
    
    expect(response.status).toBe(403);
  });
  
  test('Only Shipper can update shipments', async () => {
    // Try to update shipment as Manufacturer (should fail)
    const response = await request(app)
      .put('/api/shipments/SHIP001/update')
      .set('X-Org-MSP', 'OrgManufacturerMSP')
      .send({ status: 'Delivered' });
    
    expect(response.status).toBe(403);
  });
});
```

### 4.2 TLS/Certificate Tests

**File**: `tests/security/tls.test.js`

```javascript
describe('Security: TLS Configuration', () => {
  test('All peers have valid TLS certificates', async () => {
    const peers = [
      'peer0.manufacturer.example.com:7051',
      'peer0.shipper.example.com:8051',
      'peer0.warehouse.example.com:9051',
      'peer0.retailer.example.com:10051'
    ];
    
    for (const peer of peers) {
      const cert = await getTLSCertificate(peer);
      expect(cert.valid).toBe(true);
      expect(cert.expiryDate).toBeAfter(new Date());
    }
  });
});
```

## 5. ⚡ Performance Tests

### 5.1 Load Testing

**File**: `tests/performance/load-test.js`

```javascript
const autocannon = require('autocannon');

describe('Performance: Load Testing', () => {
  test('API can handle 50 TPS', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/products/PROD001',
      connections: 50,
      duration: 30,
      pipelining: 1
    });
    
    expect(result.requests.average).toBeGreaterThan(50);
    expect(result.latency.p99).toBeLessThan(1000); // 99th percentile < 1s
  });
});
```

**Run Load Tests**:
```powershell
cd tests/performance
npm run load-test
```

### 5.2 Throughput Testing

**File**: `tests/performance/throughput.test.js`

```javascript
describe('Performance: Throughput', () => {
  test('Network can process 1000 transactions', async () => {
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      promises.push(
        axios.post(`${API_BASE}/products`, {
          productId: `PERF_${i}`,
          name: `Product ${i}`,
          category: 'Test'
        })
      );
    }
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    const tps = 1000 / (duration / 1000);
    
    expect(tps).toBeGreaterThan(30); // At least 30 TPS
  });
});
```

## 6. 🔍 Smoke Tests

### Current Smoke Test

**File**: `network/scripts/smokeTest-docker.ps1`

Already implemented - tests:
- ✅ Docker containers running
- ✅ Channel exists
- ✅ Chaincode deployed
- ✅ CreateProduct invoke
- ✅ GetProduct query

## 7. 📊 Test Execution Plan

### Phase 1: Unit Tests (Week 1)
```powershell
# Day 1-2: Setup test framework
cd chaincode/go
go get github.com/stretchr/testify/assert

cd apps/gateway-nodejs
npm install --save-dev jest supertest

# Day 3-4: Write unit tests
# - Chaincode functions (15 tests)
# - API routes (20 tests)
# - Utility functions (10 tests)

# Day 5: Run and fix
npm run test:unit
```

### Phase 2: Integration Tests (Week 2)
```powershell
# Day 1-2: Setup integration environment
# - Test network configuration
# - Mock data setup

# Day 3-4: Write integration tests
# - Chaincode lifecycle (5 tests)
# - API → Blockchain (10 tests)
# - Database sync (5 tests)

# Day 5: Run and fix
npm run test:integration
```

### Phase 3: E2E & Performance (Week 3)
```powershell
# Day 1-2: E2E scenarios
# - Complete supply chain flow
# - Error scenarios
# - Edge cases

# Day 3-4: Performance tests
# - Load testing (50+ TPS)
# - Stress testing
# - Latency benchmarks

# Day 5: Documentation & reporting
```

## 8. 🤖 CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Automated Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      
      - name: Run Chaincode Unit Tests
        run: |
          cd chaincode/go
          docker run --rm -v $PWD:/work -w /work golang:1.19 go test -v ./...
      
      - name: Run API Unit Tests
        run: |
          cd apps/gateway-nodejs
          npm install
          npm run test:unit
  
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - name: Start Network
        run: |
          cd network/scripts
          ./bootstrap-docker.ps1
      
      - name: Run Integration Tests
        run: |
          cd apps/gateway-nodejs
          npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - name: Run E2E Tests
        run: |
          cd tests/e2e
          npm test
```

## 9. 📈 Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Chaincode Functions | 90%+ |
| API Routes | 85%+ |
| Utility Functions | 80%+ |
| Integration Flows | 70%+ |
| E2E Scenarios | 100% of critical paths |

## 10. 🐛 Bug Tracking & Reporting

### Test Report Template

```markdown
## Test Execution Report - [Date]

### Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Coverage: X%

### Failed Tests
1. **Test Name**: Description
   - **Error**: Error message
   - **Expected**: Expected behavior
   - **Actual**: Actual behavior
   - **Steps to Reproduce**: 1, 2, 3...

### Performance Metrics
- Average TPS: X
- P99 Latency: Xms
- Error Rate: X%
```

## 🎯 Next Steps

1. **Implement unit test files** (chaincode + API)
2. **Setup test databases** (separate from production)
3. **Configure CI/CD pipeline**
4. **Create test data generators**
5. **Setup monitoring for test environments**
6. **Document test procedures**

---

**Status**: ⏳ Ready to implement  
**Priority**: 🔴 High  
**Estimated Time**: 3 weeks
