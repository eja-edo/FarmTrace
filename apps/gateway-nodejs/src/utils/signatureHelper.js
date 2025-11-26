/**
 * Signature Helper - Auto-generate ECDSA signatures for handover operations
 * Eliminates need for UI to handle cryptographic operations
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('./logger');

/**
 * Generate ECDSA signature using organization's private key
 * @param {string} org - Organization name (manufacturer, shipper, warehouse, retailer)
 * @param {string} userId - User ID (e.g., "user1", "admin")
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Hex-encoded signature (140-144 chars)
 */
function generateSignature(org, userId, message) {
    return new Promise((resolve, reject) => {
        // Map organization to crypto path
        const orgPathMap = {
            'manufacturer': 'manufacturer.example.com',
            'shipper': 'shipper.example.com',
            'warehouse': 'warehouse.example.com',
            'retailer': 'retailer.example.com'
        };

        const orgPath = orgPathMap[org.toLowerCase()];
        if (!orgPath) {
            return reject(new Error(`Unknown organization: ${org}`));
        }

        // IMPORTANT: Use Admin identity because gateway wallets are imported from Admin certificates
        // Gateway connects with fabric using Admin identity from wallet (e.g., "manufacturer_user1" -> Admin@manufacturer.example.com)
        const userPath = `Admin@${orgPath}`;

        // Docker command to generate signature using openssl in fabric-tools container
        // CRITICAL: Use 'echo -n' to NOT add newline to message (would break signature!)
        // Use sed to remove spaces and newlines from hex output
        const dockerCmd = `echo -n '${message}' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgPath}/users/${userPath}/msp/keystore/*_sk | od -A n -t x1 | sed 's/ //g' | sed ':a;N;$!ba;s/\\n//g'`;

        logger.info(`[Signature] Generating for org: ${org}, message: ${message.substring(0, 50)}...`);

        // Execute in Docker fabric-tools container
        const docker = spawn('docker', ['exec', 'fabric-tools', 'bash', '-c', dockerCmd]);

        let stdout = '';
        let stderr = '';

        docker.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        docker.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        docker.on('close', (code) => {
            if (code !== 0) {
                logger.error(`[Signature] Docker command failed: ${stderr}`);
                return reject(new Error(`Signature generation failed: ${stderr}`));
            }

            const signature = stdout.trim();

            // Validate signature format (140-144 hex chars)
            if (!/^[0-9a-f]{140,144}$/i.test(signature)) {
                logger.error(`[Signature] Invalid format. Length: ${signature.length}, First 100 chars: ${signature.substring(0, 100)}`);
                logger.error(`[Signature] Full output: ${signature}`);
                return reject(new Error(`Invalid signature format. Length: ${signature.length}, expected 140-144 hex chars`));
            }

            logger.info(`[Signature] Generated successfully: ${signature.length} chars, signature: ${signature.substring(0, 40)}...`);
            resolve(signature);
        });

        // Timeout after 30 seconds (signature generation can be slow)
        setTimeout(() => {
            docker.kill();
            reject(new Error('Signature generation timeout after 30 seconds'));
        }, 30000);
    });
}

/**
 * Generate handover request signature
 * Message format: "handover-request-{productId}-{targetOrg}"
 */
async function generateHandoverRequestSignature(org, userId, productId, targetOrg) {
    const message = `handover-request-${productId}-${targetOrg}`;
    return generateSignature(org, userId, message);
}

/**
 * Generate handover acceptance signature with nonce
 * Message format: "{handoverId}:{nonce}:{receiverId}"
 */
async function generateHandoverAcceptSignature(org, userId, handoverId, nonce, receiverId) {
    const message = `${handoverId}:${nonce}:${receiverId}`;
    return generateSignature(org, userId, message);
}

/**
 * Generate handover rejection signature with nonce
 * Message format: "{handoverId}:{nonce}:reject"
 */
async function generateHandoverRejectSignature(org, userId, handoverId, nonce) {
    const message = `${handoverId}:${nonce}:reject`;
    return generateSignature(org, userId, message);
}

module.exports = {
    generateSignature,
    generateHandoverRequestSignature,
    generateHandoverAcceptSignature,
    generateHandoverRejectSignature
};
