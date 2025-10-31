/**
 * Performance & Load Testing Script
 * Tests API performance, throughput, and concurrent request handling
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

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

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'cyan');
    console.log('='.repeat(70));
}

class PerformanceMetrics {
    constructor() {
        this.requests = [];
        this.errors = [];
        this.statusCodes = {};
    }

    addRequest(duration, status, error = null) {
        this.requests.push({ duration, status, error, timestamp: Date.now() });

        if (error) {
            this.errors.push({ error, status, timestamp: Date.now() });
        }

        this.statusCodes[status] = (this.statusCodes[status] || 0) + 1;
    }

    getStats() {
        const durations = this.requests.map(r => r.duration).sort((a, b) => a - b);
        const successfulRequests = this.requests.filter(r => r.status >= 200 && r.status < 300);

        return {
            totalRequests: this.requests.length,
            successfulRequests: successfulRequests.length,
            failedRequests: this.requests.length - successfulRequests.length,
            errorCount: this.errors.length,
            successRate: ((successfulRequests.length / this.requests.length) * 100).toFixed(2),
            statusCodes: this.statusCodes,
            latency: {
                min: Math.min(...durations).toFixed(2),
                max: Math.max(...durations).toFixed(2),
                avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
                median: durations[Math.floor(durations.length / 2)]?.toFixed(2) || 0,
                p95: durations[Math.floor(durations.length * 0.95)]?.toFixed(2) || 0,
                p99: durations[Math.floor(durations.length * 0.99)]?.toFixed(2) || 0
            }
        };
    }

    displayStats() {
        const stats = this.getStats();

        logSection('PERFORMANCE STATISTICS');

        log('\n📊 Request Summary:', 'cyan');
        log(`  Total Requests:      ${stats.totalRequests}`, 'blue');
        log(`  Successful:          ${stats.successfulRequests} (${stats.successRate}%)`, 'green');
        log(`  Failed:              ${stats.failedRequests}`, stats.failedRequests > 0 ? 'red' : 'blue');
        log(`  Errors:              ${stats.errorCount}`, stats.errorCount > 0 ? 'red' : 'blue');

        log('\n⏱️  Latency (ms):', 'cyan');
        log(`  Min:                 ${stats.latency.min}`, 'blue');
        log(`  Max:                 ${stats.latency.max}`, 'blue');
        log(`  Average:             ${stats.latency.avg}`, 'blue');
        log(`  Median:              ${stats.latency.median}`, 'blue');
        log(`  95th Percentile:     ${stats.latency.p95}`, 'blue');
        log(`  99th Percentile:     ${stats.latency.p99}`, 'blue');

        log('\n📈 HTTP Status Codes:', 'cyan');
        Object.entries(stats.statusCodes).sort().forEach(([code, count]) => {
            const color = code >= 200 && code < 300 ? 'green' : code >= 400 ? 'red' : 'yellow';
            log(`  ${code}: ${count} requests`, color);
        });

        if (this.errors.length > 0) {
            log('\n❌ Errors:', 'red');
            const errorSummary = {};
            this.errors.forEach(e => {
                const msg = e.error?.message || e.error || 'Unknown error';
                errorSummary[msg] = (errorSummary[msg] || 0) + 1;
            });
            Object.entries(errorSummary).forEach(([msg, count]) => {
                log(`  ${msg}: ${count}`, 'red');
            });
        }
    }
}

async function apiRequest(method, endpoint, body = null, useAuth = true) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };

    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const startTime = performance.now();

    try {
        const response = await fetch(url, options);
        const duration = performance.now() - startTime;

        let data = null;
        try {
            data = await response.json();
        } catch (e) {
            // Response may not be JSON
        }

        return {
            status: response.status,
            ok: response.ok,
            data,
            duration,
            error: null
        };
    } catch (error) {
        const duration = performance.now() - startTime;
        return {
            status: 0,
            ok: false,
            data: null,
            duration,
            error: error.message
        };
    }
}

async function login() {
    log('\n🔐 Authenticating...', 'yellow');

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
        log('✅ Authentication successful\n', 'green');
        return true;
    } else {
        log('❌ Authentication failed\n', 'red');
        return false;
    }
}

async function testEndpointLatency(endpoint, method = 'GET', body = null, iterations = 100) {
    logSection(`LATENCY TEST: ${method} ${endpoint}`);
    log(`Running ${iterations} iterations...\n`, 'yellow');

    const metrics = new PerformanceMetrics();
    const progressInterval = Math.max(1, Math.floor(iterations / 10));

    for (let i = 0; i < iterations; i++) {
        const result = await apiRequest(method, endpoint, body);
        metrics.addRequest(result.duration, result.status, result.error);

        if ((i + 1) % progressInterval === 0) {
            process.stdout.write(`\r⏳ Progress: ${i + 1}/${iterations} (${((i + 1) / iterations * 100).toFixed(0)}%)`);
        }
    }

    console.log('\n');
    metrics.displayStats();
}

async function testConcurrentRequests(endpoint, method = 'GET', body = null, concurrency = 50) {
    logSection(`CONCURRENT REQUESTS TEST: ${method} ${endpoint}`);
    log(`Sending ${concurrency} concurrent requests...\n`, 'yellow');

    const metrics = new PerformanceMetrics();
    const startTime = performance.now();

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
        promises.push(apiRequest(method, endpoint, body));
    }

    const results = await Promise.all(promises);
    const totalDuration = performance.now() - startTime;

    results.forEach(result => {
        metrics.addRequest(result.duration, result.status, result.error);
    });

    metrics.displayStats();

    log('\n⚡ Throughput:', 'cyan');
    log(`  Total Time:          ${totalDuration.toFixed(2)} ms`, 'blue');
    log(`  Requests/Second:     ${(concurrency / (totalDuration / 1000)).toFixed(2)}`, 'blue');
}

async function testRateLimiting() {
    logSection('RATE LIMITING TEST');
    log('Testing rate limits by sending rapid requests...\n', 'yellow');

    const metrics = new PerformanceMetrics();
    const requests = 150; // Should exceed rate limit

    log(`Sending ${requests} rapid requests to /health...\n`, 'yellow');

    for (let i = 0; i < requests; i++) {
        const result = await apiRequest('GET', '/health', null, false);
        metrics.addRequest(result.duration, result.status, result.error);

        if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r⏳ Progress: ${i + 1}/${requests}`);
        }
    }

    console.log('\n');
    metrics.displayStats();

    const rateLimitedCount = metrics.statusCodes[429] || 0;
    if (rateLimitedCount > 0) {
        log(`\n✅ Rate limiting is working: ${rateLimitedCount} requests blocked`, 'green');
    } else {
        log('\n⚠️  Rate limiting may not be working as expected', 'yellow');
    }
}

async function testDatabasePerformance() {
    logSection('DATABASE QUERY PERFORMANCE TEST');

    // Test pagination with different page sizes
    const pageSizes = [10, 50, 100];

    for (const pageSize of pageSizes) {
        log(`\n📄 Testing pagination with limit=${pageSize}`, 'cyan');

        const metrics = new PerformanceMetrics();
        const iterations = 20;

        for (let i = 0; i < iterations; i++) {
            const result = await apiRequest('GET', `/device/1/sensors?type=temperature&limit=${pageSize}&page=1`);
            metrics.addRequest(result.duration, result.status, result.error);
        }

        const stats = metrics.getStats();
        log(`  Average latency: ${stats.latency.avg} ms`, 'blue');
        log(`  95th percentile: ${stats.latency.p95} ms`, 'blue');
    }
}

async function testAnalyticsPerformance() {
    logSection('ANALYTICS ENDPOINTS PERFORMANCE TEST');

    const endpoints = [
        { name: 'Dashboard Overview', url: '/analytics/dashboard' },
        { name: 'Device Stats', url: '/analytics/devices' },
        { name: 'Alert Stats', url: '/analytics/alerts' },
        { name: 'Shipment Stats', url: '/analytics/shipments' }
    ];

    for (const endpoint of endpoints) {
        log(`\n📊 Testing ${endpoint.name}`, 'cyan');

        const metrics = new PerformanceMetrics();
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
            const result = await apiRequest('GET', endpoint.url);
            metrics.addRequest(result.duration, result.status, result.error);
        }

        const stats = metrics.getStats();
        log(`  Average latency: ${stats.latency.avg} ms`, 'blue');
        log(`  95th percentile: ${stats.latency.p95} ms`, 'blue');
        log(`  Success rate: ${stats.successRate}%`, stats.successRate >= 95 ? 'green' : 'red');
    }
}

async function testDataIngestionLoad() {
    logSection('IOT DATA INGESTION LOAD TEST');
    log('Simulating multiple devices sending data simultaneously...\n', 'yellow');

    const devices = 10;
    const messagesPerDevice = 20;
    const totalMessages = devices * messagesPerDevice;

    log(`Devices: ${devices}`, 'blue');
    log(`Messages per device: ${messagesPerDevice}`, 'blue');
    log(`Total messages: ${totalMessages}\n`, 'blue');

    const metrics = new PerformanceMetrics();
    const startTime = performance.now();

    const promises = [];

    for (let d = 0; d < devices; d++) {
        const deviceId = `TEST-DEVICE-${d.toString().padStart(3, '0')}`;

        for (let m = 0; m < messagesPerDevice; m++) {
            const data = {
                deviceId,
                timestamp: new Date().toISOString(),
                temperature: 20 + Math.random() * 15,
                humidity: 50 + Math.random() * 30,
                vibration: Math.random() * 1.5,
                gps: {
                    latitude: 10.762622 + (Math.random() - 0.5) * 0.1,
                    longitude: 106.660172 + (Math.random() - 0.5) * 0.1,
                    speed: Math.random() * 80
                }
            };

            promises.push(apiRequest('POST', '/iot/data', data, false));
        }
    }

    const results = await Promise.all(promises);
    const totalDuration = performance.now() - startTime;

    results.forEach(result => {
        metrics.addRequest(result.duration, result.status, result.error);
    });

    metrics.displayStats();

    log('\n📈 Ingestion Performance:', 'cyan');
    log(`  Total Time:          ${(totalDuration / 1000).toFixed(2)} seconds`, 'blue');
    log(`  Messages/Second:     ${(totalMessages / (totalDuration / 1000)).toFixed(2)}`, 'blue');
    log(`  Avg Time/Message:    ${(totalDuration / totalMessages).toFixed(2)} ms`, 'blue');
}

async function runFullPerformanceTest() {
    log('\n🚀 Starting Full Performance Test Suite', 'magenta');
    log('='.repeat(70), 'cyan');

    if (!await login()) {
        process.exit(1);
    }

    // Test 1: Basic endpoint latency
    await testEndpointLatency('/health', 'GET', null, 100);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Authenticated endpoint latency
    await testEndpointLatency('/device', 'GET', null, 50);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Concurrent requests
    await testConcurrentRequests('/analytics/devices', 'GET', null, 30);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Rate limiting
    await testRateLimiting();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 5: Database performance
    await testDatabasePerformance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Analytics performance
    await testAnalyticsPerformance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 7: Data ingestion load
    await testDataIngestionLoad();

    logSection('PERFORMANCE TEST SUITE COMPLETED');
    log('✅ All performance tests completed successfully!', 'green');
}

async function quickPerformanceTest() {
    log('\n⚡ Quick Performance Test', 'magenta');

    if (!await login()) process.exit(1);

    await testEndpointLatency('/health', 'GET', null, 50);
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testConcurrentRequests('/analytics/devices', 'GET', null, 20);

    log('\n✅ Quick test completed!', 'green');
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'full';

switch (command) {
    case 'full':
        runFullPerformanceTest();
        break;
    case 'quick':
        quickPerformanceTest();
        break;
    case 'latency':
        login().then(() => {
            const endpoint = args[1] || '/health';
            const iterations = parseInt(args[2]) || 100;
            testEndpointLatency(endpoint, 'GET', null, iterations);
        });
        break;
    case 'concurrent':
        login().then(() => {
            const endpoint = args[1] || '/analytics/devices';
            const concurrency = parseInt(args[2]) || 50;
            testConcurrentRequests(endpoint, 'GET', null, concurrency);
        });
        break;
    case 'ratelimit':
        testRateLimiting();
        break;
    case 'ingestion':
        testDataIngestionLoad();
        break;
    case '--help':
    case '-h':
        console.log(`
Performance & Load Testing Script
==================================

Usage: node test-performance.js [command] [options]

Commands:
  full                    Run complete performance test suite (default)
  quick                   Quick performance test (reduced iterations)
  latency [endpoint] [n]  Test latency for specific endpoint (n iterations)
  concurrent [endpoint] [n] Test concurrent requests (n requests)
  ratelimit               Test rate limiting
  ingestion               Test IoT data ingestion load

Environment Variables:
  API_URL                 Backend API URL (default: http://localhost:3000)

Examples:
  node test-performance.js
  node test-performance.js full
  node test-performance.js quick
  node test-performance.js latency /analytics/dashboard 50
  node test-performance.js concurrent /device 100
  node test-performance.js ratelimit
  node test-performance.js ingestion

Metrics:
  - Latency (min, max, avg, median, p95, p99)
  - Success rate
  - Throughput (requests/second)
  - Error rates by type
  - HTTP status code distribution
    `);
        break;
    default:
        log(`❌ Unknown command: ${command}`, 'red');
        log('Use --help to see available commands', 'yellow');
        process.exit(1);
}
