# Quick Testing Guide

## 🚀 Quick Commands

### Run All API Tests
```bash
npm run test:api
```

### Interactive API Testing
```bash
npm run test:api:interactive
```

### Test IoT Device Simulation
```bash
npm run test:iot
```

### Test Shipment Workflow
```bash
npm run test:shipment
```

### Test WebSocket Connection
```bash
npm run test:socket
```

### Quick Performance Test
```bash
npm run test:performance
```

### Full Performance Suite
```bash
npm run test:performance:full
```

### Run All Tests
```bash
npm run test:all
```

---

## 📋 Manual Testing

### 1. Test Single Endpoint
```bash
# Via curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Via test script
node scripts/test-api.js --interactive
# Select option for specific test
```

### 2. Simulate IoT Device
```bash
# Single message via HTTP
node scripts/test-iot-device.js single http

# Continuous messages via MQTT (3 seconds interval, 30 seconds duration)
node scripts/test-iot-device.js continuous mqtt 3000 30000

# Stress test with 50 messages via both HTTP and MQTT
node scripts/test-iot-device.js stress both 50
```

### 3. Test Shipment Lifecycle
```bash
# Full workflow (create → transit → deliver)
node scripts/test-shipment-workflow.js full

# Quick test (create + retrieve)
node scripts/test-shipment-workflow.js quick

# Update existing shipment
node scripts/test-shipment-workflow.js update
```

### 4. Performance Testing
```bash
# Test specific endpoint latency
node scripts/test-performance.js latency /analytics/dashboard 100

# Test concurrent requests
node scripts/test-performance.js concurrent /device 50

# Test rate limiting
node scripts/test-performance.js ratelimit

# Test data ingestion load
node scripts/test-performance.js ingestion
```

---

## 🎯 Testing Scenarios

### Scenario 1: New Feature Validation
```bash
# 1. Test basic API functionality
npm run test:api

# 2. Test specific new endpoints
node scripts/test-api.js --interactive
# Select shipment management or analytics tests

# 3. Verify performance
npm run test:performance
```

### Scenario 2: Realtime System Check
```bash
# Terminal 1: Start WebSocket listener
npm run test:socket

# Terminal 2: Send sensor data
npm run test:iot

# You should see realtime updates in Terminal 1
```

### Scenario 3: Load Testing
```bash
# 1. Quick baseline
npm run test:performance

# 2. Full performance suite
npm run test:performance:full

# 3. Custom load test
node scripts/test-performance.js concurrent /analytics/dashboard 100
```

### Scenario 4: End-to-End Workflow
```bash
# Complete shipment lifecycle with tracking
npm run test:shipment
```

---

## 🔍 Test Results Interpretation

### Success Indicators ✅
- All tests show green checkmarks (✅)
- Success rate > 95%
- Average latency < 100ms for most endpoints
- No 5xx errors
- Rate limiting working (some 429 errors expected in load tests)

### Warning Signs ⚠️
- Success rate 90-95%
- Average latency 100-500ms
- Occasional timeout errors
- High p99 latency (> 1000ms)

### Critical Issues ❌
- Success rate < 90%
- Many 5xx errors
- Connection refused errors
- Authentication failures
- Rate limiting not working

---

## 🐛 Common Issues

### Issue: Connection Refused
```bash
# Check if server is running
curl http://localhost:3000/health

# Start server if needed
docker-compose up -d
# OR
npm start
```

### Issue: Authentication Failed
```bash
# Verify credentials in test scripts
# Default: email=admin@example.com, password=admin123

# Check if JWT_SECRET is set
cat .env | grep JWT_SECRET
```

### Issue: MQTT Connection Failed
```bash
# Check Mosquitto status
docker-compose ps mosquitto

# Test MQTT connectivity
mosquitto_sub -h localhost -p 1883 -t "#"
```

### Issue: WebSocket Connection Failed
```bash
# Ensure Socket.IO server is initialized
# Check backend logs
docker-compose logs backend | grep -i socket

# Verify port 3000 is accessible
netstat -an | grep 3000
```

---

## 📊 Expected Performance

| Test Type | Requests | Duration | Expected Result |
|-----------|----------|----------|-----------------|
| API Tests | ~100 | 2-3 min | All pass |
| IoT Simulation | 60 | 5 min | All sent |
| Shipment Workflow | ~20 | 30 sec | Complete lifecycle |
| WebSocket | Continuous | Manual stop | Real-time updates |
| Quick Performance | ~200 | 1-2 min | > 95% success |
| Full Performance | ~1000 | 5-10 min | > 95% success |

---

## 🎓 Learning Path

### Beginner
1. Run `npm run test:api` to understand API structure
2. Try `npm run test:api:interactive` to test specific endpoints
3. Run `npm run test:socket` to see realtime updates

### Intermediate
1. Simulate device: `npm run test:iot`
2. Test workflow: `npm run test:shipment`
3. Check performance: `npm run test:performance`

### Advanced
1. Custom load tests with specific parameters
2. Combine multiple scripts for complex scenarios
3. Integrate tests into CI/CD pipeline

---

## 📝 Test Checklist Before Deployment

- [ ] `npm run test:api` - All API tests pass
- [ ] `npm run test:performance` - Performance acceptable
- [ ] `npm run test:shipment` - Workflow completes successfully
- [ ] `npm run test:socket` - WebSocket connects and receives events
- [ ] Manual smoke test on critical endpoints
- [ ] Check logs for errors: `docker-compose logs backend`
- [ ] Verify database migrations: `npx prisma migrate status`
- [ ] Test with production-like data volume

---

## 📚 More Information

- Full documentation: [scripts/README.md](./README.md)
- API Reference: [docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
- Realtime Guide: [docs/REALTIME_GUIDE.md](../docs/REALTIME_GUIDE.md)
- Deployment: [docs/DEPLOYMENT_CHECKLIST.md](../docs/DEPLOYMENT_CHECKLIST.md)

---

**Quick Help:**
```bash
# Show script help
node scripts/test-api.js --help
node scripts/test-iot-device.js --help
node scripts/test-shipment-workflow.js --help
node scripts/test-performance.js --help
```
