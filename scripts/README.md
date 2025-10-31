# Testing Scripts Documentation

This folder contains comprehensive testing scripts for the IoT Logistics backend system.

## 📋 Available Scripts

### 1. **test-api.js** - Complete API Testing Suite
Comprehensive test coverage for all API endpoints including authentication, devices, vehicles, orders, shipments, and analytics.

**Usage:**
```bash
# Run all tests
node scripts/test-api.js --all

# Interactive mode
node scripts/test-api.js --interactive
node scripts/test-api.js -i
```

**Features:**
- ✅ Health check verification
- ✅ Authentication testing
- ✅ Device management (CRUD operations)
- ✅ Vehicle tracking with pagination
- ✅ Order management and tracking
- ✅ Shipment management (NEW)
- ✅ Analytics endpoints (NEW)
- ✅ IoT data ingestion
- ✅ Realtime endpoints
- ✅ Rate limiting verification
- ✅ Error handling validation

**Output:**
- Color-coded test results (✅ success, ❌ error, ⚠️ warning)
- JSON response examples
- Pagination details
- HTTP status codes

---

### 2. **test-iot-device.js** - IoT Device Simulator
Simulates ESP32 devices sending sensor data to the backend via MQTT and/or HTTP.

**Usage:**
```bash
# Send single test message via HTTP
node scripts/test-iot-device.js single http

# Send single message via MQTT
node scripts/test-iot-device.js single mqtt

# Send continuously for 1 minute via HTTP (every 5 seconds)
node scripts/test-iot-device.js continuous http 5000 60000

# Send continuously via MQTT (every 3 seconds for 30 seconds)
node scripts/test-iot-device.js continuous mqtt 3000 30000

# Stress test: 100 messages via both HTTP and MQTT
node scripts/test-iot-device.js stress both 100

# Show help
node scripts/test-iot-device.js --help
```

**Features:**
- 🌡️ Simulates realistic sensor data (temperature, humidity, vibration)
- 📍 Generates GPS coordinates around Ho Chi Minh City
- ⚠️ 10% chance of alert-triggering values
- 📊 Real-time data display with color coding
- 🔄 Support for HTTP, MQTT, or both simultaneously

**Environment Variables:**
```bash
MQTT_BROKER_URL=mqtt://localhost:1883
API_URL=http://localhost:3000
DEVICE_ID=ESP32-TEST-001
```

**Sensor Simulation:**
- Temperature: 15-35°C (alert threshold: 30°C)
- Humidity: 30-90% (alert threshold: 80%)
- Vibration: 0-2g (alert threshold: 1.5g)
- GPS: Random coordinates near HCMC
- Speed: 0-80 km/h

---

### 3. **test-shipment-workflow.js** - Shipment Lifecycle Testing
Tests complete shipment workflow from creation to delivery with tracking data.

**Usage:**
```bash
# Full workflow test (recommended)
node scripts/test-shipment-workflow.js full

# Quick test (create + retrieve only)
node scripts/test-shipment-workflow.js quick

# Test status updates on existing shipment
node scripts/test-shipment-workflow.js update

# Show help
node scripts/test-shipment-workflow.js --help
```

**Workflow Steps:**
1. 🔐 **Authentication** - Login and get JWT token
2. 📦 **Create Shipment** - Create new shipment with devices, vehicle, orders
3. 🚚 **Start Transit** - Update status to IN_TRANSIT with departure time
4. 📡 **Data Transmission** - Simulate 3 sensor data transmissions
5. 📊 **Track Shipment** - Retrieve shipment with sensor/GPS/alert data
6. ✅ **Mark Delivered** - Update status to DELIVERED with arrival time
7. 📈 **Check Analytics** - Verify dashboard statistics
8. 📋 **List Shipments** - Filter shipments by status

**Output:**
- Step-by-step workflow progress
- JSON response samples
- Tracking data summary (sensors, locations, alerts)
- Analytics overview

---

### 4. **test-socket-client.js** - WebSocket Connection Testing
Tests real-time WebSocket connectivity for device and shipment monitoring.

**Usage:**
```bash
# Test WebSocket connection
node scripts/test-socket-client.js
```

**Features:**
- 🔌 Socket.IO connection with JWT authentication
- 📡 Subscribe to device updates (sensor readings, GPS, alerts)
- 📦 Subscribe to shipment updates (all devices in shipment)
- 📊 Real-time event logging
- 🔄 Automatic reconnection handling

**Events Monitored:**
- `sensor:reading` - Temperature, humidity, vibration data
- `device:location` - GPS coordinates and speed
- `alert:new` - Threshold alerts (temperature, humidity, vibration)

---

### 5. **test-performance.js** - Performance & Load Testing
Comprehensive performance testing including latency, throughput, and concurrency.

**Usage:**
```bash
# Full performance test suite
node scripts/test-performance.js full

# Quick performance test
node scripts/test-performance.js quick

# Test latency for specific endpoint (100 iterations)
node scripts/test-performance.js latency /analytics/dashboard 100

# Test concurrent requests (50 simultaneous)
node scripts/test-performance.js concurrent /device 50

# Test rate limiting
node scripts/test-performance.js ratelimit

# Test IoT data ingestion load
node scripts/test-performance.js ingestion

# Show help
node scripts/test-performance.js --help
```

**Test Suites:**
1. **Latency Test** - Measures response times (min, max, avg, median, p95, p99)
2. **Concurrent Requests** - Tests simultaneous request handling
3. **Rate Limiting** - Verifies rate limit enforcement
4. **Database Performance** - Tests pagination with different page sizes
5. **Analytics Performance** - Measures analytics query speed
6. **Data Ingestion Load** - Simulates multiple devices sending data

**Metrics:**
- ⏱️ Latency statistics (ms)
- 📈 Throughput (requests/second)
- ✅ Success rate (%)
- 📊 HTTP status code distribution
- ❌ Error summary by type

**Sample Output:**
```
📊 Request Summary:
  Total Requests:      100
  Successful:          98 (98.00%)
  Failed:              2
  Errors:              0

⏱️  Latency (ms):
  Min:                 15.32
  Max:                 156.78
  Average:             45.67
  Median:              42.15
  95th Percentile:     89.34
  99th Percentile:     125.56
```

---

### 6. **publish-test.js** - MQTT Publishing Test
Simple MQTT message publishing for testing broker connectivity.

**Usage:**
```bash
node scripts/publish-test.js
```

---

## 🚀 Quick Start Guide

### Prerequisites
```bash
# Install dependencies (from backend root)
npm install

# Ensure backend server is running
docker-compose up -d
# OR
npm start
```

### Recommended Testing Sequence

1. **Verify System Health**
   ```bash
   node scripts/test-api.js --all
   ```

2. **Test IoT Data Flow**
   ```bash
   # Terminal 1: Start WebSocket listener
   node scripts/test-socket-client.js
   
   # Terminal 2: Send sensor data
   node scripts/test-iot-device.js continuous http 3000 30000
   ```

3. **Test Shipment Workflow**
   ```bash
   node scripts/test-shipment-workflow.js full
   ```

4. **Performance Baseline**
   ```bash
   node scripts/test-performance.js quick
   ```

---

## 📊 Test Coverage

| Module | Coverage | Scripts |
|--------|----------|---------|
| Authentication | ✅ Complete | test-api.js |
| Device Management | ✅ Complete | test-api.js |
| Vehicle Tracking | ✅ Complete | test-api.js |
| Order Management | ✅ Complete | test-api.js |
| Shipment Management | ✅ Complete | test-api.js, test-shipment-workflow.js |
| Analytics | ✅ Complete | test-api.js, test-performance.js |
| IoT Ingestion | ✅ Complete | test-iot-device.js, test-performance.js |
| WebSocket Realtime | ✅ Complete | test-socket-client.js |
| Rate Limiting | ✅ Complete | test-api.js, test-performance.js |
| Error Handling | ✅ Complete | test-api.js |
| Performance | ✅ Complete | test-performance.js |

---

## 🐛 Troubleshooting

### Connection Errors

**Problem:** `ECONNREFUSED` errors

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check Docker containers
docker-compose ps

# View backend logs
docker-compose logs backend
```

### Authentication Failures

**Problem:** `401 Unauthorized` errors

**Solution:**
- Verify credentials in test scripts (default: admin@example.com/admin123)
- Check if JWT_SECRET is set in backend `.env`
- Ensure token is not expired

### MQTT Connection Issues

**Problem:** Cannot connect to MQTT broker

**Solution:**
```bash
# Check if Mosquitto is running
docker-compose ps mosquitto

# Test MQTT connection
mosquitto_sub -h localhost -p 1883 -t "test/topic"

# Check broker logs
docker-compose logs mosquitto
```

### Rate Limiting Triggered

**Problem:** `429 Too Many Requests` errors

**Solution:**
- Wait 15 minutes for rate limit to reset
- Adjust rate limits in `src/middleware/rateLimiter.js`
- Use different test parameters (fewer requests)

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in backend root:
```env
# API Configuration
API_URL=http://localhost:3000

# MQTT Configuration
MQTT_BROKER_URL=mqtt://localhost:1883

# Test Device Configuration
DEVICE_ID=ESP32-TEST-001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/iot_logistics

# Authentication
JWT_SECRET=your-secret-key
```

### Script Parameters

Most scripts accept environment variables or command-line arguments:

```bash
# Using environment variables
API_URL=http://192.168.1.100:3000 node scripts/test-api.js --all

# Using command-line arguments
node scripts/test-iot-device.js continuous http 2000 60000
```

---

## 📈 Performance Benchmarks

Expected performance on typical hardware (4 CPU, 8GB RAM):

| Metric | Target | Acceptable |
|--------|--------|------------|
| Health endpoint latency | < 20ms | < 50ms |
| Device list (50 items) | < 100ms | < 200ms |
| Analytics dashboard | < 500ms | < 1000ms |
| IoT data ingestion | < 50ms | < 100ms |
| WebSocket connection | < 100ms | < 200ms |
| Success rate | > 99% | > 95% |
| Concurrent requests (50) | All succeed | > 90% succeed |
| Rate limit enforcement | Active | Active |

---

## 🧪 CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start services
      run: docker-compose up -d
    
    - name: Wait for services
      run: sleep 10
    
    - name: Run API tests
      run: node scripts/test-api.js --all
    
    - name: Run performance tests
      run: node scripts/test-performance.js quick
```

---

## 📝 Adding New Tests

### Creating a New Test Script

```javascript
import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function myNewTest() {
  console.log('🧪 Running new test...');
  
  const response = await fetch(`${BASE_URL}/your-endpoint`);
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Test passed');
  } else {
    console.log('❌ Test failed');
  }
}

myNewTest();
```

### Best Practices

1. **Use color-coded output** for better readability
2. **Include error handling** for network issues
3. **Display progress indicators** for long-running tests
4. **Show sample data** to verify correctness
5. **Support environment variables** for flexibility
6. **Add --help option** for documentation

---

## 📚 Related Documentation

- [API Reference](../docs/API_REFERENCE.md) - Complete API documentation
- [Realtime Guide](../docs/REALTIME_GUIDE.md) - WebSocket integration
- [Deployment Checklist](../docs/DEPLOYMENT_CHECKLIST.md) - Production deployment
- [Implementation Summary](../docs/IMPLEMENTATION_SUMMARY.md) - System overview

---

## 🤝 Contributing

When adding new features, please:

1. Update relevant test scripts
2. Add test cases for new endpoints
3. Update this README with new script documentation
4. Verify all tests pass before committing

---

## 📞 Support

For issues or questions:
- Check [API Reference](../docs/API_REFERENCE.md) for endpoint details
- Review [Troubleshooting](#-troubleshooting) section above
- Check backend logs: `docker-compose logs backend`
- Verify environment configuration

---

**Last Updated:** 2024-01-16  
**Version:** 2.0.0  
**Maintainer:** Development Team
