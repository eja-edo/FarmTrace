const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        console.log('1. Loading connection profile...');
        const ccpPath = path.join(__dirname, '..', '..', 'network', 'connection-manufacturer.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('   ✓ Connection profile loaded');

        console.log('\n2. Creating wallet...');
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`   ✓ Wallet created at ${walletPath}`);

        console.log('\n3. Checking identity...');
        const identity = await wallet.get('appUser');
        if (!identity) {
            throw new Error('Identity appUser not found in wallet');
        }
        console.log('   ✓ Identity found');

        console.log('\n4. Connecting to gateway...');
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet: wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('   ✓ Connected to gateway');

        console.log('\n5. Getting network...');
        const network = await gateway.getNetwork('supplychain-channel');
        console.log('   ✓ Network obtained');

        console.log('\n6. Getting contract...');
        const contract = network.getContract('supplychain_cc');
        console.log('   ✓ Contract obtained');

        console.log('\n7. Querying chaincode...');
        const result = await contract.evaluateTransaction('GetAllProducts');
        console.log('   ✓ Query successful');
        console.log(`   Result: ${result.toString()}`);

        await gateway.disconnect();
        console.log('\n✓ All tests passed!');
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
