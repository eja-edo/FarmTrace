/**
 * Basic Fabric Connection Test
 * Tests connection to Fabric network without Gateway API
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('========================================');
        console.log('Fabric Connection Test');
        console.log('========================================\n');

        // 1. Load connection profile
        console.log('[1/6] Loading connection profile...');
        const ccpPath = path.join(__dirname, '..', '..', 'network', 'connection-full.json');
        console.log(`      Path: ${ccpPath}`);

        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at ${ccpPath}`);
        }

        const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log(`      ✓ Loaded: ${connectionProfile.name}`);
        console.log(`      ✓ Organizations: ${Object.keys(connectionProfile.organizations).length}`);
        console.log(`      ✓ Peers: ${Object.keys(connectionProfile.peers).length}`);

        // 2. Load wallet
        console.log('\n[2/6] Loading wallet...');
        const walletPath = path.join(__dirname, 'wallet');
        console.log(`      Path: ${walletPath}`);

        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identities = await wallet.list();
        console.log(`      ✓ Identities found: ${identities.length}`);
        identities.forEach(id => {
            console.log(`        - ${id.label} (${id.mspId})`);
        });

        // 3. Check if identity exists
        console.log('\n[3/6] Checking admin identity...');
        const identity = await wallet.get('admin');
        if (!identity) {
            throw new Error('Identity admin not found in wallet');
        }
        console.log(`      ✓ Identity found: ${identity.mspId}`);
        console.log(`      ✓ Type: ${identity.type}`);

        // 4. Create gateway and connect
        console.log('\n[4/6] Connecting to Fabric network...');
        const gateway = new Gateway();

        await gateway.connect(connectionProfile, {
            wallet,
            identity: 'admin',  // Use admin identity
            discovery: {
                enabled: false,  // Disabled for static configuration
                asLocalhost: true
            }
        });
        console.log('      ✓ Gateway connected');

        // 5. Get network and contract
        console.log('\n[5/6] Getting network and contract...');
        const network = await gateway.getNetwork('supplychain-channel');
        console.log('      ✓ Network obtained: supplychain-channel');

        const contract = network.getContract('supplychain_cc');
        console.log('      ✓ Contract obtained: supplychain_cc');

        // 6. Test query (read-only)
        console.log('\n[6/6] Testing query: GetAllProducts...');
        const result = await contract.evaluateTransaction('GetAllProducts');
        const products = JSON.parse(result.toString());
        console.log(`      ✓ Query successful!`);
        console.log(`      ✓ Products found: ${products.length}`);

        if (products.length > 0) {
            console.log('\n      Sample product:');
            console.log(`        ID: ${products[0].id}`);
            console.log(`        Name: ${products[0].name}`);
            console.log(`        Status: ${products[0].status}`);
            console.log(`        Owner: ${products[0].owner}`);
        }

        // Disconnect
        await gateway.disconnect();
        console.log('\n✓ Gateway disconnected');

        console.log('\n========================================');
        console.log('✓ ALL TESTS PASSED');
        console.log('========================================');
        process.exit(0);

    } catch (error) {
        console.error('\n========================================');
        console.error('✗ ERROR:', error.message);
        console.error('========================================');

        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }

        if (error.endorsements) {
            console.error('\nEndorsement errors:');
            error.endorsements.forEach((e, i) => {
                console.error(`  [${i + 1}] ${e.message}`);
            });
        }

        process.exit(1);
    }
}

main();
