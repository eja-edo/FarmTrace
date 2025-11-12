# Deployment Guide - Supply Chain Blockchain

## Prerequisites

### Software Requirements

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 16.x or higher
- **Go**: Version 1.19 or higher (for chaincode development)
- **PostgreSQL Client**: For database management
- **Git**: For version control

### Hardware Requirements

**Development Environment:**
- CPU: 4 cores minimum
- RAM: 8GB minimum (16GB recommended)
- Disk: 50GB free space
- Network: Stable internet connection

**Production Environment:**
- CPU: 8+ cores
- RAM: 32GB+
- Disk: 500GB+ SSD
- Network: High-speed, low-latency connection

## Installation Steps

### 1. Clone Repository

```powershell
git clone <repository-url>
cd blockchainCore
```

### 2. Install Hyperledger Fabric Binaries

```powershell
cd network\scripts
.\install-fabric.ps1
```

This script will:
- Download Fabric binaries (peer, orderer, configtxgen, cryptogen)
- Pull required Docker images
- Add binaries to PATH

**Important**: Restart your PowerShell session after installation for PATH changes to take effect.

### 3. Configure Environment Variables

```powershell
# Copy example environment file
cd ..\..\apps\gateway-nodejs
Copy-Item .env.example .env

# Edit .env file with your settings
notepad .env
```

### 4. Start PostgreSQL Database

```powershell
cd ..\..\offchain\postgres
docker-compose up -d
```

Verify database is running:
```powershell
docker ps | findstr postgres
```

Access pgAdmin at http://localhost:5050 (admin@admin.com / admin)

### 5. Bootstrap Fabric Network

```powershell
cd ..\..\network\scripts
.\bootstrap.ps1
```

This comprehensive script will:
1. Clean up any existing network
2. Generate crypto materials
3. Create genesis block and channel artifacts
4. Start Docker containers (orderers, peers, CouchDB)
5. Create channel and join all peers
6. Deploy chaincode

**Note**: This process takes 5-10 minutes on first run.

### 6. Verify Network Status

```powershell
# Check running containers
docker ps

# You should see:
# - 3 orderers
# - 4 peers
# - 4 CouchDB instances
# - 1 CLI container
```

### 7. Run Smoke Tests

```powershell
.\smokeTest.ps1
```

Expected output:
- ✓ Query initial product
- ✓ Create new product
- ✓ Ship product
- ✓ Get product history

### 8. Setup Gateway API

```powershell
cd ..\..\apps\gateway-nodejs

# Install dependencies
npm install

# Create connection profile
# (This should be generated during network bootstrap)

# Enroll admin and register users
node src/utils/enrollAdmin.js
node src/utils/registerUser.js

# Start API server
npm start
```

API should be running at http://localhost:3000

### 9. Test API Endpoints

```powershell
# Health check
curl http://localhost:3000/health

# Get all products
curl http://localhost:3000/api/products

# Create a product (requires authentication)
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "id": "PROD123",
    "name": "Test Product",
    "batch": "BATCH001",
    "origin": "Factory A",
    "manufactureDate": "2025-11-02",
    "metaHash": "hash123"
  }'
```

## Network Configuration

### Connection Profiles

Connection profiles for each organization are located in:
```
network/connection-<org>.json
```

Example structure:
```json
{
  "name": "supply-chain-network",
  "version": "1.0.0",
  "client": {
    "organization": "OrgManufacturer",
    "connection": {
      "timeout": {
        "peer": { "endorser": "300" },
        "orderer": "300"
      }
    }
  },
  "organizations": {
    "OrgManufacturer": {
      "mspid": "OrgManufacturerMSP",
      "peers": ["peer0.manufacturer.example.com"]
    }
  },
  "peers": {
    "peer0.manufacturer.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "path": "crypto-config/peerOrganizations/..."
      }
    }
  }
}
```

### Chaincode Deployment

To deploy or upgrade chaincode:

```powershell
cd network\scripts

# Package new version
# Edit version in deployChaincode.ps1

# Deploy
.\deployChaincode.ps1
```

## Monitoring Setup

### Prometheus & Grafana

```powershell
cd monitoring
docker-compose up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### View Logs

```powershell
# View peer logs
docker logs peer0.manufacturer.example.com

# View orderer logs
docker logs orderer.example.com

# View API logs
cd apps\gateway-nodejs\logs
Get-Content combined.log -Tail 50 -Wait
```

## Backup Procedures

### 1. Backup Crypto Materials

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path network\crypto-config -DestinationPath backups\crypto_$timestamp.zip
```

### 2. Backup Ledger Data

```powershell
# Stop peer
docker stop peer0.manufacturer.example.com

# Backup ledger
docker run --rm -v peer0.manufacturer.example.com:/data -v ${PWD}/backups:/backup alpine tar czf /backup/ledger_$timestamp.tar.gz /data

# Start peer
docker start peer0.manufacturer.example.com
```

### 3. Backup Database

```powershell
docker exec supplychain_postgres pg_dump -U postgres supplychain > backups\db_$timestamp.sql
```

## Troubleshooting

### Network Won't Start

```powershell
# Check Docker
docker --version
docker-compose --version

# Check if ports are available
netstat -ano | findstr "7050 7051 5984"

# Clean and restart
.\cleanup.ps1
.\bootstrap.ps1
```

### Chaincode Deployment Fails

```powershell
# Check chaincode logs
docker logs cli

# Verify package ID
docker exec cli peer lifecycle chaincode queryinstalled

# Check commit readiness
docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID supplychain-channel --name supplychain_cc --version 1.0 --sequence 1
```

### API Connection Issues

```powershell
# Verify network is running
docker ps

# Check connection profile
cat network\connection-manufacturer.json

# Test peer connectivity
docker exec cli peer channel list
```

### Database Connection Fails

```powershell
# Verify PostgreSQL is running
docker ps | findstr postgres

# Test connection
docker exec supplychain_postgres psql -U postgres -c "\l"

# Check credentials in .env file
```

## Upgrading

### Upgrade Chaincode

1. Update chaincode version in code
2. Increment sequence number in deployment script
3. Run deployment script:

```powershell
cd network\scripts
.\deployChaincode.ps1
```

### Upgrade Fabric Version

1. Update image versions in docker-compose.yaml
2. Pull new images:

```powershell
docker-compose pull
```

3. Restart network:

```powershell
.\cleanup.ps1
.\bootstrap.ps1
```

## Production Considerations

### 1. Use Fabric CA

Replace cryptogen with Fabric CA for production:
- Better key management
- Certificate renewal
- Revocation support

### 2. Separate Orderer Organization

- Dedicated orderer organization
- Independent from peer organizations

### 3. TLS Certificates

- Use valid TLS certificates (not self-signed)
- Certificate rotation policy
- Secure key storage (HSM/Vault)

### 4. High Availability

- Multiple peers per organization (minimum 2)
- Multiple orderers (minimum 3 for Raft)
- Load balancing for API gateway

### 5. Security Hardening

- Network segmentation
- Firewall rules
- Rate limiting
- DDoS protection
- Regular security audits

### 6. Performance Tuning

Adjust in configtx.yaml:
```yaml
BatchTimeout: 2s        # Lower for faster blocks
MaxMessageCount: 10     # Increase for higher throughput
AbsoluteMaxBytes: 99 MB # Adjust based on transaction size
```

### 7. Monitoring & Alerting

- Set up alerts for:
  - Peer/orderer down
  - High error rates
  - Block creation delays
  - API latency spikes

## Next Steps

1. Configure monitoring dashboards
2. Set up CI/CD pipeline
3. Implement backup automation
4. Configure production TLS certificates
5. Set up log aggregation
6. Perform load testing
7. Create runbook for operations team

## Support

For issues or questions:
- Check documentation in `docs/`
- Review logs in `apps/gateway-nodejs/logs/`
- Contact: [support email]
