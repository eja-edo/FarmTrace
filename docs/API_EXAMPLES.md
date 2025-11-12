# API Testing Examples

## Prerequisites

Make sure the network and API are running:
```powershell
# Check network
docker ps

# Check API
curl http://localhost:3000/health
```

## 1. Create Product (Manufacturer)

```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "id": "LAPTOP001",
    "name": "Dell XPS 15",
    "batch": "BATCH_2025_Q1",
    "origin": "Factory Hanoi",
    "manufactureDate": "2025-11-02",
    "metaHash": "QmHash123456"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "LAPTOP001",
    "name": "Dell XPS 15",
    "status": "Manufactured",
    "owner": "Manufacturer"
  }
}
```

## 2. Get Product Details

```powershell
curl http://localhost:3000/api/products/LAPTOP001
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "id": "LAPTOP001",
    "name": "Dell XPS 15",
    "batch": "BATCH_2025_Q1",
    "origin": "Factory Hanoi",
    "status": "Manufactured",
    "owner": "Manufacturer",
    "createdAt": "2025-11-02T..."
  }
}
```

## 3. Ship Product

```powershell
curl -X PUT http://localhost:3000/api/products/LAPTOP001/ship `
  -H "Content-Type: application/json" `
  -d '{
    "shipperId": "VIETTEL_POST",
    "waybill": "VTP123456789",
    "destination": "Warehouse HCM"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Product shipped successfully"
}
```

## 4. Update Shipment Location

```powershell
curl -X PUT http://localhost:3000/api/shipments/VTP123456789/update `
  -H "Content-Type: application/json" `
  -d '{
    "location": "Bien Hoa Distribution Center",
    "temperature": 24.5
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Shipment updated successfully"
}
```

Update multiple times to simulate journey:

```powershell
# Location 2
curl -X PUT http://localhost:3000/api/shipments/VTP123456789/update `
  -H "Content-Type: application/json" `
  -d '{
    "location": "Thu Duc Hub",
    "temperature": 25.0
  }'

# Location 3
curl -X PUT http://localhost:3000/api/shipments/VTP123456789/update `
  -H "Content-Type: application/json" `
  -d '{
    "location": "District 1 Warehouse",
    "temperature": 23.8
  }'
```

## 5. Receive at Warehouse

```powershell
curl -X PUT http://localhost:3000/api/products/LAPTOP001/warehouse `
  -H "Content-Type: application/json" `
  -d '{
    "warehouseId": "WH_HCM_CENTRAL"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Product received at warehouse"
}
```

## 6. Deliver to Retailer

```powershell
curl -X PUT http://localhost:3000/api/products/LAPTOP001/retailer `
  -H "Content-Type: application/json" `
  -d '{
    "retailerId": "THEGIOIDIDONG_D1"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Product delivered to retailer"
}
```

## 7. Mark as Sold

```powershell
curl -X PUT http://localhost:3000/api/products/LAPTOP001/sold `
  -H "Content-Type: application/json" `
  -d '{
    "invoiceRef": "INV_2025_000123"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Product marked as sold"
}
```

## 8. Get Product History (Traceability)

```powershell
curl http://localhost:3000/api/products/LAPTOP001/history
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "txId": "abc123...",
      "timestamp": "2025-11-02T10:00:00Z",
      "record": {
        "id": "LAPTOP001",
        "status": "Manufactured",
        "owner": "Manufacturer"
      },
      "isDelete": false
    },
    {
      "txId": "def456...",
      "timestamp": "2025-11-02T11:30:00Z",
      "record": {
        "id": "LAPTOP001",
        "status": "Shipped",
        "owner": "VIETTEL_POST"
      },
      "isDelete": false
    },
    {
      "txId": "ghi789...",
      "timestamp": "2025-11-02T14:00:00Z",
      "record": {
        "id": "LAPTOP001",
        "status": "InWarehouse",
        "owner": "WH_HCM_CENTRAL"
      },
      "isDelete": false
    }
    // ... more history entries
  ]
}
```

## 9. Get All Products

```powershell
curl http://localhost:3000/api/products
```

## 10. Create Order

```powershell
curl -X POST http://localhost:3000/api/orders `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ORDER_2025_001",
    "productIds": ["LAPTOP001"],
    "buyerId": "CUSTOMER_001",
    "sellerId": "THEGIOIDIDONG_D1",
    "totalPrice": 25000000
  }'
```

## Complete Flow Example

Here's a complete example testing the entire supply chain:

```powershell
# 1. Create product
$product = @{
    id = "PHONE001"
    name = "iPhone 15 Pro"
    batch = "BATCH_2025_W44"
    origin = "Factory Vietnam"
    manufactureDate = "2025-11-01"
    metaHash = "QmPhoneHash123"
} | ConvertTo-Json

curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d $product

Start-Sleep -Seconds 2

# 2. Ship product
$shipment = @{
    shipperId = "DHL_EXPRESS"
    waybill = "DHL987654321"
    destination = "Warehouse Hanoi"
} | ConvertTo-Json

curl -X PUT http://localhost:3000/api/products/PHONE001/ship `
  -H "Content-Type: application/json" `
  -d $shipment

Start-Sleep -Seconds 2

# 3. Update shipment
$location1 = @{
    location = "Airport Cargo"
    temperature = 22.0
} | ConvertTo-Json

curl -X PUT http://localhost:3000/api/shipments/DHL987654321/update `
  -H "Content-Type: application/json" `
  -d $location1

Start-Sleep -Seconds 2

# 4. Warehouse receive
$warehouse = @{
    warehouseId = "WH_HANOI_001"
} | ConvertTo-Json

curl -X PUT http://localhost:3000/api/products/PHONE001/warehouse `
  -H "Content-Type: application/json" `
  -d $warehouse

Start-Sleep -Seconds 2

# 5. Deliver to retailer
$retailer = @{
    retailerId = "FPT_SHOP_HN"
} | ConvertTo-Json

curl -X PUT http://localhost:3000/api/products/PHONE001/retailer `
  -H "Content-Type: application/json" `
  -d $retailer

Start-Sleep -Seconds 2

# 6. Mark sold
$sold = @{
    invoiceRef = "INV_FPT_2025_999"
} | ConvertTo-Json

curl -X PUT http://localhost:3000/api/products/PHONE001/sold `
  -H "Content-Type: application/json" `
  -d $sold

Start-Sleep -Seconds 2

# 7. Get complete history
Write-Host "`n=== Product History ===" -ForegroundColor Cyan
curl http://localhost:3000/api/products/PHONE001/history | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Batch Testing

Create multiple products for testing:

```powershell
# Create 10 test products
for ($i = 1; $i -le 10; $i++) {
    $product = @{
        id = "TEST_$i"
        name = "Test Product $i"
        batch = "BATCH_TEST"
        origin = "Test Factory"
        manufactureDate = (Get-Date -Format "yyyy-MM-dd")
        metaHash = "hash_$i"
    } | ConvertTo-Json
    
    curl -X POST http://localhost:3000/api/products `
      -H "Content-Type: application/json" `
      -d $product
    
    Write-Host "Created TEST_$i" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Get all products
curl http://localhost:3000/api/products
```

## Error Scenarios

### Invalid Product ID
```powershell
curl http://localhost:3000/api/products/INVALID_ID
# Expected: 404 Not Found
```

### Duplicate Product Creation
```powershell
# Create product twice
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{"id":"DUP001","name":"Test","batch":"B1","origin":"F1","manufactureDate":"2025-11-02"}'

curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{"id":"DUP001","name":"Test","batch":"B1","origin":"F1","manufactureDate":"2025-11-02"}'
# Expected: Error - product already exists
```

### Invalid Status Transition
```powershell
# Try to mark as sold before shipping
curl -X PUT http://localhost:3000/api/products/LAPTOP001/sold `
  -H "Content-Type: application/json" `
  -d '{"invoiceRef":"INV001"}'
# Expected: Error - invalid status transition
```

## Performance Testing

Simple load test:

```powershell
# Create 100 products concurrently
1..100 | ForEach-Object -Parallel {
    $id = "PERF_$_"
    $product = @{
        id = $id
        name = "Performance Test $_"
        batch = "BATCH_PERF"
        origin = "Test Factory"
        manufactureDate = "2025-11-02"
        metaHash = "hash_$_"
    } | ConvertTo-Json
    
    curl -X POST http://localhost:3000/api/products `
      -H "Content-Type: application/json" `
      -d $product
} -ThrottleLimit 10
```

## Monitoring Queries

Check metrics:

```powershell
# Health check
curl http://localhost:3000/health

# Metrics (if enabled)
curl http://localhost:3000/metrics
```

## Troubleshooting

If API returns errors:

1. Check API logs:
```powershell
Get-Content apps\gateway-nodejs\logs\combined.log -Tail 50
```

2. Check network status:
```powershell
docker ps
```

3. Check chaincode logs:
```powershell
docker logs peer0.manufacturer.example.com
```

4. Test direct chaincode invocation:
```powershell
docker exec cli peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}'
```
