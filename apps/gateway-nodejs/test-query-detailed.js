/**
 * Detailed query test with error handling
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('========================================');
        console.log('Detailed Query Test');
        console.log('========================================\n');

        // Load connection profile
        const ccpPath = path.join(__dirname, '..', '..', 'network', 'connection-full.json');
        const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Load wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check identity
        const identity = await wallet.get('manufacturer_user1');
        console.log(`[1] Identity: manufacturer_user1 (${identity.mspId})\n`);

        // Connect gateway
        console.log('[2] Connecting gateway...');
        const gateway = new Gateway();

        await gateway.connect(connectionProfile, {
            wallet,
            identity: 'manufacturer_user1',
            discovery: {
                enabled: false,  // Disabled - use static peer configuration
                asLocalhost: true
            },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: null
            }
        });
        console.log('    ✓ Connected\n');

        // Get network
        console.log('[3] Getting network...');
        const network = await gateway.getNetwork('supplychain-channel');
        console.log('    ✓ Network obtained\n');

        // Get contract
        console.log('[4] Getting contract...');
        const contract = network.getContract('supplychain_cc');
        console.log('    ✓ Contract obtained\n');

        // Test query with detailed error
        console.log('[5] Executing query: GetAllProducts');
        console.log('    Sending request to peer...\n');

        try {
            // Create transaction with specific target peer
            const transaction = contract.createTransaction('GetAllProducts');

            // Set query peer (manufacturer peer since we're using manufacturer identity)
            transaction.setEndorsingPeers(['peer0.manufacturer.example.com']);

            const result = await transaction.evaluate();
            const data = JSON.parse(result.toString());

            console.log('    ✓ Query successful!');
            console.log(`    ✓ Products returned: ${data.length}\n`);

            if (data.length > 0) {
                console.log('    Sample product:');
                const p = data[0];
                console.log(`      ID: ${p.id}`);
                console.log(`      Name: ${p.name}`);
                console.log(`      Status: ${p.status}`);
                console.log(`      Owner: ${p.owner}\n`);
            }

            console.log('========================================');
            console.log('✓ SUCCESS');
            console.log('========================================');

            await gateway.disconnect();
            process.exit(0);

        } catch (queryError) {
            console.log('    ✗ Query failed!\n');
            console.log('Error details:');
            console.log(`  Type: ${queryError.constructor.name}`);
            console.log(`  Message: ${queryError.message}`);

            if (queryError.endorsements) {
                console.log(`\nEndorsement responses (${queryError.endorsements.length}):`);
                queryError.endorsements.forEach((endorsement, i) => {
                    console.log(`\n  [${i + 1}] ${endorsement.peer}:`);
                    console.log(`      Status: ${endorsement.response?.status}`);
                    console.log(`      Message: ${endorsement.response?.message || endorsement.message}`);
                    if (endorsement.response?.payload) {
                        console.log(`      Payload: ${endorsement.response.payload.toString()}`);
                    }
                });
            }

            if (queryError.responses) {
                console.log(`\nQuery responses (${queryError.responses.length}):`);
                queryError.responses.forEach((resp, i) => {
                    console.log(`\n  [${i + 1}]:`);
                    console.log(`      IsEndorsed: ${resp.isEndorsed}`);
                    console.log(`      Status: ${resp.response?.status}`);
                    console.log(`      Message: ${resp.response?.message}`);
                    if (resp.peer) {
                        console.log(`      Peer: ${resp.peer.name || resp.peer}`);
                    }
                });
            }

            if (queryError.cause) {
                console.log('\nCause:');
                console.log(`  ${queryError.cause.message}`);
            }

            throw queryError;
        }

    } catch (error) {
        console.log('\n========================================');
        console.log('✗ ERROR');
        console.log('========================================');
        console.error(error);
        process.exit(1);
    }
}

main();
