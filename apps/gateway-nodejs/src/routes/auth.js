/**
 * Authentication Routes
 * Handles user enrollment and identity management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');
const { ORG_MSP_MAP } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/auth/enroll
 * @desc    Enroll a new user (import identity from crypto-config)
 * @access  Public (in production, this should be admin-only)
 */
router.post('/enroll',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('org').notEmpty().withMessage('Organization is required'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user')
  ],
  validate,
  async (req, res) => {
    try {
      const { userId, org, role = 'user' } = req.body;

      // Validate organization
      const mspId = ORG_MSP_MAP[org.toLowerCase()];
      if (!mspId) {
        return res.status(400).json({
          success: false,
          error: `Invalid organization: ${org}. Must be one of: manufacturer, shipper, warehouse, retailer`
        });
      }

      // Check if user already exists
      const existingIdentity = await fabricClient.wallet.get(userId);
      if (existingIdentity) {
        return res.status(409).json({
          success: false,
          error: `User ${userId} already enrolled`
        });
      }

      logger.info(`Enrolling user: ${userId} for ${mspId}`);

      // Import identity from crypto-config
      const path = require('path');
      const fs = require('fs');

      // Construct paths to certificate and private key
      // Check Docker path first, then local path
      let cryptoBasePath = '/crypto-config'; // Docker path
      if (!fs.existsSync(cryptoBasePath)) {
        // Fallback to local development path
        cryptoBasePath = path.join(__dirname, '..', '..', '..', '..', 'network', 'crypto-config');
      }

      const cryptoPath = path.join(cryptoBasePath,
        'peerOrganizations', `${org.toLowerCase()}.example.com`, 'users',
        `${role === 'admin' ? 'Admin' : 'User1'}@${org.toLowerCase()}.example.com`, 'msp');

      const certPath = path.join(cryptoPath, 'signcerts', `${role === 'admin' ? 'Admin' : 'User1'}@${org.toLowerCase()}.example.com-cert.pem`);
      const keyPath = path.join(cryptoPath, 'keystore');

      // Read certificate
      if (!fs.existsSync(certPath)) {
        return res.status(404).json({
          success: false,
          error: `Certificate not found for ${org}/${role}. Path: ${certPath}`
        });
      }
      const cert = fs.readFileSync(certPath, 'utf8');

      // Read private key (first file in keystore)
      const keyFiles = fs.readdirSync(keyPath);
      if (keyFiles.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Private key not found in ${keyPath}`
        });
      }
      const keyFile = path.join(keyPath, keyFiles[0]);
      const privateKey = fs.readFileSync(keyFile, 'utf8');

      // Create X.509 identity
      const { Wallets } = require('fabric-network');
      const identity = {
        credentials: {
          certificate: cert,
          privateKey: privateKey
        },
        mspId: mspId,
        type: 'X.509'
      };

      // Import to wallet
      await fabricClient.wallet.put(userId, identity);

      logger.info(`Successfully enrolled ${userId} (${mspId})`);

      res.status(201).json({
        success: true,
        message: 'User enrolled successfully',
        user: {
          userId,
          org,
          mspId,
          role
        }
      });

    } catch (error) {
      logger.error('Error enrolling user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll user',
        details: error.message
      });
    }
  }
);

/**
 * @route   GET /api/auth/identities
 * @desc    List all enrolled identities
 * @access  Public (in production, should be admin-only)
 */
router.get('/identities', async (req, res) => {
  try {
    const identities = await fabricClient.wallet.list();

    const identityList = await Promise.all(
      identities.map(async (label) => {
        const identity = await fabricClient.wallet.get(label);
        return {
          userId: label,
          mspId: identity.mspId,
          type: identity.type
        };
      })
    );

    res.json({
      success: true,
      count: identityList.length,
      identities: identityList
    });
  } catch (error) {
    logger.error('Error listing identities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list identities',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (requires X-User-Identity header)
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['x-user-identity'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const [org, userId] = authHeader.split(':');
    const identity = await fabricClient.wallet.get(userId);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found'
      });
    }

    res.json({
      success: true,
      user: {
        userId,
        org,
        mspId: identity.mspId,
        type: identity.type
      }
    });
  } catch (error) {
    logger.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      details: error.message
    });
  }
});

/**
 * @route   DELETE /api/auth/identities/:userId
 * @desc    Remove an identity from wallet
 * @access  Admin only
 */
router.delete('/identities/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const identity = await fabricClient.wallet.get(userId);
    if (!identity) {
      return res.status(404).json({
        success: false,
        error: `Identity ${userId} not found`
      });
    }

    await fabricClient.wallet.remove(userId);
    logger.info(`Identity ${userId} removed from wallet`);

    res.json({
      success: true,
      message: `Identity ${userId} removed successfully`
    });
  } catch (error) {
    logger.error('Error removing identity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove identity',
      details: error.message
    });
  }
});

module.exports = router;
