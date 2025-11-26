/**
 * Import Identity from Crypto Material
 * Uses existing Admin@manufacturer certificate and key from network
 */

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importIdentity() {
    try {
        console.log('==============================================');
        console.log('Importing Identity from Crypto Material');
        console.log('==============================================\n');

        // Wallet path
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}\n`);

        // Crypto material paths
        const cryptoPath = path.resolve(__dirname, '..', '..', 'network', 'crypto-config',
            'peerOrganizations', 'manufacturer.example.com', 'users', 'Admin@manufacturer.example.com', 'msp');

        const certPath = path.join(cryptoPath, 'signcerts', 'Admin@manufacturer.example.com-cert.pem');
        const keyPath = fs.readdirSync(path.join(cryptoPath, 'keystore'))[0];
        const keyFullPath = path.join(cryptoPath, 'keystore', keyPath);

        console.log('Certificate path:', certPath);
        console.log('Key path:', keyFullPath);

        // Check if files exist
        if (!fs.existsSync(certPath)) {
            throw new Error(`Certificate not found at: ${certPath}`);
        }
        if (!fs.existsSync(keyFullPath)) {
            throw new Error(`Private key not found at: ${keyFullPath}`);
        }

        // Read certificate and key
        const certificate = fs.readFileSync(certPath, 'utf8');
        const privateKey = fs.readFileSync(keyFullPath, 'utf8');

        console.log('\n✅ Certificate and key loaded successfully');

        // Create identity object
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'OrgManufacturerMSP',
            type: 'X.509',
        };

        // Import appUser
        await wallet.put('appUser', identity);
        console.log('✅ Identity "appUser" imported into wallet');

        // Also import as admin for convenience
        await wallet.put('admin', identity);
        console.log('✅ Identity "admin" imported into wallet');

        console.log('\n==============================================');
        console.log('✅ Identity Import Complete!');
        console.log('==============================================');
        console.log('\nYou can now run: node test-api-simple.js\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

importIdentity();
