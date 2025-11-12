# Supply Chain Blockchain Core (Hyperledger Fabric)

## Tổng quan

Hệ thống Blockchain Core sử dụng Hyperledger Fabric để quản lý chuỗi cung ứng với 4 tổ chức chính:
- **OrgManufacturer** (Nhà sản xuất)
- **OrgShipper** (Vận chuyển)
- **OrgWarehouse** (Kho)
- **OrgRetailer** (Cửa hàng)

## Cấu trúc dự án

```
blockchainCore/
├── network/              # Fabric network configuration
│   ├── crypto-config/    # Certificates và keys
│   ├── channel-artifacts/# Channel configuration
│   ├── scripts/          # Automation scripts
│   ├── docker-compose.yaml
│   ├── crypto-config.yaml
│   └── configtx.yaml
├── chaincode/            # Smart contracts
│   ├── go/               # Go chaincode
│   └── lifecycle/        # Packaging scripts
├── apps/                 # Application layer
│   ├── gateway-nodejs/   # REST API Gateway
│   └── scripts/          # Test clients
├── offchain/             # Off-chain storage
│   ├── postgres/         # Database schema
│   └── ipfs/             # File storage (optional)
├── docs/                 # Documentation
│   ├── design.md
│   ├── deployment.md
│   └── runbook.md
└── ci-cd/                # CI/CD pipelines
```

## Yêu cầu hệ thống

- Docker & Docker Compose
- Node.js 16+ & npm
- Go 1.19+
- Git
- cURL

## Quick Start

### ⚡ One-Command Setup

```powershell
.\setup.ps1
```

This script will automatically:
1. ✅ Check prerequisites (Docker, Node.js)
2. ✅ Install Fabric binaries
3. ✅ Bootstrap network (crypto, genesis, channel, chaincode)
4. ✅ Start PostgreSQL database
5. ✅ Install API dependencies
6. ✅ Setup identities
7. ✅ Run smoke tests

### Manual Setup (Step by Step)

If you prefer manual setup:

#### 1. Install Fabric binaries
```powershell
.\network\scripts\install-fabric.ps1
```

#### 2. Bootstrap network
```powershell
cd network\scripts
.\bootstrap.ps1
```

#### 3. Start database
```powershell
cd ..\..\offchain\postgres
docker-compose up -d
```

#### 4. Setup API
```powershell
cd ..\..\apps\gateway-nodejs
Copy-Item .env.example .env
npm install
npm run setup-identities
npm start
```

## API Endpoints

- `POST /api/products` - Tạo sản phẩm mới (Manufacturer)
- `GET /api/products/:id` - Lấy thông tin sản phẩm
- `GET /api/products/:id/history` - Truy vết lịch sử sản phẩm
- `PUT /api/products/:id/ship` - Cập nhật trạng thái vận chuyển
- `PUT /api/products/:id/warehouse` - Nhập kho
- `PUT /api/products/:id/retailer` - Xuất kho đến cửa hàng
- `PUT /api/products/:id/sold` - Đánh dấu đã bán

## Testing

```powershell
# Integration tests
npm run test:integration

# Smoke tests
.\network\scripts\smokeTest.ps1
```

## Monitoring

Access monitoring dashboards:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

## Documentation

Xem thêm tài liệu chi tiết trong thư mục `docs/`:
- [Design Document](docs/design.md)
- [Deployment Guide](docs/deployment.md)
- [Runbook](docs/runbook.md)

## License

MIT
