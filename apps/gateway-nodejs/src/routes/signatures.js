/**
 * Signature Generation Routes (V2 API)
 * Provides backend signature generation for better UX
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

/**
 * @route   POST /api/v2/signatures/generate
 * @desc    Generate ECDSA signature using organization's private key
 * @access  Requires X-User-Identity header
 */
router.post('/generate', async (req, res) => {
    try {
        const { handoverId, receiverId } = req.body;
        const userIdentity = req.headers['x-user-identity'];

        // Validate request
        if (!userIdentity) {
            return res.status(401).json({
                success: false,
                error: 'Missing X-User-Identity header'
            });
        }

        if (!handoverId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: handoverId'
            });
        }

        // Parse organization from X-User-Identity (format: "org:user")
        const [org] = userIdentity.split(':');
        if (!org) {
            return res.status(400).json({
                success: false,
                error: 'Invalid X-User-Identity format. Expected: "org:userId"'
            });
        }

        // Get handover to extract nonce
        const { fabricClient } = require('../fabricClient');
        const handoverData = await fabricClient.query(
            org,
            'supplychain-channel',
            'supplychain_cc',
            'GetHandover',
            [handoverId]
        );

        if (!handoverData || !handoverData.nonce) {
            return res.status(404).json({
                success: false,
                error: 'Handover not found or missing nonce'
            });
        }

        // Construct message: handoverId:nonce:receiverId
        const message = `${handoverId}:${handoverData.nonce}:${receiverId || 'UNKNOWN'}`;

        // Generate signature using PowerShell script
        const scriptPath = path.join(__dirname, '../../../..', 'scripts', 'generate-signature-docker.ps1');

        const signature = await generateSignatureViaPowerShell(org, message, scriptPath);

        res.json({
            success: true,
            data: {
                signature,
                message,
                handoverId,
                nonce: handoverData.nonce,
                receiverId: receiverId || 'UNKNOWN',
                organization: org
            }
        });

    } catch (error) {
        console.error('Signature generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate signature'
        });
    }
});

/**
 * Generate signature by calling PowerShell script
 */
function generateSignatureViaPowerShell(org, message, scriptPath) {
    return new Promise((resolve, reject) => {
        // Call PowerShell script with organization and message
        const powershell = spawn('powershell.exe', [
            '-ExecutionPolicy', 'Bypass',
            '-File', scriptPath,
            '-Org', org,
            '-Message', message
        ]);

        let stdout = '';
        let stderr = '';

        powershell.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        powershell.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        powershell.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`PowerShell script failed: ${stderr}`));
            }

            // Extract signature from output (140-char hex string)
            const signatureMatch = stdout.match(/[0-9a-f]{140}/i);
            if (!signatureMatch) {
                return reject(new Error('Failed to extract signature from script output'));
            }

            resolve(signatureMatch[0]);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            powershell.kill();
            reject(new Error('Signature generation timeout'));
        }, 30000);
    });
}

/**
 * @route   POST /api/v2/signatures/verify
 * @desc    Verify signature format (basic validation)
 * @access  Public
 */
router.post('/verify', (req, res) => {
    try {
        const { signature } = req.body;

        if (!signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing signature'
            });
        }

        // Basic validation
        const isValid = /^[0-9a-f]{140}$/i.test(signature);
        const length = signature.length;

        res.json({
            success: true,
            data: {
                isValid,
                length,
                expectedLength: 140,
                format: isValid ? 'Valid ECDSA-SHA256 ASN.1 DER hex' : 'Invalid format'
            }
        });

    } catch (error) {
        console.error('Signature verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify signature'
        });
    }
});

module.exports = router;
