/**
 * Import admin identity from crypto-config to wallet
 */

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('\n========================================');
        console.log('Import Admin Identity');
        console.log('========================================\n');

        // Wallet path
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already exists
        const adminExists = await wallet.get('admin');
        if (adminExists) {
            console.log('✓ Admin identity already exists in wallet');
            return;
        }

        // Path to admin MSP in crypto-config
        const orgName = 'manufacturer';
        const adminMSPPath = path.join(__dirname, '..', '..', '..', 'network', 'crypto-config',
            'peerOrganizations', `${orgName}.example.com`, 'users', `Admin@${orgName}.example.com`, 'msp');

        console.log(`[1] Reading admin certificate and key from crypto-config...`);
        console.log(`    Path: ${adminMSPPath}\n`);

        // Read certificate
        const certPath = path.join(adminMSPPath, 'signcerts');
        const certFiles = fs.readdirSync(certPath);
        if (certFiles.length === 0) {
            throw new Error('No certificate found in signcerts directory');
        }
        const certificate = fs.readFileSync(path.join(certPath, certFiles[0]), 'utf8');
        console.log(`    ✓ Certificate loaded (${certificate.length} chars)`);

        // Read private key
        const keyPath = path.join(adminMSPPath, 'keystore');
        const keyFiles = fs.readdirSync(keyPath);
        if (keyFiles.length === 0) {
            throw new Error('No private key found in keystore directory');
        }
        const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');
        console.log(`    ✓ Private key loaded (${privateKey.length} chars)\n`);

        // Create identity
        const identity = {
            credentials: {
                certificate,
                privateKey
            },
            mspId: 'OrgManufacturerMSP',
            type: 'X.509'
        };

        console.log(`[2] Storing admin identity in wallet...`);
        await wallet.put('admin', identity);
        console.log(`    ✓ Admin identity stored\n`);

        console.log('========================================');
        console.log('✓ SUCCESS - Admin identity imported');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
