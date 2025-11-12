# Quick Start Guide

## Giới thiệu

Hệ thống Supply Chain Blockchain sử dụng Hyperledger Fabric để theo dõi và quản lý chuỗi cung ứng từ nhà sản xuất đến người tiêu dùng cuối.

## Yêu cầu trước khi bắt đầu

✅ Docker Desktop đã cài đặt và đang chạy
✅ PowerShell 5.1 trở lên
✅ Node.js 16.x trở lên
✅ 8GB RAM trở lên
✅ 50GB dung lượng đĩa trống

## Các bước cài đặt nhanh

### Bước 1: Cài đặt Hyperledger Fabric binaries

```powershell
cd network\scripts
.\install-fabric.ps1
```

**Lưu ý**: Khởi động lại PowerShell sau khi cài đặt!

### Bước 2: Khởi động toàn bộ hệ thống

```powershell
.\bootstrap.ps1
```

Script này sẽ tự động:
- Tạo certificates cho các organizations
- Tạo genesis block và channel
- Khởi động orderers và peers
- Tạo channel và join peers
- Deploy chaincode

**Thời gian**: ~5-10 phút

### Bước 3: Kiểm tra hệ thống

```powershell
# Kiểm tra containers đang chạy
docker ps

# Chạy smoke tests
.\smokeTest.ps1
```

Bạn sẽ thấy:
- ✅ 3 orderers
- ✅ 4 peers
- ✅ 4 CouchDB instances
- ✅ 1 CLI container
- ✅ Các tests thành công

### Bước 4: Khởi động database

```powershell
cd ..\..\offchain\postgres
docker-compose up -d
```

### Bước 5: Khởi động API Gateway

```powershell
cd ..\..\apps\gateway-nodejs

# Copy file cấu hình
Copy-Item .env.example .env

# Cài đặt dependencies
npm install

# Khởi động server
npm start
```

API sẽ chạy tại: http://localhost:3000

### Bước 6: Test API

```powershell
# Health check
curl http://localhost:3000/health

# Tạo sản phẩm mới
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "id": "PROD001",
    "name": "Sản phẩm test",
    "batch": "BATCH001",
    "origin": "Nhà máy A",
    "manufactureDate": "2025-11-02",
    "metaHash": "hash123"
  }'

# Xem sản phẩm
curl http://localhost:3000/api/products/PROD001

# Xem lịch sử sản phẩm
curl http://localhost:3000/api/products/PROD001/history
```

## Giao diện quản lý

### CouchDB (World State Database)

- **Manufacturer**: http://localhost:5984/_utils
- **Shipper**: http://localhost:6984/_utils
- **Warehouse**: http://localhost:7984/_utils
- **Retailer**: http://localhost:8984/_utils

**Credentials**: admin / adminpw

### PostgreSQL (Off-chain Database)

**pgAdmin**: http://localhost:5050

**Credentials**: admin@admin.com / admin

### Monitoring (Nếu đã cài)

```powershell
cd ci-cd\monitoring
docker-compose up -d
```

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## Luồng nghiệp vụ cơ bản

### 1. Nhà sản xuất tạo sản phẩm

```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "id": "PROD123",
    "name": "Laptop ABC",
    "batch": "BATCH_2025_01",
    "origin": "Factory Hanoi",
    "manufactureDate": "2025-11-02",
    "metaHash": "QmXYZ..."
  }'
```

### 2. Vận chuyển sản phẩm

```powershell
curl -X PUT http://localhost:3000/api/products/PROD123/ship `
  -H "Content-Type: application/json" `
  -d '{
    "shipperId": "SHIP001",
    "waybill": "WB123456",
    "destination": "Warehouse HCM"
  }'
```

### 3. Cập nhật vị trí vận chuyển

```powershell
curl -X PUT http://localhost:3000/api/shipments/WB123456/update `
  -H "Content-Type: application/json" `
  -d '{
    "location": "Bien Hoa Checkpoint",
    "temperature": 25.5
  }'
```

### 4. Nhập kho

```powershell
curl -X PUT http://localhost:3000/api/products/PROD123/warehouse `
  -H "Content-Type: application/json" `
  -d '{
    "warehouseId": "WH_HCM_01"
  }'
```

### 5. Giao hàng cho cửa hàng

```powershell
curl -X PUT http://localhost:3000/api/products/PROD123/retailer `
  -H "Content-Type: application/json" `
  -d '{
    "retailerId": "RETAIL_001"
  }'
```

### 6. Bán hàng

```powershell
curl -X PUT http://localhost:3000/api/products/PROD123/sold `
  -H "Content-Type: application/json" `
  -d '{
    "invoiceRef": "INV_2025_001"
  }'
```

### 7. Truy vết sản phẩm

```powershell
curl http://localhost:3000/api/products/PROD123/history
```

## Dừng hệ thống

### Dừng toàn bộ

```powershell
cd network
docker-compose down

cd ..\offchain\postgres
docker-compose down

cd ..\..\ci-cd\monitoring
docker-compose down
```

### Dừng và xóa dữ liệu

```powershell
cd network\scripts
.\cleanup.ps1
```

## Khắc phục sự cố

### Container không khởi động

```powershell
# Kiểm tra logs
docker logs <container-name>

# Ví dụ
docker logs peer0.manufacturer.example.com

# Khởi động lại
docker restart <container-name>
```

### Port bị chiếm

```powershell
# Kiểm tra port đang sử dụng
netstat -ano | findstr "7050"

# Tìm process và dừng
taskkill /PID <process-id> /F
```

### Chaincode không deploy được

```powershell
# Kiểm tra package ID
docker exec cli peer lifecycle chaincode queryinstalled

# Xem logs chi tiết
docker logs cli

# Thử deploy lại
cd network\scripts
.\deployChaincode.ps1
```

### API không kết nối được Fabric

```powershell
# Kiểm tra connection profile
cat network\connection-manufacturer.json

# Kiểm tra wallet
ls apps\gateway-nodejs\wallet

# Tạo lại identity
cd apps\gateway-nodejs
node scripts\enrollAdmin.js
```

## Tài liệu chi tiết

- **[Design Document](docs/design.md)**: Kiến trúc và thiết kế hệ thống
- **[Deployment Guide](docs/deployment.md)**: Hướng dẫn triển khai chi tiết
- **[Runbook](docs/runbook.md)**: Vận hành và bảo trì

## Support

Nếu gặp vấn đề:

1. Kiểm tra logs trong `apps/gateway-nodejs/logs/`
2. Xem Docker logs: `docker logs <container-name>`
3. Tham khảo [Troubleshooting Guide](docs/deployment.md#troubleshooting)
4. Mở issue trên GitHub repository

## Next Steps

Sau khi hệ thống chạy thành công:

1. ✅ Khám phá API endpoints
2. ✅ Tạo test data
3. ✅ Cài đặt monitoring
4. ✅ Tùy chỉnh chaincode theo nhu cầu
5. ✅ Xây dựng frontend application
6. ✅ Tích hợp với hệ thống hiện tại

## Lưu ý quan trọng

⚠️ **Đây là môi trường Development**
- Sử dụng self-signed certificates
- Không có authentication nghiêm ngặt
- Dữ liệu có thể bị mất khi restart

🔒 **Cho Production**:
- Sử dụng Fabric CA thay vì cryptogen
- Cấu hình TLS certificates hợp lệ
- Implement authentication & authorization
- Backup định kỳ
- High availability setup
- Security hardening

---

**Happy Coding! 🚀**
