const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function registerUser() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'network', 'connection-manufacturer.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create CA client
        const caURL = ccp.certificateAuthorities['ca.manufacturer.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if user already exists
        const userIdentity = await wallet.get('appUser');
        if (userIdentity) {
            console.log('User identity already exists in wallet');
            return;
        }

        // Check if admin exists
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Admin identity not found in wallet. Please enroll admin first.');
            console.log('Run: node scripts/enrollAdmin.js');
            return;
        }

        // Build user object for authenticating with CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register user
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);

        // Enroll user
        const enrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'OrgManufacturerMSP',
            type: 'X.509',
        };

        await wallet.put('appUser', x509Identity);
        console.log('Successfully registered and enrolled user "appUser" and imported into wallet');

    } catch (error) {
        console.error(`Failed to register user: ${error}`);
        process.exit(1);
    }
}

registerUser();
