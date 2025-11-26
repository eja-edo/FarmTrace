/**
 * Import Identities for All Organizations
 * Creates wallet identities for Manufacturer, Shipper, Warehouse, Retailer
 */

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAllIdentities() {
    try {
        console.log('==============================================');
        console.log('Importing Identities for All Organizations');
        console.log('==============================================\n');

        // Wallet path
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}\n`);

        const orgs = [
            { name: 'manufacturer', mspId: 'OrgManufacturerMSP' },
            { name: 'shipper', mspId: 'OrgShipperMSP' },
            { name: 'warehouse', mspId: 'OrgWarehouseMSP' },
            { name: 'retailer', mspId: 'OrgRetailerMSP' }
        ];

        for (const org of orgs) {
            console.log(`\n--- Importing ${org.name.toUpperCase()} identities ---`);

            const cryptoPath = path.resolve(__dirname, '..', '..', 'network', 'crypto-config',
                'peerOrganizations', `${org.name}.example.com`, 'users',
                `Admin@${org.name}.example.com`, 'msp');

            const certPath = path.join(cryptoPath, 'signcerts',
                `Admin@${org.name}.example.com-cert.pem`);

            const keystorePath = path.join(cryptoPath, 'keystore');

            // Check if paths exist
            if (!fs.existsSync(certPath)) {
                console.log(`❌ Certificate not found: ${certPath}`);
                continue;
            }

            if (!fs.existsSync(keystorePath)) {
                console.log(`❌ Keystore not found: ${keystorePath}`);
                continue;
            }

            const keyFiles = fs.readdirSync(keystorePath);
            if (keyFiles.length === 0) {
                console.log(`❌ No private key found in: ${keystorePath}`);
                continue;
            }

            const keyPath = path.join(keystorePath, keyFiles[0]);

            // Read certificate and key
            const certificate = fs.readFileSync(certPath, 'utf8');
            const privateKey = fs.readFileSync(keyPath, 'utf8');

            // Create identity object
            const identity = {
                credentials: {
                    certificate: certificate,
                    privateKey: privateKey,
                },
                mspId: org.mspId,
                type: 'X.509',
            };

            // Import with multiple naming formats for flexibility
            const userIds = [
                `${org.name}_user1`,     // org_user1 (used by middleware)
                `${org.name}_admin`,     // org_admin
                `appUser_${org.name}`    // appUser_org (alternative format)
            ];

            for (const userId of userIds) {
                await wallet.put(userId, identity);
                console.log(`✅ Imported: ${userId} (${org.mspId})`);
            }
        }

        console.log('\n==============================================');
        console.log('✅ All Identities Imported Successfully!');
        console.log('==============================================');
        console.log('\nAvailable identities:');
        console.log('  manufacturer_user1 → OrgManufacturerMSP');
        console.log('  shipper_user1      → OrgShipperMSP');
        console.log('  warehouse_user1    → OrgWarehouseMSP');
        console.log('  retailer_user1     → OrgRetailerMSP');
        console.log('\nYou can now use X-User-Identity header:');
        console.log('  manufacturer:user1');
        console.log('  shipper:user1');
        console.log('  warehouse:user1');
        console.log('  retailer:user1');
        console.log('');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

importAllIdentities();
