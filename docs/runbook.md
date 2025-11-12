# Operations Runbook - Supply Chain Blockchain

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Common Tasks](#common-tasks)
3. [Monitoring](#monitoring)
4. [Incident Response](#incident-response)
5. [Maintenance Windows](#maintenance-windows)
6. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations

### Morning Checks (09:00 AM)

```powershell
# 1. Check all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}"

# 2. Check disk space
docker system df

# 3. Check API health
curl http://localhost:3000/health

# 4. Check recent logs for errors
cd apps\gateway-nodejs\logs
Get-Content error.log -Tail 20

# 5. Verify database connectivity
docker exec supplychain_postgres psql -U postgres -c "SELECT COUNT(*) FROM product_metadata;"
```

Expected Results:
- All 12 containers running
- Disk usage < 80%
- API returns 200 OK
- No critical errors in logs
- Database responds

### End of Day Checks (06:00 PM)

```powershell
# 1. Check transaction volume
docker exec cli peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}'

# 2. Backup database
$date = Get-Date -Format "yyyyMMdd"
docker exec supplychain_postgres pg_dump -U postgres supplychain > backups\daily\db_$date.sql

# 3. Archive logs
Move-Item apps\gateway-nodejs\logs\*.log logs\archive\$date\

# 4. Check system resources
docker stats --no-stream
```

---

## Common Tasks

### 1. Add a New Product

**Via API:**
```powershell
curl -X POST http://localhost:3000/api/products `
  -H "Content-Type: application/json" `
  -d '{
    "id": "PROD001",
    "name": "Product Name",
    "batch": "BATCH001",
    "origin": "Factory A",
    "manufactureDate": "2025-11-02",
    "metaHash": "hash123"
  }'
```

**Via CLI (Direct):**
```powershell
docker exec cli peer chaincode invoke `
  -o orderer.example.com:7050 `
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem `
  -C supplychain-channel `
  -n supplychain_cc `
  --peerAddresses peer0.manufacturer.example.com:7051 `
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt `
  -c '{"function":"CreateProduct","Args":["PROD001","Product Name","BATCH001","Factory A","2025-11-02","hash123"]}'
```

### 2. Query Product History

```powershell
# Via API
curl http://localhost:3000/api/products/PROD001/history

# Via CLI
docker exec cli peer chaincode query `
  -C supplychain-channel `
  -n supplychain_cc `
  -c '{"Args":["GetProductHistory","PROD001"]}'
```

### 3. Update Shipment

```powershell
curl -X PUT http://localhost:3000/api/shipments/WB123/update `
  -H "Content-Type: application/json" `
  -d '{
    "location": "Warehouse A",
    "temperature": 22.5
  }'
```

### 4. Restart a Failed Peer

```powershell
# Check peer status
docker ps -a | findstr peer0.manufacturer

# View peer logs
docker logs peer0.manufacturer.example.com --tail 50

# Restart peer
docker restart peer0.manufacturer.example.com

# Wait 30 seconds
Start-Sleep -Seconds 30

# Verify peer joined channel
docker exec cli peer channel list
```

### 5. Check Channel Info

```powershell
# Get channel info
docker exec cli peer channel getinfo -c supplychain-channel

# List installed chaincode
docker exec cli peer lifecycle chaincode queryinstalled

# List committed chaincode
docker exec cli peer lifecycle chaincode querycommitted -C supplychain-channel
```

### 6. Add New User Identity

```powershell
cd apps\gateway-nodejs

# Create enrollment script
node scripts\enrollUser.js --userId newuser --org OrgManufacturer
```

---

## Monitoring

### Key Metrics to Monitor

#### 1. Network Health

```powershell
# Check orderer status
docker logs orderer.example.com --tail 50 | findstr "error|Error|ERROR"

# Check peer connectivity
docker exec peer0.manufacturer.example.com peer node status
```

#### 2. Performance Metrics

Access Prometheus: http://localhost:9090

Key queries:
```
# Transaction throughput
rate(fabric_peer_transaction_count[5m])

# Block height
fabric_ledger_blockchain_height

# Endorsement failures
rate(fabric_peer_endorser_proposal_validation_failures[5m])
```

#### 3. API Metrics

```powershell
# Check API response times
curl http://localhost:3000/metrics

# View recent API logs
Get-Content apps\gateway-nodejs\logs\combined.log -Tail 50
```

#### 4. Database Metrics

```powershell
# Check database size
docker exec supplychain_postgres psql -U postgres -c "\l+"

# Check table sizes
docker exec supplychain_postgres psql -U postgres -d supplychain -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Active connections
docker exec supplychain_postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Dashboard Access

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **pgAdmin**: http://localhost:5050 (admin@admin.com/admin)
- **CouchDB Fauxton**: 
  - Manufacturer: http://localhost:5984/_utils (admin/adminpw)
  - Shipper: http://localhost:6984/_utils
  - Warehouse: http://localhost:7984/_utils
  - Retailer: http://localhost:8984/_utils

---

## Incident Response

### Severity Levels

- **P1 (Critical)**: Network down, data loss
- **P2 (High)**: Degraded performance, partial outage
- **P3 (Medium)**: Non-critical issues
- **P4 (Low)**: Minor issues, cosmetic

### P1: Network Down

**Symptoms:**
- All peers unreachable
- API returns 500 errors
- No new blocks created

**Response:**

1. **Check infrastructure**
   ```powershell
   docker ps -a
   netstat -ano | findstr "7050 7051"
   ```

2. **Check orderer cluster**
   ```powershell
   docker logs orderer.example.com --tail 100
   docker logs orderer2.example.com --tail 100
   docker logs orderer3.example.com --tail 100
   ```

3. **Restart orderers if needed**
   ```powershell
   docker restart orderer.example.com orderer2.example.com orderer3.example.com
   ```

4. **Verify channel recovery**
   ```powershell
   docker exec cli peer channel getinfo -c supplychain-channel
   ```

5. **Notify stakeholders**
   - Send status update
   - Estimated recovery time

6. **Post-incident**
   - Document root cause
   - Update runbook
   - Schedule post-mortem

### P2: Peer Down

**Symptoms:**
- One or more peers offline
- Endorsement policy failures

**Response:**

1. **Identify failed peer**
   ```powershell
   docker ps -a | findstr "peer"
   ```

2. **Check logs**
   ```powershell
   docker logs peer0.<org>.example.com --tail 200
   ```

3. **Restart peer**
   ```powershell
   docker restart peer0.<org>.example.com
   ```

4. **Verify recovery**
   ```powershell
   docker exec cli peer channel list
   ```

### P3: API Performance Issues

**Symptoms:**
- Slow response times
- Timeout errors

**Response:**

1. **Check API logs**
   ```powershell
   Get-Content apps\gateway-nodejs\logs\combined.log -Tail 100
   ```

2. **Check database connections**
   ```powershell
   docker exec supplychain_postgres psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
   ```

3. **Restart API if needed**
   ```powershell
   cd apps\gateway-nodejs
   npm run stop
   npm start
   ```

4. **Monitor recovery**
   ```powershell
   curl http://localhost:3000/health
   ```

---

## Maintenance Windows

### Weekly Maintenance (Sunday 02:00 AM)

```powershell
# 1. Backup all data
.\scripts\backup-all.ps1

# 2. Clean up Docker resources
docker system prune -f

# 3. Update Docker images (if needed)
cd network
docker-compose pull

# 4. Restart services
docker-compose restart

# 5. Verify health
.\scripts\health-check.ps1
```

### Monthly Maintenance (First Sunday 02:00 AM)

```powershell
# 1. Archive old logs
$month = (Get-Date).AddMonths(-1).ToString("yyyyMM")
Compress-Archive -Path logs\$month -DestinationPath archives\logs_$month.zip
Remove-Item logs\$month -Recurse

# 2. Database maintenance
docker exec supplychain_postgres psql -U postgres -d supplychain -c "VACUUM ANALYZE;"

# 3. Review and rotate certificates (if expiring soon)
# Check certificate expiry
openssl x509 -in network\crypto-config\peerOrganizations\manufacturer.example.com\peers\peer0.manufacturer.example.com\tls\server.crt -noout -dates

# 4. Update dependencies
cd apps\gateway-nodejs
npm update
npm audit fix

# 5. Performance benchmarking
.\scripts\benchmark.ps1
```

---

## Emergency Procedures

### Complete System Failure

1. **Stop all services**
   ```powershell
   cd network
   docker-compose down
   cd ..\offchain\postgres
   docker-compose down
   ```

2. **Restore from backup**
   ```powershell
   # Restore crypto materials
   Expand-Archive backups\crypto_<timestamp>.zip -DestinationPath network\

   # Restore database
   docker-compose up -d
   docker exec supplychain_postgres psql -U postgres supplychain < backups\db_<timestamp>.sql
   ```

3. **Restart network**
   ```powershell
   cd network
   docker-compose up -d
   
   # Wait for services to start
   Start-Sleep -Seconds 30
   
   # Verify
   docker ps
   .\scripts\smokeTest.ps1
   ```

### Data Corruption

1. **Identify corrupted peer**
2. **Stop peer**
   ```powershell
   docker stop peer0.<org>.example.com
   ```

3. **Restore from snapshot or sync from another peer**
   ```powershell
   # Remove corrupted data
   docker volume rm peer0.<org>.example.com
   
   # Restart peer (will sync from other peers)
   docker start peer0.<org>.example.com
   ```

4. **Monitor sync progress**
   ```powershell
   docker logs -f peer0.<org>.example.com
   ```

### Security Breach

1. **Isolate affected components**
2. **Revoke compromised certificates**
3. **Review audit logs**
4. **Rotate all credentials**
5. **Incident report**

---

## Contact Information

### Escalation Path

- **Level 1**: Operations Team
- **Level 2**: DevOps Lead
- **Level 3**: Architecture Team
- **Level 4**: CTO/Security Team

### On-Call Schedule

[Insert on-call rotation schedule]

### Emergency Contacts

- Operations: [phone/email]
- DevOps Lead: [phone/email]
- Security: [phone/email]

---

## Appendix

### Useful Commands

```powershell
# View all channel info
docker exec cli peer channel list

# Query block by number
docker exec cli peer channel getblock -c supplychain-channel 0

# Check peer version
docker exec cli peer version

# Export logs
docker logs peer0.manufacturer.example.com > peer_logs.txt 2>&1

# Check network connectivity
docker exec cli ping peer0.shipper.example.com
```

### Log Locations

- **Peer logs**: `docker logs <peer-container>`
- **Orderer logs**: `docker logs <orderer-container>`
- **API logs**: `apps/gateway-nodejs/logs/`
- **Database logs**: `docker logs supplychain_postgres`

### Configuration Files

- **Network**: `network/configtx.yaml`
- **Docker**: `network/docker-compose.yaml`
- **API**: `apps/gateway-nodejs/.env`
- **Database**: `offchain/postgres/schema.sql`
