/**
 * MSP Validation Middleware
 * Validates that the caller's MSP ID matches expected organization
 * 
 * Security Model:
 * - Layer 1: Fabric Framework automatically verifies X.509 certificate + ECDSA signature
 * - Layer 2: This middleware checks MSP ID from validated certificate
 * - All authorization decisions based on cryptographically-verified MSP ID
 */

const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');

/**
 * MSP ID mapping (from network/configtx.yaml)
 */
const MSP_IDS = {
    manufacturer: 'OrgManufacturerMSP',
    shipper: 'OrgShipperMSP',
    warehouse: 'OrgWarehouseMSP',
    retailer: 'OrgRetailerMSP'
};

/**
 * Extract organization identifier from request headers
 * 
 * Header format: X-User-Identity: "org:userId"
 * Example: "manufacturer:user1"
 */
const extractUserIdentity = (req) => {
    const userIdentity = req.headers['x-user-identity'];

    if (!userIdentity) {
        throw new Error('Missing X-User-Identity header');
    }

    // Parse "org:userId" format
    const parts = userIdentity.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid X-User-Identity format. Expected: "org:userId"');
    }

    const [org, userId] = parts;

    // Validate organization
    const validOrgs = Object.keys(MSP_IDS);
    if (!validOrgs.includes(org.toLowerCase())) {
        throw new Error(`Invalid organization: ${org}. Valid: ${validOrgs.join(', ')}`);
    }

    return {
        org: org.toLowerCase(),
        userId,
        mspId: MSP_IDS[org.toLowerCase()]
    };
};

/**
 * Middleware: Require specific MSP ID(s)
 * 
 * Usage:
 *   router.post('/products', requireMSP('manufacturer'), async (req, res) => {...})
 *   router.post('/handovers/:id/accept', requireMSP(['shipper', 'warehouse', 'retailer']), ...)
 * 
 * @param {string|string[]} allowedOrgs - Organization(s) allowed to access endpoint
 * @returns Express middleware function
 */
const requireMSP = (allowedOrgs) => {
    // Normalize to array
    const orgsArray = Array.isArray(allowedOrgs) ? allowedOrgs : [allowedOrgs];
    const allowedMSPs = orgsArray.map(org => MSP_IDS[org.toLowerCase()]);

    return async (req, res, next) => {
        try {
            // Extract user identity from header
            const userIdentity = extractUserIdentity(req);

            logger.info(`[MSP] Request from ${userIdentity.org}:${userIdentity.userId} (${userIdentity.mspId})`);

            // Check if MSP is allowed
            if (!allowedMSPs.includes(userIdentity.mspId)) {
                logger.warn(`[MSP] Unauthorized: ${userIdentity.mspId} not in allowed list: ${allowedMSPs.join(', ')}`);
                return res.status(403).json({
                    success: false,
                    error: `Unauthorized: Only ${orgsArray.join(', ')} can access this endpoint`,
                    details: {
                        yourOrg: userIdentity.org,
                        yourMSP: userIdentity.mspId,
                        allowedOrgs: orgsArray,
                        allowedMSPs
                    }
                });
            }

            // Attach identity to request for downstream use
            req.userIdentity = userIdentity;

            // Connect Fabric client with correct user identity
            // Try specific user first, fallback to appUser
            try {
                const walletUserId = `${userIdentity.org}_${userIdentity.userId}`;
                await fabricClient.connect(walletUserId);
            } catch (error) {
                // Fallback to default appUser (works for all operations)
                logger.info(`[MSP] User ${userIdentity.org}_${userIdentity.userId} not in wallet, using appUser`);
                await fabricClient.connect('appUser');
            }

            // Verify MSP matches (double-check against certificate)
            const actualMSP = await fabricClient.getCurrentMSP();
            if (actualMSP !== userIdentity.mspId) {
                logger.error(`[MSP] MSP mismatch! Header: ${userIdentity.mspId}, Certificate: ${actualMSP}`);
                return res.status(403).json({
                    success: false,
                    error: 'MSP ID mismatch between header and certificate',
                    details: {
                        headerMSP: userIdentity.mspId,
                        certificateMSP: actualMSP,
                        hint: 'appUser identity is from OrgManufacturerMSP. For other orgs, import their identities to wallet.'
                    }
                });
            }

            logger.info(`[MSP] Authorized: ${userIdentity.mspId} ✓`);
            next();

        } catch (error) {
            logger.error('[MSP] Validation error:', error);

            if (error.message.includes('Missing') || error.message.includes('Invalid')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    hint: 'Set X-User-Identity header: "org:userId" (e.g., "manufacturer:user1")'
                });
            }

            res.status(500).json({
                success: false,
                error: 'MSP validation failed',
                details: error.message
            });
        }
    };
};

/**
 * Middleware: Optional MSP validation (logs identity but doesn't enforce)
 * Used for read-only endpoints accessible by all organizations
 */
const optionalMSP = async (req, res, next) => {
    try {
        const userIdentity = extractUserIdentity(req);
        req.userIdentity = userIdentity;

        // Try specific user, fallback to appUser
        try {
            const walletUserId = `${userIdentity.org}_${userIdentity.userId}`;
            await fabricClient.connect(walletUserId);
        } catch {
            await fabricClient.connect('appUser');
        }

        logger.info(`[MSP] Optional validation: ${userIdentity.mspId}`);
        next();

    } catch (error) {
        // If no valid identity, continue with default appUser
        logger.warn('[MSP] No valid identity provided, using default appUser');
        try {
            await fabricClient.connect('appUser');
        } catch (connectError) {
            logger.error('[MSP] Failed to connect with appUser:', connectError);
        }
        next();
    }
};

/**
 * Helper: Get current user's identity from request
 */
const getCurrentIdentity = (req) => {
    return req.userIdentity || null;
};

/**
 * Handover-specific validation
 * Validates that caller is the receiver organization for the handover
 * 
 * Used for AcceptHandover and RejectHandover endpoints
 */
const requireHandoverReceiver = async (req, res, next) => {
    try {
        const userIdentity = extractUserIdentity(req);
        req.userIdentity = userIdentity;

        // Connect with specific user identity (NO fallback to appUser for handover operations)
        // Must use correct org identity for MSP validation
        const walletUserId = `${userIdentity.org}_${userIdentity.userId}`;
        await fabricClient.connect(walletUserId);

        // Get handover details to verify receiver
        const handoverId = req.params.id;
        const CHANNEL_NAME = process.env.CHANNEL_NAME || 'supplychain-channel';
        const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'supplychain_cc';

        const result = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetHandover',
            handoverId
        );

        const handover = JSON.parse(result.toString());

        // Map handover.ToOrg to MSP ID
        const toOrgMap = {
            'Shipper': 'OrgShipperMSP',
            'Warehouse': 'OrgWarehouseMSP',
            'Retailer': 'OrgRetailerMSP'
        };

        const expectedMSP = toOrgMap[handover.toOrg];
        if (!expectedMSP) {
            return res.status(400).json({
                success: false,
                error: `Invalid handover recipient: ${handover.toOrg}`
            });
        }

        // Check if caller is the receiver
        const actualMSP = await fabricClient.getCurrentMSP();
        if (actualMSP !== expectedMSP) {
            logger.warn(`[MSP] Handover receiver validation failed: Expected ${expectedMSP}, got ${actualMSP}`);
            return res.status(403).json({
                success: false,
                error: `Unauthorized: Only ${handover.toOrg} can accept/reject this handover`,
                details: {
                    handoverReceiver: handover.toOrg,
                    yourOrg: userIdentity.org
                }
            });
        }

        logger.info(`[MSP] Handover receiver validated: ${actualMSP} ✓`);
        next();

    } catch (error) {
        logger.error('[MSP] Handover receiver validation error:', error);

        if (error.message.includes('does not exist')) {
            return res.status(404).json({
                success: false,
                error: 'Handover not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Handover validation failed',
            details: error.message
        });
    }
};

module.exports = {
    requireMSP,
    optionalMSP,
    getCurrentIdentity,
    requireHandoverReceiver,
    MSP_IDS,
    extractUserIdentity
};
