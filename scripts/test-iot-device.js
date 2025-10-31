/**
 * MQTT to IoT API Test Script
 * Simulates ESP32 devices sending sensor data via MQTT and HTTP
 */

import mqtt from 'mqtt';
import fetch from 'node-fetch';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const DEVICE_ID = process.env.DEVICE_ID || 'ESP32-TEST-001';

// Simulated sensor ranges
const SENSOR_RANGES = {
    temperature: { min: 15, max: 35, threshold: 30 },
    humidity: { min: 30, max: 90, threshold: 80 },
    vibration: { min: 0, max: 2, threshold: 1.5 },
    latitude: { center: 10.762622, variance: 0.01 },
    longitude: { center: 106.660172, variance: 0.01 },
    speed: { min: 0, max: 80 }
};

let mqttClient = null;
let intervalId = null;
let messageCount = 0;

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',
        SUCCESS: '\x1b[32m',
        ERROR: '\x1b[31m',
        WARNING: '\x1b[33m',
        DATA: '\x1b[35m'
    };
    console.log(`${colors[type]}[${timestamp}] [${type}] ${message}\x1b[0m`);
}

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function generateSensorData() {
    const temp = randomInRange(SENSOR_RANGES.temperature.min, SENSOR_RANGES.temperature.max);
    const humidity = randomInRange(SENSOR_RANGES.humidity.min, SENSOR_RANGES.humidity.max);
    const vibration = randomInRange(SENSOR_RANGES.vibration.min, SENSOR_RANGES.vibration.max);

    // Occasionally simulate high values to trigger alerts
    const shouldSimulateAlert = Math.random() < 0.1; // 10% chance

    return {
        deviceId: DEVICE_ID,
        timestamp: new Date().toISOString(),
        temperature: shouldSimulateAlert ? SENSOR_RANGES.temperature.threshold + 2 : temp,
        humidity: shouldSimulateAlert ? SENSOR_RANGES.humidity.threshold + 5 : humidity,
        vibration: shouldSimulateAlert ? SENSOR_RANGES.vibration.threshold + 0.3 : vibration,
        gps: {
            latitude: SENSOR_RANGES.latitude.center + randomInRange(-SENSOR_RANGES.latitude.variance, SENSOR_RANGES.latitude.variance),
            longitude: SENSOR_RANGES.longitude.center + randomInRange(-SENSOR_RANGES.longitude.variance, SENSOR_RANGES.longitude.variance),
            speed: randomInRange(SENSOR_RANGES.speed.min, SENSOR_RANGES.speed.max)
        }
    };
}

async function sendViaHTTP(data) {
    try {
        const response = await fetch(`${API_URL}/iot/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            log(`HTTP: Data sent successfully (${messageCount})`, 'SUCCESS');
        } else {
            log(`HTTP: Failed to send data - ${result.error || result.message}`, 'ERROR');
        }
    } catch (error) {
        log(`HTTP: Error - ${error.message}`, 'ERROR');
    }
}

function sendViaMQTT(data) {
    if (!mqttClient || !mqttClient.connected) {
        log('MQTT: Client not connected', 'WARNING');
        return;
    }

    const topic = `iot/${DEVICE_ID}/data`;

    mqttClient.publish(topic, JSON.stringify(data), { qos: 1 }, (error) => {
        if (error) {
            log(`MQTT: Failed to publish - ${error.message}`, 'ERROR');
        } else {
            log(`MQTT: Published to ${topic} (${messageCount})`, 'SUCCESS');
        }
    });
}

function displaySensorData(data) {
    console.log('\n' + '─'.repeat(60));
    log('Sensor Data Generated:', 'DATA');
    console.log(JSON.stringify({
        deviceId: data.deviceId,
        temperature: `${data.temperature.toFixed(2)}°C ${data.temperature > SENSOR_RANGES.temperature.threshold ? '⚠️ HIGH' : ''}`,
        humidity: `${data.humidity.toFixed(2)}% ${data.humidity > SENSOR_RANGES.humidity.threshold ? '⚠️ HIGH' : ''}`,
        vibration: `${data.vibration.toFixed(2)}g ${data.vibration > SENSOR_RANGES.vibration.threshold ? '⚠️ HIGH' : ''}`,
        gps: {
            latitude: data.gps.latitude.toFixed(6),
            longitude: data.gps.longitude.toFixed(6),
            speed: `${data.gps.speed.toFixed(2)} km/h`
        },
        timestamp: data.timestamp
    }, null, 2));
    console.log('─'.repeat(60));
}

async function sendSensorData(method = 'http') {
    messageCount++;
    const data = generateSensorData();

    displaySensorData(data);

    if (method === 'mqtt') {
        sendViaMQTT(data);
    } else if (method === 'http') {
        await sendViaHTTP(data);
    } else if (method === 'both') {
        await sendViaHTTP(data);
        sendViaMQTT(data);
    }
}

function connectMQTT() {
    return new Promise((resolve, reject) => {
        log(`Connecting to MQTT broker: ${MQTT_BROKER_URL}`, 'INFO');

        mqttClient = mqtt.connect(MQTT_BROKER_URL, {
            clientId: `test-client-${DEVICE_ID}-${Date.now()}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000
        });

        mqttClient.on('connect', () => {
            log('MQTT: Connected successfully!', 'SUCCESS');
            resolve();
        });

        mqttClient.on('error', (error) => {
            log(`MQTT: Connection error - ${error.message}`, 'ERROR');
            reject(error);
        });

        mqttClient.on('close', () => {
            log('MQTT: Connection closed', 'WARNING');
        });

        mqttClient.on('reconnect', () => {
            log('MQTT: Attempting to reconnect...', 'INFO');
        });

        mqttClient.on('offline', () => {
            log('MQTT: Client offline', 'WARNING');
        });
    });
}

function startPeriodicSending(method = 'http', interval = 5000) {
    log(`Starting periodic sensor data transmission every ${interval}ms via ${method.toUpperCase()}`, 'INFO');

    intervalId = setInterval(async () => {
        await sendSensorData(method);
    }, interval);
}

function stopPeriodicSending() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        log('Stopped periodic transmission', 'INFO');
    }
}

async function testSingleMessage(method = 'http') {
    log(`Testing single message transmission via ${method.toUpperCase()}`, 'INFO');

    if (method === 'mqtt' || method === 'both') {
        await connectMQTT();
    }

    await sendSensorData(method);

    if (mqttClient) {
        setTimeout(() => {
            mqttClient.end();
            log('MQTT: Connection closed', 'INFO');
            process.exit(0);
        }, 2000);
    } else {
        process.exit(0);
    }
}

async function testContinuous(method = 'http', interval = 5000, duration = 60000) {
    log(`Testing continuous transmission for ${duration / 1000} seconds`, 'INFO');

    if (method === 'mqtt' || method === 'both') {
        await connectMQTT();
    }

    startPeriodicSending(method, interval);

    setTimeout(() => {
        stopPeriodicSending();

        if (mqttClient) {
            mqttClient.end();
        }

        log(`Test completed. Total messages sent: ${messageCount}`, 'SUCCESS');
        process.exit(0);
    }, duration);
}

async function testStress(method = 'http', count = 100) {
    log(`Starting stress test: ${count} messages via ${method.toUpperCase()}`, 'INFO');

    if (method === 'mqtt' || method === 'both') {
        await connectMQTT();
    }

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
        await sendSensorData(method);
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;
    const messagesPerSecond = (count / duration * 1000).toFixed(2);

    log(`Stress test completed!`, 'SUCCESS');
    log(`Total messages: ${count}`, 'INFO');
    log(`Duration: ${duration}ms`, 'INFO');
    log(`Throughput: ${messagesPerSecond} messages/second`, 'INFO');

    if (mqttClient) {
        mqttClient.end();
    }

    process.exit(0);
}

function displayHelp() {
    console.log(`
IoT Device Simulator - Test Script
===================================

Usage: node test-iot-device.js [command] [options]

Commands:
  single [method]              Send a single test message
  continuous [method] [interval] [duration]
                              Send messages continuously
  stress [method] [count]     Stress test with multiple messages

Methods:
  http                        Send via HTTP REST API (default)
  mqtt                        Send via MQTT broker
  both                        Send via both HTTP and MQTT

Options:
  interval                    Interval in milliseconds (default: 5000)
  duration                    Duration in milliseconds (default: 60000)
  count                       Number of messages (default: 100)

Environment Variables:
  MQTT_BROKER_URL            MQTT broker URL (default: mqtt://localhost:1883)
  API_URL                    Backend API URL (default: http://localhost:3000)
  DEVICE_ID                  Device identifier (default: ESP32-TEST-001)

Examples:
  node test-iot-device.js single http
  node test-iot-device.js continuous mqtt 3000 30000
  node test-iot-device.js stress both 50
  node test-iot-device.js continuous http 2000
  
Sensor Simulation:
  - Temperature: 15-35°C (threshold: 30°C)
  - Humidity: 30-90% (threshold: 80%)
  - Vibration: 0-2g (threshold: 1.5g)
  - GPS: Around Ho Chi Minh City area
  - Speed: 0-80 km/h
  - 10% chance of alert-triggering values
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
}

const command = args[0];
const method = args[1] || 'http';

switch (command) {
    case 'single':
        testSingleMessage(method);
        break;

    case 'continuous':
        const interval = parseInt(args[2]) || 5000;
        const duration = parseInt(args[3]) || 60000;
        testContinuous(method, interval, duration);
        break;

    case 'stress':
        const count = parseInt(args[2]) || 100;
        testStress(method, count);
        break;

    default:
        log(`Unknown command: ${command}`, 'ERROR');
        log('Use --help to see available commands', 'INFO');
        process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('\nReceived SIGINT, shutting down gracefully...', 'WARNING');
    stopPeriodicSending();

    if (mqttClient) {
        mqttClient.end();
    }

    process.exit(0);
});
