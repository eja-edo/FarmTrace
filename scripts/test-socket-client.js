#!/usr/bin/env node
/**
 * Test Socket.IO client for realtime events
 * 
 * Usage:
 *   node scripts/test-socket-client.js [deviceId] [token]
 * 
 * Example:
 *   node scripts/test-socket-client.js esp32-001 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

import { io } from 'socket.io-client';

const deviceId = process.argv[2] || 'esp32-001';
const token = process.argv[3] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzYxOTIzMDg0LCJleHAiOjE3NjI1Mjc4ODQsImF1ZCI6ImlvdC1jbGllbnRzIiwiaXNzIjoiaW90LWJhY2tlbmQifQ.cfN0fazxdbtBgeplK1RoiAXOY5B_CksxYeJQAzXO_TQ';
const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';

console.log('🚀 Starting Socket.IO test client...');
console.log(`📡 Server: ${serverUrl}`);
console.log(`🔧 Device: ${deviceId}`);
console.log(`🔑 Token: ${token.substring(0, 20)}...`);
console.log('');

const socket = io(serverUrl, {
    auth: {
        token
    },
    transports: ['websocket', 'polling']
});

let eventCount = {
    sensor_reading: 0,
    device_location: 0,
    alert: 0
};

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Transport: ${socket.io.engine.transport.name}`);
    console.log('');

    // Join device room
    console.log(`📨 Joining device room: ${deviceId}`);
    socket.emit('join', {
        devices: [deviceId]
    });
});

socket.on('joined', (data) => {
    console.log('✅ Successfully joined rooms:', data);
    console.log('');
    console.log('👂 Listening for events...');
    console.log('   Press Ctrl+C to exit');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
});

socket.on('sensor_reading', (data) => {
    eventCount.sensor_reading++;
    const time = new Date(data.createdAt).toLocaleTimeString();
    console.log(`📊 [${time}] Sensor Reading #${eventCount.sensor_reading}`);
    console.log(`   Device: ${data.deviceId}`);
    console.log(`   Type:   ${data.type}`);
    console.log(`   Value:  ${data.value}`);
    console.log('');
});

socket.on('device_location', (data) => {
    eventCount.device_location++;
    const time = new Date(data.createdAt).toLocaleTimeString();
    console.log(`📍 [${time}] Location Update #${eventCount.device_location}`);
    console.log(`   Device:    ${data.deviceId}`);
    console.log(`   Latitude:  ${data.latitude}`);
    console.log(`   Longitude: ${data.longitude}`);
    console.log('');
});

socket.on('alert', (data) => {
    eventCount.alert++;
    const time = new Date(data.createdAt).toLocaleTimeString();
    console.log(`🚨 [${time}] ALERT #${eventCount.alert}`);
    console.log(`   Device:      ${data.deviceId}`);
    console.log(`   Type:        ${data.type}`);
    console.log(`   Value:       ${data.value}`);
    console.log(`   Threshold:   ${data.thresholdId}`);
    console.log('');
});

socket.on('disconnect', (reason) => {
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('❌ Disconnected from server');
    console.log(`   Reason: ${reason}`);
    console.log('');
    printSummary();
});

socket.on('connect_error', (error) => {
    console.error('');
    console.error('❌ Connection error:', error.message);
    console.error('');

    if (error.message.includes('authentication')) {
        console.error('💡 Tip: Make sure your JWT token is valid');
        console.error('   Get a token by logging in: POST http://localhost:3000/auth/login');
        console.error('');
        process.exit(1);
    }
});

socket.on('error', (error) => {
    console.error('');
    console.error('❌ Socket error:', error);
    console.error('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('⏹️  Shutting down...');
    socket.close();
    printSummary();
    process.exit(0);
});

function printSummary() {
    console.log('📈 Event Summary:');
    console.log(`   Sensor Readings: ${eventCount.sensor_reading}`);
    console.log(`   Location Updates: ${eventCount.device_location}`);
    console.log(`   Alerts: ${eventCount.alert}`);
    console.log(`   Total: ${Object.values(eventCount).reduce((a, b) => a + b, 0)}`);
    console.log('');
}

// Print stats every 30 seconds
setInterval(() => {
    if (socket.connected) {
        console.log('═'.repeat(80));
        console.log(`⏱️  [${new Date().toLocaleTimeString()}] Stats Update`);
        printSummary();
    }
}, 30000);
