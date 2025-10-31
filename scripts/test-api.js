/**
 * Comprehensive API Testing Script
 * Tests all endpoints including authentication, devices, shipments, analytics, etc.
 */

import fetch from 'node-fetch';
import { createInterface } from 'readline';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name) {
  log(`\n📋 Testing: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function apiRequest(method, endpoint, body = null, useAuth = true) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (useAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// Test Authentication
async function testAuthentication() {
  logSection('1. AUTHENTICATION TESTS');

  logTest('POST /auth/login - Valid credentials');
  const loginResult = await apiRequest('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin123'
  }, false);

  if (loginResult.ok && loginResult.data.token) {
    authToken = loginResult.data.token;
    logSuccess(`Login successful! Token: ${authToken.substring(0, 20)}...`);
    console.log(JSON.stringify(loginResult.data.user, null, 2));
  } else {
    logError('Login failed!');
    console.log(JSON.stringify(loginResult, null, 2));
    process.exit(1);
  }

  logTest('POST /auth/login - Invalid credentials');
  const failedLogin = await apiRequest('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'wrongpassword'
  }, false);

  if (!failedLogin.ok) {
    logSuccess('Invalid credentials correctly rejected');
  } else {
    logWarning('Security issue: Invalid credentials accepted!');
  }
}

// Test Health Check
async function testHealthCheck() {
  logSection('2. HEALTH CHECK');

  logTest('GET /health');
  const result = await apiRequest('GET', '/health', null, false);

  if (result.ok && result.data.status === 'ok') {
    logSuccess('Health check passed');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    logError('Health check failed!');
  }
}

// Test Device Management
async function testDeviceManagement() {
  logSection('3. DEVICE MANAGEMENT TESTS');

  logTest('GET /device - List all devices');
  const listResult = await apiRequest('GET', '/device');
  
  if (listResult.ok) {
    logSuccess(`Found ${listResult.data.devices?.length || 0} devices`);
    if (listResult.data.devices?.[0]) {
      console.log('Sample device:', JSON.stringify(listResult.data.devices[0], null, 2));
    }
  } else {
    logError('Failed to list devices');
  }

  // Get first device ID for further tests
  const deviceId = listResult.data.devices?.[0]?.id;
  
  if (deviceId) {
    logTest(`GET /device/${deviceId} - Get device details`);
    const detailResult = await apiRequest('GET', `/device/${deviceId}`);
    
    if (detailResult.ok) {
      logSuccess('Device details retrieved');
      console.log(JSON.stringify(detailResult.data.device, null, 2));
    } else {
      logError('Failed to get device details');
    }

    logTest(`GET /device/${deviceId}/sensors?type=temperature&limit=10`);
    const sensorResult = await apiRequest('GET', `/device/${deviceId}/sensors?type=temperature&limit=10`);
    
    if (sensorResult.ok) {
      logSuccess(`Retrieved ${sensorResult.data?.data?.readings?.length || 0} sensor readings`);
      if (sensorResult.data?.pagination) {
        console.log('Pagination:', JSON.stringify(sensorResult.data.pagination, null, 2));
      }
    } else {
      logWarning('No sensor data or failed to retrieve');
    }

    logTest(`GET /device/${deviceId}/location?limit=10`);
    const locationResult = await apiRequest('GET', `/device/${deviceId}/location?limit=10`);
    
    if (locationResult.ok) {
      logSuccess(`Retrieved ${locationResult.data?.data?.locations?.length || 0} location records`);
      if (locationResult.data?.pagination) {
        console.log('Pagination:', JSON.stringify(locationResult.data.pagination, null, 2));
      }
    } else {
      logWarning('No location data or failed to retrieve');
    }
  } else {
    logWarning('No devices found in database - skipping detail tests');
  }

  // Test device creation
  logTest('POST /device - Create new device');
  const createResult = await apiRequest('POST', '/device', {
    deviceId: `TEST-${Date.now()}`,
    name: 'Test Sensor Device',
    secret: 'testsecret123'
  });

  if (createResult.ok) {
    logSuccess('Device created successfully');
    console.log(JSON.stringify(createResult.data, null, 2));
  } else {
    logWarning('Device creation failed (may be expected if validation fails)');
    console.log(JSON.stringify(createResult.data, null, 2));
  }
}

// Test Vehicle Tracking
async function testVehicleTracking() {
  logSection('4. VEHICLE TRACKING TESTS');

  logTest('GET /vehicles - List all vehicles');
  const listResult = await apiRequest('GET', '/vehicles');
  
  if (listResult.ok) {
    logSuccess(`Found ${listResult.data.vehicles?.length || 0} vehicles`);
    if (listResult.data.vehicles?.[0]) {
      console.log('Sample vehicle:', JSON.stringify(listResult.data.vehicles[0], null, 2));
    }
  } else {
    logError('Failed to list vehicles');
  }

  const vehicleId = listResult.data.vehicles?.[0]?.id;
  
  if (vehicleId) {
    logTest(`GET /vehicles/${vehicleId}/track?limit=10`);
    const trackResult = await apiRequest('GET', `/vehicles/${vehicleId}/track?limit=10`);
    
    if (trackResult.ok) {
      logSuccess(`Retrieved ${trackResult.data?.data?.tracking?.length || 0} tracking records`);
      if (trackResult.data?.pagination) {
        console.log('Pagination:', JSON.stringify(trackResult.data.pagination, null, 2));
      }
    } else {
      logWarning('No tracking data or failed to retrieve');
    }
  } else {
    logWarning('No vehicles found in database');
  }
}

// Test Order Management
async function testOrderManagement() {
  logSection('5. ORDER MANAGEMENT TESTS');

  logTest('GET /orders - List all orders');
  const listResult = await apiRequest('GET', '/orders');
  
  if (listResult.ok) {
    logSuccess(`Found ${listResult.data.orders?.length || 0} orders`);
    if (listResult.data.orders?.[0]) {
      console.log('Sample order:', JSON.stringify(listResult.data.orders[0], null, 2));
    }
  } else {
    logError('Failed to list orders');
  }

  const orderId = listResult.data.orders?.[0]?.id;
  
  if (orderId) {
    logTest(`GET /orders/${orderId}/track`);
    const trackResult = await apiRequest('GET', `/orders/${orderId}/track`);
    
    if (trackResult.ok) {
      logSuccess('Order tracking data retrieved');
      console.log('Order:', JSON.stringify(trackResult.data?.order, null, 2));
      logSuccess(`Tracking points: ${trackResult.data?.tracking?.length || 0}`);
      if (trackResult.data?.pagination) {
        console.log('Pagination:', JSON.stringify(trackResult.data.pagination, null, 2));
      }
    } else {
      logWarning('No tracking data or failed to retrieve');
    }
  } else {
    logWarning('No orders found in database');
  }
}

// Test Shipment Management (NEW)
async function testShipmentManagement() {
  logSection('6. SHIPMENT MANAGEMENT TESTS (NEW)');

  logTest('GET /shipments/stats - Get shipment statistics');
  const statsResult = await apiRequest('GET', '/shipments/stats');
  
  if (statsResult.ok) {
    logSuccess('Shipment statistics retrieved');
    console.log(JSON.stringify(statsResult.data, null, 2));
  } else {
    logWarning('Failed to get shipment statistics');
  }

  logTest('GET /shipments?page=1&limit=10 - List shipments');
  const listResult = await apiRequest('GET', '/shipments?page=1&limit=10');
  
  if (listResult.ok) {
    logSuccess(`Found ${listResult.data?.data?.shipments?.length || 0} shipments`);
    if (listResult.data?.pagination) {
      console.log('Pagination:', JSON.stringify(listResult.data.pagination, null, 2));
    }
    if (listResult.data?.data?.shipments?.[0]) {
      console.log('Sample shipment:', JSON.stringify(listResult.data.data.shipments[0], null, 2));
    }
  } else {
    logError('Failed to list shipments');
  }

  logTest('GET /shipments?status=IN_TRANSIT - Filter by status');
  const filterResult = await apiRequest('GET', '/shipments?status=IN_TRANSIT');
  
  if (filterResult.ok) {
    logSuccess(`Found ${filterResult.data?.data?.shipments?.length || 0} in-transit shipments`);
  } else {
    logWarning('Failed to filter shipments');
  }

  const shipmentId = listResult.data?.data?.shipments?.[0]?.id;
  
  if (shipmentId) {
    logTest(`GET /shipments/${shipmentId} - Get shipment details with tracking`);
    const detailResult = await apiRequest('GET', `/shipments/${shipmentId}`);
    
    if (detailResult.ok) {
      logSuccess('Shipment details retrieved with tracking data');
      const shipment = detailResult.data.shipment;
      console.log('Shipment:', JSON.stringify({
        id: shipment.id,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        devices: shipment.devices?.length || 0,
        sensors: shipment.sensorReadings?.length || 0,
        locations: shipment.locations?.length || 0,
        alerts: shipment.alerts?.length || 0
      }, null, 2));
    } else {
      logError('Failed to get shipment details');
    }
  }

  // Test shipment creation
  logTest('POST /shipments - Create new shipment');
  const createResult = await apiRequest('POST', '/shipments', {
    deviceIds: ['ESP32-001'],
    vehicleId: 1,
    orderIds: [1],
    status: 'PENDING',
    origin: 'Test Warehouse',
    destination: 'Test Destination',
    scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estimatedArrival: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  });

  if (createResult.ok) {
    logSuccess('Shipment created successfully');
    console.log(JSON.stringify(createResult.data.shipment, null, 2));

    const newShipmentId = createResult.data.shipment.id;

    // Test shipment update
    logTest(`PUT /shipments/${newShipmentId} - Update shipment`);
    const updateResult = await apiRequest('PUT', `/shipments/${newShipmentId}`, {
      status: 'IN_TRANSIT',
      actualDeparture: new Date().toISOString()
    });

    if (updateResult.ok) {
      logSuccess('Shipment updated successfully');
      console.log(JSON.stringify(updateResult.data.shipment, null, 2));
    } else {
      logError('Failed to update shipment');
    }

    // Test shipment deletion
    logTest(`DELETE /shipments/${newShipmentId} - Delete shipment`);
    const deleteResult = await apiRequest('DELETE', `/shipments/${newShipmentId}`);

    if (deleteResult.ok) {
      logSuccess('Shipment deleted successfully');
    } else {
      logError('Failed to delete shipment');
    }
  } else {
    logWarning('Shipment creation failed (may be expected if validation fails)');
    console.log(JSON.stringify(createResult.data, null, 2));
  }
}

// Test Analytics (NEW)
async function testAnalytics() {
  logSection('7. ANALYTICS & STATISTICS TESTS (NEW)');

  logTest('GET /analytics/dashboard - Dashboard overview');
  const dashboardResult = await apiRequest('GET', '/analytics/dashboard');
  
  if (dashboardResult.ok) {
    logSuccess('Dashboard data retrieved');
    console.log(JSON.stringify(dashboardResult.data.data, null, 2));
  } else {
    logError('Failed to get dashboard data');
  }

  logTest('GET /analytics/devices - Device statistics');
  const deviceStatsResult = await apiRequest('GET', '/analytics/devices');
  
  if (deviceStatsResult.ok) {
    logSuccess('Device statistics retrieved');
    console.log(JSON.stringify(deviceStatsResult.data.data, null, 2));
  } else {
    logError('Failed to get device statistics');
  }

  logTest('GET /analytics/sensors/ESP32-001?type=temperature - Sensor statistics');
  const sensorStatsResult = await apiRequest('GET', '/analytics/sensors/ESP32-001?type=temperature');
  
  if (sensorStatsResult.ok) {
    logSuccess('Sensor statistics retrieved');
    console.log(JSON.stringify(sensorStatsResult.data.data, null, 2));
  } else {
    logWarning('Failed to get sensor statistics (device may not exist)');
  }

  logTest('GET /analytics/alerts - Alert statistics');
  const alertStatsResult = await apiRequest('GET', '/analytics/alerts');
  
  if (alertStatsResult.ok) {
    logSuccess('Alert statistics retrieved');
    console.log(JSON.stringify(alertStatsResult.data.data, null, 2));
  } else {
    logError('Failed to get alert statistics');
  }

  logTest('GET /analytics/shipments - Shipment statistics');
  const shipmentStatsResult = await apiRequest('GET', '/analytics/shipments');
  
  if (shipmentStatsResult.ok) {
    logSuccess('Shipment statistics retrieved');
    console.log(JSON.stringify(shipmentStatsResult.data.data, null, 2));
  } else {
    logError('Failed to get shipment statistics');
  }

  // Test with date range
  const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date().toISOString();
  
  logTest(`GET /analytics/alerts?startTime=${startTime}&endTime=${endTime} - Time range filter`);
  const rangeResult = await apiRequest('GET', `/analytics/alerts?startTime=${startTime}&endTime=${endTime}`);
  
  if (rangeResult.ok) {
    logSuccess('Time-filtered alert statistics retrieved');
    console.log(JSON.stringify(rangeResult.data.data, null, 2));
  } else {
    logWarning('Failed to get time-filtered statistics');
  }
}

// Test IoT Data Ingestion
async function testIoTDataIngestion() {
  logSection('8. IOT DATA INGESTION TESTS');

  logTest('POST /iot/data - Submit sensor data (no auth required)');
  const result = await apiRequest('POST', '/iot/data', {
    deviceId: 'ESP32-TEST',
    timestamp: new Date().toISOString(),
    temperature: 25.5,
    humidity: 60.2,
    vibration: 0.8,
    gps: {
      latitude: 10.762622,
      longitude: 106.660172,
      speed: 45.5
    }
  }, false);

  if (result.ok) {
    logSuccess('IoT data submitted successfully');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    logError('Failed to submit IoT data');
    console.log(JSON.stringify(result, null, 2));
  }

  logTest('POST /iot/data - Submit data without GPS');
  const noGpsResult = await apiRequest('POST', '/iot/data', {
    deviceId: 'ESP32-TEST',
    timestamp: new Date().toISOString(),
    temperature: 26.0,
    humidity: 61.0,
    vibration: 0.7
  }, false);

  if (noGpsResult.ok) {
    logSuccess('IoT data without GPS submitted successfully');
  } else {
    logWarning('Failed to submit IoT data without GPS');
  }
}

// Test Realtime Endpoints
async function testRealtimeEndpoints() {
  logSection('9. REALTIME ENDPOINTS TESTS');

  logTest('GET /api/realtime/stats - Realtime statistics');
  const statsResult = await apiRequest('GET', '/api/realtime/stats');
  
  if (statsResult.ok) {
    logSuccess('Realtime statistics retrieved');
    console.log(JSON.stringify(statsResult.data, null, 2));
  } else {
    logError('Failed to get realtime statistics');
  }
}

// Test Rate Limiting
async function testRateLimiting() {
  logSection('10. RATE LIMITING TESTS');

  logTest('Testing rate limits - Multiple rapid requests');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(apiRequest('GET', '/health', null, false));
  }

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.ok).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;

  logSuccess(`Successful requests: ${successCount}`);
  if (rateLimitedCount > 0) {
    logWarning(`Rate limited requests: ${rateLimitedCount}`);
  }
}

// Test Error Handling
async function testErrorHandling() {
  logSection('11. ERROR HANDLING TESTS');

  logTest('GET /nonexistent - 404 Not Found');
  const notFoundResult = await apiRequest('GET', '/nonexistent');
  
  if (notFoundResult.status === 404) {
    logSuccess('404 error handled correctly');
  } else {
    logWarning('404 error not handled as expected');
  }

  logTest('GET /device/99999 - Non-existent resource');
  const noResourceResult = await apiRequest('GET', '/device/99999');
  
  if (!noResourceResult.ok) {
    logSuccess('Non-existent resource handled correctly');
  } else {
    logWarning('Non-existent resource error not handled');
  }

  logTest('POST /shipments - Invalid data');
  const invalidDataResult = await apiRequest('POST', '/shipments', {
    deviceIds: [], // Empty array should fail validation
    vehicleId: 'invalid' // Should be number
  });

  if (!invalidDataResult.ok) {
    logSuccess('Invalid data rejected correctly');
    console.log(JSON.stringify(invalidDataResult.data, null, 2));
  } else {
    logWarning('Invalid data accepted (validation may be missing)');
  }
}

// Main test runner
async function runAllTests() {
  log('\n🚀 Starting API Test Suite', 'magenta');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`Time: ${new Date().toISOString()}`, 'cyan');

  try {
    await testHealthCheck();
    await testAuthentication();
    await testDeviceManagement();
    await testVehicleTracking();
    await testOrderManagement();
    await testShipmentManagement();
    await testAnalytics();
    await testIoTDataIngestion();
    await testRealtimeEndpoints();
    await testRateLimiting();
    await testErrorHandling();

    logSection('TEST SUITE COMPLETED');
    logSuccess('All tests executed successfully! ✨');
    log('\nCheck the output above for any warnings or errors.', 'yellow');
  } catch (error) {
    logSection('TEST SUITE FAILED');
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Interactive mode
async function interactiveMode() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  log('\n🎯 Interactive API Testing Mode', 'magenta');
  log('Available test suites:', 'cyan');
  log('1. Health Check', 'yellow');
  log('2. Authentication', 'yellow');
  log('3. Device Management', 'yellow');
  log('4. Vehicle Tracking', 'yellow');
  log('5. Order Management', 'yellow');
  log('6. Shipment Management', 'yellow');
  log('7. Analytics', 'yellow');
  log('8. IoT Data Ingestion', 'yellow');
  log('9. Realtime Endpoints', 'yellow');
  log('10. Rate Limiting', 'yellow');
  log('11. Error Handling', 'yellow');
  log('12. Run All Tests', 'yellow');
  log('0. Exit', 'yellow');

  const answer = await question('\nSelect test suite (0-12): ');
  rl.close();

  // First login for auth token
  if (answer !== '0' && answer !== '1') {
    await testAuthentication();
  }

  switch (answer) {
    case '1': await testHealthCheck(); break;
    case '2': await testAuthentication(); break;
    case '3': await testDeviceManagement(); break;
    case '4': await testVehicleTracking(); break;
    case '5': await testOrderManagement(); break;
    case '6': await testShipmentManagement(); break;
    case '7': await testAnalytics(); break;
    case '8': await testIoTDataIngestion(); break;
    case '9': await testRealtimeEndpoints(); break;
    case '10': await testRateLimiting(); break;
    case '11': await testErrorHandling(); break;
    case '12': await runAllTests(); break;
    case '0': log('Goodbye! 👋', 'cyan'); process.exit(0);
    default: logError('Invalid selection'); process.exit(1);
  }
}

// Run based on arguments
const args = process.argv.slice(2);
if (args.includes('--all') || args.length === 0) {
  runAllTests();
} else if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode();
} else {
  log('Usage:', 'cyan');
  log('  node test-api.js --all          Run all tests', 'yellow');
  log('  node test-api.js --interactive  Interactive mode', 'yellow');
  log('  node test-api.js -i             Interactive mode (short)', 'yellow');
}
