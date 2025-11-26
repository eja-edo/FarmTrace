/**
 * Authentication Middleware for FarmTrace API Gateway
 * Validates user identity from wallet and enforces MSP-based access control
 */

const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');

/**
 * Organization-to-MSP mapping
 */
const ORG_MSP_MAP = {
  'manufacturer': 'OrgManufacturerMSP',
  'shipper': 'OrgShipperMSP',
  'warehouse': 'OrgWarehouseMSP',
  'retailer': 'OrgRetailerMSP'
};

/**
 * Middleware: Require authentication (valid identity in wallet)
 * Attaches user identity to req.user
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get identity from header (format: "manufacturer:user1" or "shipper:user2")
    const authHeader = req.headers['x-user-identity'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide X-User-Identity header (format: org:userId)'
      });
    }

    // Parse identity
    const [org, userId] = authHeader.split(':');

    if (!org || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid identity format. Use: org:userId (e.g., manufacturer:user1)'
      });
    }

    // Validate organization
    const mspId = ORG_MSP_MAP[org.toLowerCase()];
    if (!mspId) {
      return res.status(401).json({
        success: false,
        error: `Invalid organization: ${org}. Must be one of: manufacturer, shipper, warehouse, retailer`
      });
    }

    // Check if identity exists in wallet
    const identity = await fabricClient.wallet.get(userId);
    if (!identity) {
      return res.status(401).json({
        success: false,
        error: `Identity '${userId}' not found in wallet. Please enroll first.`
      });
    }

    // Verify MSP matches
    if (identity.mspId !== mspId) {
      return res.status(403).json({
        success: false,
        error: `Identity MSP mismatch. Expected ${mspId}, got ${identity.mspId}`
      });
    }

    // Attach user info to request
    req.user = {
      userId,
      org: org.toLowerCase(),
      mspId,
      identity
    };

    logger.info(`Authenticated: ${userId} (${mspId})`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error.message
    });
  }
};

/**
 * Middleware: Require specific MSP(s)
 * Usage: requireMSP(['OrgManufacturerMSP'])
 */
const requireMSP = (allowedMSPs) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedMSPs.includes(req.user.mspId)) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized. This action requires one of: ${allowedMSPs.join(', ')}`,
        yourMSP: req.user.mspId
      });
    }

    next();
  };
};

/**
 * Middleware: Require specific organization(s)
 * Usage: requireOrg(['manufacturer', 'shipper'])
 */
const requireOrg = (allowedOrgs) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedOrgs.includes(req.user.org)) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized. This action requires one of: ${allowedOrgs.join(', ')}`,
        yourOrg: req.user.org
      });
    }

    next();
  };
};

/**
 * Helper: Get authenticated user's identity for blockchain calls
 */
const getAuthenticatedIdentity = (req) => {
  return req.user ? req.user.userId : 'appUser'; // Fallback for backward compatibility
};

module.exports = {
  requireAuth,
  requireMSP,
  requireOrg,
  getAuthenticatedIdentity,
  ORG_MSP_MAP
};
