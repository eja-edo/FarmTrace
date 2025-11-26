/**
 * Test peer connectivity and TLS certificates
 */

const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');

console.log('========================================');
console.log('Peer Connection Test');
console.log('========================================\n');

// Load connection profile
const ccpPath = path.join(__dirname, '..', '..', 'network', 'connection-full.json');
const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

console.log('[1] Checking peer configurations...\n');

Object.entries(connectionProfile.peers).forEach(([peerName, peerConfig]) => {
    console.log(`Peer: ${peerName}`);
    console.log(`  URL: ${peerConfig.url}`);
    console.log(`  TLS Cert Path: ${peerConfig.tlsCACerts.path}`);

    // Check if TLS cert exists
    if (fs.existsSync(peerConfig.tlsCACerts.path)) {
        const stats = fs.statSync(peerConfig.tlsCACerts.path);
        console.log(`  ✓ TLS cert exists (${stats.size} bytes)`);
    } else {
        console.log(`  ✗ TLS cert NOT FOUND!`);
    }
    console.log('');
});

console.log('[2] Checking orderer configuration...\n');

if (connectionProfile.orderers) {
    Object.entries(connectionProfile.orderers).forEach(([ordererName, ordererConfig]) => {
        console.log(`Orderer: ${ordererName}`);
        console.log(`  URL: ${ordererConfig.url}`);
        console.log(`  TLS Cert Path: ${ordererConfig.tlsCACerts.path}`);

        if (fs.existsSync(ordererConfig.tlsCACerts.path)) {
            const stats = fs.statSync(ordererConfig.tlsCACerts.path);
            console.log(`  ✓ TLS cert exists (${stats.size} bytes)`);
        } else {
            console.log(`  ✗ TLS cert NOT FOUND!`);
        }
        console.log('');
    });
}

console.log('[3] Testing peer URLs accessibility...\n');

// Test if we can create gRPC connection to peers
const testPeerConnection = (peerName, peerConfig) => {
    return new Promise((resolve) => {
        try {
            const url = peerConfig.url.replace('grpcs://', '').replace('grpc://', '');
            const tlsCert = fs.readFileSync(peerConfig.tlsCACerts.path);
            const sslCreds = grpc.credentials.createSsl(tlsCert);

            console.log(`Testing ${peerName} at ${url}...`);

            // Create a client just to test connection
            const client = new grpc.Client(url, sslCreds, {
                'grpc.ssl_target_name_override': peerConfig.grpcOptions['ssl-target-name-override'],
                'grpc.default_authority': peerConfig.grpcOptions['ssl-target-name-override']
            });

            // Try to connect
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + 5);

            client.waitForReady(deadline, (error) => {
                if (error) {
                    console.log(`  ✗ Connection failed: ${error.message}`);
                    resolve(false);
                } else {
                    console.log(`  ✓ Connection successful`);
                    client.close();
                    resolve(true);
                }
            });
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
            resolve(false);
        }
    });
};

async function testAllPeers() {
    for (const [peerName, peerConfig] of Object.entries(connectionProfile.peers)) {
        await testPeerConnection(peerName, peerConfig);
        console.log('');
    }

    console.log('========================================');
    console.log('Test complete');
    console.log('========================================');
}

testAllPeers().catch(console.error);
