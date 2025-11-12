const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importIdentity() {
    try {
        // Wallet path
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if identity already exists
        const identity = await wallet.get('appUser');
        if (identity) {
            console.log('Identity appUser already exists in wallet');
            return;
        }

        // Path to crypto material
        const credPath = path.join(__dirname, '..', '..', '..', 'network', 'crypto-config',
            'peerOrganizations', 'manufacturer.example.com', 'users', 'User1@manufacturer.example.com');

        const certificate = fs.readFileSync(path.join(credPath, 'msp', 'signcerts', 'User1@manufacturer.example.com-cert.pem')).toString();
        const privateKey = fs.readFileSync(path.join(credPath, 'msp', 'keystore', 'priv_sk')).toString();

        const x509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'OrgManufacturerMSP',
            type: 'X.509',
        };

        await wallet.put('appUser', x509Identity);
        console.log('Successfully imported appUser identity into wallet');

    } catch (error) {
        console.error(`Failed to import identity: ${error}`);
        process.exit(1);
    }
}

importIdentity();
