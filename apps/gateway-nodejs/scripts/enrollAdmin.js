const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdmin() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'network', 'connection-manufacturer.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create CA client
        const caInfo = ccp.certificateAuthorities['ca.manufacturer.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if admin already enrolled
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('Admin identity already exists in wallet');
            return;
        }

        // Enroll admin
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'OrgManufacturerMSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user and imported into wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user: ${error}`);
        process.exit(1);
    }
}

enrollAdmin();
