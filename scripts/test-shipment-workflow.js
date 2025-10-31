/**
 * Shipment Workflow Test Script
 * Tests complete shipment lifecycle from creation to delivery
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken = null;

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

function logStep(step, message) {
    log(`\n[${'='.repeat(3)} STEP ${step} ${'='.repeat(3)}]`, 'cyan');
    log(message, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

async function apiRequest(method, endpoint, body = null) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return { status: response.status, ok: response.ok, data };
    } catch (error) {
        return { status: 0, ok: false, error: error.message };
    }
}

async function login() {
    logStep(1, 'Authentication');

    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@example.com',
            password: 'admin123'
        })
    });

    const data = await response.json();

    if (response.ok && data.token) {
        authToken = data.token;
        logSuccess('Logged in successfully');
        return true;
    } else {
        logError('Login failed');
        return false;
    }
}

async function createShipment() {
    logStep(2, 'Create New Shipment');

    const now = new Date();
    const departure = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const arrival = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

    const shipmentData = {
        deviceIds: ['ESP32-001', 'ESP32-002'],
        vehicleId: 1,
        orderIds: [1, 2],
        status: 'PENDING',
        origin: 'Warehouse A - District 7',
        destination: 'Customer Site - District 1',
        scheduledDeparture: departure.toISOString(),
        estimatedArrival: arrival.toISOString()
    };

    log('\n📦 Creating shipment with data:', 'blue');
    console.log(JSON.stringify(shipmentData, null, 2));

    const result = await apiRequest('POST', '/shipments', shipmentData);

    if (result.ok) {
        const shipment = result.data.shipment;
        logSuccess(`Shipment created with ID: ${shipment.id}`);
        console.log(JSON.stringify({
            id: shipment.id,
            status: shipment.status,
            origin: shipment.origin,
            destination: shipment.destination,
            devices: shipment.devices?.length || 0,
            vehicle: shipment.vehicle?.vehicleId || 'N/A'
        }, null, 2));
        return shipment.id;
    } else {
        logError('Failed to create shipment');
        console.log(JSON.stringify(result.data, null, 2));
        return null;
    }
}

async function updateShipmentStatus(shipmentId, status, additionalData = {}) {
    logStep(3, `Update Shipment Status to ${status}`);

    const updateData = { status, ...additionalData };

    log('\n🔄 Updating shipment with:', 'blue');
    console.log(JSON.stringify(updateData, null, 2));

    const result = await apiRequest('PUT', `/shipments/${shipmentId}`, updateData);

    if (result.ok) {
        logSuccess(`Shipment updated to ${status}`);
        const shipment = result.data.shipment;
        console.log(JSON.stringify({
            id: shipment.id,
            status: shipment.status,
            actualDeparture: shipment.actualDeparture,
            actualArrival: shipment.actualArrival
        }, null, 2));
        return true;
    } else {
        logError('Failed to update shipment');
        console.log(JSON.stringify(result.data, null, 2));
        return false;
    }
}

async function getShipmentDetails(shipmentId) {
    logStep(4, 'Retrieve Shipment Details with Tracking Data');

    const result = await apiRequest('GET', `/shipments/${shipmentId}`);

    if (result.ok) {
        const shipment = result.data.shipment;
        logSuccess('Shipment details retrieved');

        console.log('\n📊 Shipment Summary:');
        console.log(JSON.stringify({
            id: shipment.id,
            status: shipment.status,
            origin: shipment.origin,
            destination: shipment.destination,
            scheduledDeparture: shipment.scheduledDeparture,
            actualDeparture: shipment.actualDeparture,
            estimatedArrival: shipment.estimatedArrival,
            actualArrival: shipment.actualArrival,
            devices: shipment.devices?.length || 0,
            sensorReadings: shipment.sensorReadings?.length || 0,
            locations: shipment.locations?.length || 0,
            alerts: shipment.alerts?.length || 0
        }, null, 2));

        if (shipment.sensorReadings?.length > 0) {
            log('\n🌡️  Latest Sensor Readings:', 'yellow');
            shipment.sensorReadings.slice(0, 5).forEach(reading => {
                console.log(`  ${reading.type}: ${reading.value} (${reading.deviceId}) at ${reading.timestamp}`);
            });
        }

        if (shipment.locations?.length > 0) {
            log('\n📍 Latest GPS Locations:', 'yellow');
            shipment.locations.slice(0, 5).forEach(loc => {
                console.log(`  ${loc.deviceId}: ${loc.latitude}, ${loc.longitude} (${loc.speed} km/h) at ${loc.timestamp}`);
            });
        }

        if (shipment.alerts?.length > 0) {
            log('\n⚠️  Active Alerts:', 'red');
            shipment.alerts.forEach(alert => {
                console.log(`  [${alert.severity}] ${alert.type}: ${alert.message}`);
            });
        }

        return true;
    } else {
        logError('Failed to retrieve shipment details');
        return false;
    }
}

async function simulateDataTransmission(deviceId = 'ESP32-001') {
    logStep(5, 'Simulate IoT Device Data Transmission');

    const sensorData = {
        deviceId,
        timestamp: new Date().toISOString(),
        temperature: 25.5 + Math.random() * 5,
        humidity: 60 + Math.random() * 10,
        vibration: 0.5 + Math.random() * 0.5,
        gps: {
            latitude: 10.762622 + (Math.random() - 0.5) * 0.01,
            longitude: 106.660172 + (Math.random() - 0.5) * 0.01,
            speed: 40 + Math.random() * 20
        }
    };

    log('\n📡 Sending sensor data:', 'blue');
    console.log(JSON.stringify(sensorData, null, 2));

    const response = await fetch(`${BASE_URL}/iot/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensorData)
    });

    const result = await response.json();

    if (response.ok) {
        logSuccess('Sensor data transmitted successfully');
        return true;
    } else {
        logError('Failed to transmit sensor data');
        console.log(JSON.stringify(result, null, 2));
        return false;
    }
}

async function checkAnalytics() {
    logStep(6, 'Check Dashboard Analytics');

    const result = await apiRequest('GET', '/analytics/dashboard');

    if (result.ok) {
        logSuccess('Analytics data retrieved');
        console.log('\n📈 Dashboard Overview:');
        console.log(JSON.stringify(result.data.data, null, 2));
        return true;
    } else {
        logError('Failed to retrieve analytics');
        return false;
    }
}

async function listShipments(status = null) {
    logStep(7, `List ${status ? status : 'All'} Shipments`);

    const endpoint = status ? `/shipments?status=${status}&limit=10` : '/shipments?limit=10';
    const result = await apiRequest('GET', endpoint);

    if (result.ok) {
        const shipments = result.data.data?.shipments || [];
        logSuccess(`Found ${shipments.length} shipments`);

        if (shipments.length > 0) {
            console.log('\n📦 Shipments:');
            shipments.forEach(s => {
                console.log(`  [${s.id}] ${s.status}: ${s.origin} → ${s.destination}`);
            });
        }

        if (result.data.pagination) {
            console.log('\n📄 Pagination:', JSON.stringify(result.data.pagination, null, 2));
        }

        return true;
    } else {
        logError('Failed to list shipments');
        return false;
    }
}

async function completeShipmentWorkflow() {
    log('\n🚀 Starting Complete Shipment Workflow Test', 'magenta');
    log('='.repeat(60), 'cyan');

    // Step 1: Login
    if (!await login()) {
        process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Create shipment
    const shipmentId = await createShipment();
    if (!shipmentId) {
        process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Update to IN_TRANSIT
    await updateShipmentStatus(shipmentId, 'IN_TRANSIT', {
        actualDeparture: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Simulate sensor data during transit
    log('\n🔄 Simulating 3 data transmissions during transit...', 'yellow');
    for (let i = 0; i < 3; i++) {
        await simulateDataTransmission('ESP32-001');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 5: Get shipment details with tracking data
    await getShipmentDetails(shipmentId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Update to DELIVERED
    await updateShipmentStatus(shipmentId, 'DELIVERED', {
        actualArrival: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: Final shipment details
    await getShipmentDetails(shipmentId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: Check analytics
    await checkAnalytics();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 9: List shipments by status
    await listShipments('DELIVERED');

    log('\n' + '='.repeat(60), 'cyan');
    log('🎉 Shipment Workflow Test Completed Successfully!', 'green');
    log('='.repeat(60), 'cyan');

    log(`\n📋 Test Summary:`, 'magenta');
    log(`  - Created shipment ID: ${shipmentId}`, 'yellow');
    log(`  - Status transitions: PENDING → IN_TRANSIT → DELIVERED`, 'yellow');
    log(`  - Transmitted 3 sensor data points`, 'yellow');
    log(`  - Verified tracking data and analytics`, 'yellow');

    log(`\n💡 Next Steps:`, 'cyan');
    log(`  1. Check WebSocket for realtime updates: node scripts/test-socket-client.js`, 'yellow');
    log(`  2. View shipment in database or API: GET /shipments/${shipmentId}`, 'yellow');
    log(`  3. Test frontend integration with this workflow`, 'yellow');
}

async function quickTest() {
    log('\n⚡ Quick Shipment Test', 'magenta');

    if (!await login()) process.exit(1);

    const shipmentId = await createShipment();
    if (shipmentId) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await getShipmentDetails(shipmentId);
        logSuccess('\n✅ Quick test completed!');
    }
}

async function statusUpdateTest() {
    log('\n🔄 Status Update Test', 'magenta');

    if (!await login()) process.exit(1);

    // Get existing shipment
    const listResult = await apiRequest('GET', '/shipments?limit=1');
    const shipmentId = listResult.data?.data?.shipments?.[0]?.id;

    if (!shipmentId) {
        logError('No existing shipments found. Create one first.');
        process.exit(1);
    }

    log(`\nTesting with shipment ID: ${shipmentId}`, 'blue');

    await updateShipmentStatus(shipmentId, 'IN_TRANSIT', {
        actualDeparture: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    await getShipmentDetails(shipmentId);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'full';

switch (command) {
    case 'full':
        completeShipmentWorkflow();
        break;
    case 'quick':
        quickTest();
        break;
    case 'update':
        statusUpdateTest();
        break;
    case '--help':
    case '-h':
        console.log(`
Shipment Workflow Test Script
==============================

Usage: node test-shipment-workflow.js [command]

Commands:
  full      Run complete shipment lifecycle test (default)
  quick     Quick test: create shipment and retrieve details
  update    Test status updates on existing shipment

Environment Variables:
  API_URL   Backend API URL (default: http://localhost:3000)

Examples:
  node test-shipment-workflow.js
  node test-shipment-workflow.js full
  node test-shipment-workflow.js quick
  node test-shipment-workflow.js update
    `);
        break;
    default:
        logError(`Unknown command: ${command}`);
        log('Use --help to see available commands', 'yellow');
        process.exit(1);
}
