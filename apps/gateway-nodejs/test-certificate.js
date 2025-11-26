/**
 * Test certificate and signature validation
 */

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
    console.log('========================================');
    console.log('Certificate & Signature Test');
    console.log('========================================\n');

    // 1. Load wallet
    console.log('[1] Loading wallet...');
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identities = await wallet.list();
    console.log(`    Found ${identities.length} identities:\n`);

    for (const id of identities) {
        console.log(`    - ${id.label}`);
        const identity = await wallet.get(id.label);
        if (identity) {
            console.log(`      Type: ${identity.type}`);
            console.log(`      MSP: ${identity.mspId}`);

            // Check certificate
            if (identity.credentials && identity.credentials.certificate) {
                const cert = identity.credentials.certificate;
                console.log(`      Certificate length: ${cert.length} chars`);

                // Extract certificate info
                const certLines = cert.split('\n');
                console.log(`      First line: ${certLines[0]}`);
                console.log(`      Last line: ${certLines[certLines.length - 2]}`);

                // Check if certificate is PEM format
                if (cert.includes('BEGIN CERTIFICATE')) {
                    console.log(`      ✓ Valid PEM format`);
                } else {
                    console.log(`      ✗ NOT PEM format!`);
                }
            }

            // Check private key
            if (identity.credentials && identity.credentials.privateKey) {
                const key = identity.credentials.privateKey;
                console.log(`      Private key length: ${key.length} chars`);

                if (key.includes('BEGIN PRIVATE KEY')) {
                    console.log(`      ✓ Valid private key format`);
                } else {
                    console.log(`      ✗ NOT valid private key format!`);
                }
            }

            console.log('');
        }
    }

    // 2. Test specific identity
    console.log('[2] Testing manufacturer_user1 in detail...\n');
    const identity = await wallet.get('manufacturer_user1');

    if (!identity) {
        console.log('    ✗ Identity not found!');
        process.exit(1);
    }

    console.log(`    MSP ID: ${identity.mspId}`);
    console.log(`    Type: ${identity.type}`);

    // Extract and verify certificate
    const cert = identity.credentials.certificate;
    const privateKey = identity.credentials.privateKey;

    console.log('\n[3] Certificate Details:');

    try {
        // Parse certificate
        const certBuffer = Buffer.from(cert);
        const x509 = crypto.X509Certificate ? new crypto.X509Certificate(certBuffer) : null;

        if (x509) {
            console.log(`    Subject: ${x509.subject}`);
            console.log(`    Issuer: ${x509.issuer}`);
            console.log(`    Valid from: ${x509.validFrom}`);
            console.log(`    Valid to: ${x509.validTo}`);

            // Check if certificate is expired
            const now = new Date();
            const validTo = new Date(x509.validTo);

            if (now > validTo) {
                console.log(`    ✗ Certificate EXPIRED!`);
            } else {
                console.log(`    ✓ Certificate is valid`);
            }
        } else {
            console.log('    (crypto.X509Certificate not available in this Node version)');
        }
    } catch (error) {
        console.log(`    Error parsing certificate: ${error.message}`);
    }

    // 3. Test signing capability
    console.log('\n[4] Testing signing capability...\n');

    try {
        // Create test data
        const testData = 'Hello Fabric Network';

        // Create signature
        const sign = crypto.createSign('SHA256');
        sign.update(testData);
        sign.end();

        const signature = sign.sign(privateKey);
        console.log(`    ✓ Successfully created signature (${signature.length} bytes)`);

        // Verify signature
        const verify = crypto.createVerify('SHA256');
        verify.update(testData);
        verify.end();

        const isValid = verify.verify(cert, signature);

        if (isValid) {
            console.log(`    ✓ Signature verification PASSED`);
        } else {
            console.log(`    ✗ Signature verification FAILED`);
        }

    } catch (error) {
        console.log(`    ✗ Error testing signature: ${error.message}`);
    }

    // 4. Check crypto config files
    console.log('\n[5] Checking crypto-config files...\n');

    const cryptoBase = path.join(__dirname, '..', '..', 'network', 'crypto-config',
        'peerOrganizations', 'manufacturer.example.com', 'users', 'User1@manufacturer.example.com');

    const msrPath = path.join(cryptoBase, 'msp');
    console.log(`    MSP path: ${msrPath}`);

    if (fs.existsSync(msrPath)) {
        console.log(`    ✓ MSP directory exists`);

        // Check signcerts
        const signCertsPath = path.join(msrPath, 'signcerts');
        if (fs.existsSync(signCertsPath)) {
            const files = fs.readdirSync(signCertsPath);
            console.log(`    ✓ signcerts directory exists (${files.length} files)`);
            files.forEach(f => console.log(`      - ${f}`));
        }

        // Check keystore
        const keystorePath = path.join(msrPath, 'keystore');
        if (fs.existsSync(keystorePath)) {
            const files = fs.readdirSync(keystorePath);
            console.log(`    ✓ keystore directory exists (${files.length} files)`);
            files.forEach(f => console.log(`      - ${f}`));
        }
    } else {
        console.log(`    ✗ MSP directory NOT found`);
    }

    console.log('\n========================================');
    console.log('Certificate test complete');
    console.log('========================================');
}

main().catch(error => {
    console.error('\n✗ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
});
