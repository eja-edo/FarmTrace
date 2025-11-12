# 🚀 Hướng Dẫn Cài Đặt - Blockchain Supply Chain (Docker-Only)

## ✅ Điều Kiện Tiên Quyết

### Phần Mềm Cần Thiết
- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine** (Linux)
  - Tối thiểu 4GB RAM allocated cho Docker
  - 20GB disk space trống
- **Node.js** 16.x hoặc mới hơn
- **PowerShell** 5.1+ (Windows) hoặc **pwsh** (cross-platform)
- **Git** (optional, để clone repo)

### Kiểm Tra
```powershell
# Kiểm tra Docker
docker --version
docker ps

# Kiểm tra Node.js
node --version
npm --version

# Kiểm tra PowerShell
$PSVersionTable.PSVersion
```

## 🎯 Cài Đặt Một Lệnh (Recommended)

```powershell
# Chạy từ thư mục gốc của project
.\setup.ps1
```

Script này sẽ tự động:
1. ✅ Kiểm tra Docker và Node.js
2. ✅ Tạo crypto materials (cryptogen trong Docker)
3. ✅ Tạo genesis block và channel artifacts (configtxgen trong Docker)
4. ✅ Khởi động Fabric network (3 orderers, 4 peers, 4 CouchDB)
5. ✅ Tạo channel và join các peers (peer CLI trong Docker)
6. ✅ Deploy chaincode (lifecycle chaincode trong Docker)
7. ✅ Khởi động PostgreSQL database
8. ✅ Cài đặt Node.js API dependencies
9. ✅ Chạy smoke tests

**Thời gian**: ~10-15 phút (lần đầu tiên cần tải Docker images)

## 📋 Cài Đặt Từng Bước (Manual)

### Bước 1: Khởi động Fabric Network

```powershell
cd network\scripts
.\bootstrap-docker.ps1
```

Chờ cho đến khi thấy message:
```
Network bootstrap completed successfully!
```

### Bước 2: Khởi động PostgreSQL

```powershell
cd ..\..\offchain\postgres
docker-compose up -d
```

### Bước 3: Cài đặt API Gateway

```powershell
cd ..\..\apps\gateway-nodejs

# Tạo .env file
Copy-Item .env.example .env

# Install dependencies
npm install

# Enroll admin (optional - có thể skip nếu không dùng Fabric CA)
npm run enroll-admin

# Register user (optional)
npm run register-user

# Start API server
npm start
```

### Bước 4: Verify

```powershell
# Kiểm tra containers
docker ps

# Test API
curl http://localhost:3000/health
```

## 🔍 Kiểm Tra Hệ Thống

### Smoke Tests

```powershell
cd network\scripts
.\smokeTest-docker.ps1
```

### Manual Tests

```powershell
# Vào fabric-tools container
docker exec -it fabric-tools bash

# List channels
peer channel list

# Query chaincode
peer chaincode query -C supplychain-channel -n supplychain_cc \
  -c '{"function":"GetAllProducts","Args":[]}'
```

## 🌐 Access Points

Sau khi setup thành công, các services sẽ available tại:

| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:3000 | N/A |
| API Health | http://localhost:3000/health | N/A |
| CouchDB (Manufacturer) | http://localhost:5984/_utils | admin / adminpw |
| CouchDB (Shipper) | http://localhost:6984/_utils | admin / adminpw |
| CouchDB (Warehouse) | http://localhost:7984/_utils | admin / adminpw |
| CouchDB (Retailer) | http://localhost:8984/_utils | admin / adminpw |
| PostgreSQL | localhost:5432 | postgres / postgres |
| pgAdmin | http://localhost:5050 | admin@admin.com / admin |

## 🐛 Troubleshooting

### Lỗi: "Docker is not running"
```powershell
# Khởi động Docker Desktop và đợi ~30 giây
# Hoặc trên Linux:
sudo systemctl start docker
```

### Lỗi: "Port already in use"
```powershell
# Cleanup network cũ
cd network\scripts
.\cleanup.ps1

# Hoặc stop tất cả containers
docker stop $(docker ps -aq)
```

### Lỗi: "Chaincode deployment failed"
```powershell
# Check logs
docker logs peer0.manufacturer.example.com
docker logs orderer.example.com

# Restart network
cd network\scripts
.\cleanup.ps1
.\bootstrap-docker.ps1
```

### Lỗi: "Cannot find fabric-tools container"
```powershell
# Start fabric-tools container
cd network
docker-compose -f docker-compose-tools.yaml up -d

# Verify
docker ps | grep fabric-tools
```

### Images tải chậm
```powershell
# Pre-download images
docker pull hyperledger/fabric-tools:2.5
docker pull hyperledger/fabric-peer:2.5
docker pull hyperledger/fabric-orderer:2.5
docker pull couchdb:3.3
```

## 🔄 Reset Hệ Thống

### Cleanup Complete
```powershell
cd network\scripts
.\cleanup.ps1

# Xóa volumes (optional - mất hết data!)
docker volume prune -f
```

### Rebuild From Scratch
```powershell
# Cleanup
.\network\scripts\cleanup.ps1

# Remove all Docker volumes
docker volume rm $(docker volume ls -q | grep "blockchaincore")

# Run setup again
.\setup.ps1
```

## 📊 Monitoring (Optional)

### Start Monitoring Stack
```powershell
cd ci-cd\monitoring
docker-compose up -d
```

### Access
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 🧪 API Testing

### Create Product
```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "productId": "PROD001",
    "name": "Sample Product",
    "category": "Electronics",
    "manufacturer": "Test Corp",
    "manufactureDate": "2024-01-01"
  }'
```

### Get Product
```powershell
curl http://localhost:3000/api/products/PROD001
```

### Product History (Traceability)
```powershell
curl http://localhost:3000/api/products/PROD001/history
```

Xem thêm examples trong `docs/API_EXAMPLES.md`

## 📚 Documentation

- **Quick Start**: `QUICKSTART.md`
- **Architecture**: `docs/design.md`
- **Deployment Guide**: `docs/deployment.md`
- **Operations Manual**: `docs/runbook.md`
- **API Examples**: `docs/API_EXAMPLES.md`
- **File List**: `FILES_CREATED.md`

## 🎓 Cấu Trúc Project

```
blockchainCore/
├── network/              # Fabric network config
│   ├── docker-compose.yaml           # Main network
│   ├── docker-compose-tools.yaml     # Fabric CLI tools
│   ├── crypto-config.yaml            # Crypto generation config
│   ├── configtx.yaml                 # Channel config
│   └── scripts/
│       ├── bootstrap-docker.ps1      # Main setup script (Docker-only)
│       ├── generateCrypto-docker.ps1 # Crypto generation
│       ├── createChannel-docker.ps1  # Channel creation
│       └── deployChaincode-docker.ps1# Chaincode deployment
├── chaincode/go/         # Smart contracts
├── apps/gateway-nodejs/  # REST API
├── offchain/postgres/    # Off-chain database
└── docs/                 # Documentation
```

## ⚡ Quick Commands

```powershell
# Start everything
.\setup.ps1

# Stop network
cd network
docker-compose down

# View logs
docker logs -f peer0.manufacturer.example.com
docker logs -f orderer.example.com

# Execute commands in fabric-tools
docker exec -it fabric-tools bash

# Restart API
cd apps\gateway-nodejs
npm start

# Run tests
cd network\scripts
.\smokeTest-docker.ps1
```

## 🆘 Getting Help

1. Check logs: `docker logs <container_name>`
2. Read documentation in `docs/`
3. Check `docs/runbook.md` for operational procedures
4. Review `CHECKLIST.md` for setup verification

## ✨ Features

- ✅ **100% Docker-based**: Không cần cài Fabric binaries local
- ✅ **Automated setup**: Một lệnh để khởi động toàn bộ
- ✅ **Production-ready**: Raft consensus, TLS enabled
- ✅ **4 Organizations**: Manufacturer, Shipper, Warehouse, Retailer
- ✅ **Complete API**: REST endpoints cho toàn bộ supply chain workflow
- ✅ **Traceability**: Product history tracking
- ✅ **Monitoring ready**: Prometheus + Grafana
- ✅ **CI/CD ready**: GitHub Actions workflow

## 🚀 Next Steps

1. ✅ Chạy `.\setup.ps1` để cài đặt
2. ✅ Test API với examples trong `docs/API_EXAMPLES.md`
3. ✅ Customize chaincode theo business logic của bạn
4. ✅ Build frontend application
5. ✅ Setup monitoring
6. ✅ Review security trong `docs/design.md`

---

**Happy Building! 🎉**

Có câu hỏi? Đọc thêm trong `docs/` hoặc check `QUICKSTART.md`
