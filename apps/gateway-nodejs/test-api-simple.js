/**
 * Simple API Test - Get Product by ID
 * Tests connection to blockchain via Gateway API
 */

const fabricClient = require('./src/utils/fabricClient');
const logger = require('./src/utils/logger');

const CHANNEL_NAME = 'supplychain-channel';
const CHAINCODE_NAME = 'supplychain_cc';

async function testGetProduct() {
    try {
        console.log('==============================================');
        console.log('API Gateway Connection Test');
        console.log('==============================================\n');

        // Step 1: Initialize Fabric Client
        console.log('Step 1: Initializing Fabric Client...');
        await fabricClient.initialize();
        console.log('✅ Fabric Client initialized\n');

        // Step 2: Connect to network
        console.log('Step 2: Connecting to blockchain network...');
        await fabricClient.connect('appUser');
        console.log('✅ Connected to network\n');

        // Step 3: Get current MSP
        console.log('Step 3: Checking MSP identity...');
        const mspId = await fabricClient.getCurrentMSP();
        console.log(`✅ Connected as: ${mspId}\n`);

        // Step 4: Query all products first
        console.log('Step 4: Querying all products...');
        const allProductsResult = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetAllProducts'
        );

        const allProducts = JSON.parse(allProductsResult);
        console.log(`✅ Found ${allProducts.length} products\n`);

        if (allProducts.length === 0) {
            console.log('⚠️  No products found in blockchain');
            console.log('Run test-complete-workflow.sh first to create test data');
            await fabricClient.disconnect();
            return;
        }

        // Step 5: Get first product details
        const firstProduct = allProducts[0];
        console.log(`Step 5: Fetching product details for: ${firstProduct.id}`);

        const productResult = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetProduct',
            firstProduct.id
        );

        const product = JSON.parse(productResult);

        console.log('✅ Product Details Retrieved:\n');
        console.log('─────────────────────────────────────────────');
        console.log(`Product ID:        ${product.id}`);
        console.log(`Name:              ${product.name}`);
        console.log(`Batch:             ${product.batch}`);
        console.log(`Origin:            ${product.origin}`);
        console.log(`Status:            ${product.status}`);
        console.log(`Owner:             ${product.owner}`);
        console.log(`Current Holder:    ${product.currentHolder}`);
        console.log(`Manufacture Date:  ${product.manufactureDate}`);
        console.log(`Version:           ${product.version}`);
        console.log(`Created At:        ${product.createdAt}`);
        console.log(`Updated At:        ${product.updatedAt}`);

        if (product.approvals && product.approvals.length > 0) {
            console.log(`\nApprovals: ${product.approvals.length} records`);
            product.approvals.forEach((approval, idx) => {
                console.log(`  ${idx + 1}. ${approval.action} by ${approval.actor} (${approval.actorMsp})`);
                console.log(`     Timestamp: ${approval.timestamp}`);
            });
        }
        console.log('─────────────────────────────────────────────\n');

        // Step 6: Get product history
        console.log(`Step 6: Fetching product history for: ${firstProduct.id}`);
        const historyResult = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetProductHistory',
            firstProduct.id
        );

        const history = JSON.parse(historyResult);
        console.log(`✅ Found ${history.length} historical records\n`);

        if (history.length > 0) {
            console.log('Transaction History:');
            console.log('─────────────────────────────────────────────');
            history.forEach((record, idx) => {
                console.log(`${idx + 1}. TxID: ${record.txId.substring(0, 16)}...`);
                console.log(`   Timestamp: ${record.timestamp}`);
                if (record.value) {
                    console.log(`   Status: ${record.value.status || 'N/A'}`);
                    console.log(`   Owner: ${record.value.owner || 'N/A'}`);
                    console.log(`   Version: ${record.value.version || 'N/A'}`);
                } else if (record.isDelete) {
                    console.log(`   Action: DELETED`);
                } else {
                    console.log(`   Data: ${JSON.stringify(record).substring(0, 80)}...`);
                }
                console.log('');
            });
            console.log('─────────────────────────────────────────────\n');
        }

        // Step 7: Disconnect
        console.log('Step 7: Disconnecting...');
        await fabricClient.disconnect();
        console.log('✅ Disconnected\n');

        console.log('==============================================');
        console.log('✅ ✅ ✅  ALL TESTS PASSED  ✅ ✅ ✅');
        console.log('==============================================');
        console.log('\nAPI Gateway successfully connected to blockchain!');
        console.log('Ready to serve REST API requests.\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nDetails:', error);

        if (error.message.includes('Identity')) {
            console.error('\n💡 FIX: Run identity enrollment first:');
            console.error('   cd apps/gateway-nodejs');
            console.error('   npm run enroll-admin');
            console.error('   npm run register-user');
        }

        if (error.message.includes('Connection profile')) {
            console.error('\n💡 FIX: Ensure connection profile exists:');
            console.error('   network/connection-manufacturer.json');
        }

        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n💡 FIX: Ensure blockchain network is running:');
            console.error('   docker ps | grep peer0.manufacturer');
        }

        await fabricClient.disconnect();
        process.exit(1);
    }
}

// Run test
testGetProduct();
