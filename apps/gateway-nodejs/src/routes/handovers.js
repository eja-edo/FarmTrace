const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'supplychain-channel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'supplychain_cc';

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/handovers/request-shipper
 * @desc    Request handover to shipper (Manufacturer only)
 * @access  Private (Manufacturer MSP)
 */
router.post('/request-shipper',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('shipperId').notEmpty().withMessage('Shipper ID is required'),
    body('waybill').notEmpty().withMessage('Waybill is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { productId, shipperId, waybill, signature } = req.body;

      logger.info(`Requesting handover to shipper for product ${productId}`);

      const result = await fabricClient.submitTransaction(
        CHANNEL_NAME,
        CHAINCODE_NAME,
        'RequestHandoverToShipper',
        productId,
        shipperId,
        waybill,
        signature
      );

      logger.info(`Handover request created: HANDOVER-${productId}-SHIPPER`);

      res.status(200).json({
        success: true,
        message: 'Handover request created successfully',
        handoverId: `HANDOVER-${productId}-SHIPPER`,
        transactionId: result.toString()
      });

    } catch (error) {
      logger.error('Error requesting handover:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/handovers/pending
 * @desc    Get pending handovers for current organization
 * @access  Private
 */
router.get('/pending', async (req, res) => {
  try {
    logger.info('Fetching pending handovers for organization');

    const result = await fabricClient.evaluateTransaction(
      CHANNEL_NAME,
      CHAINCODE_NAME,
      'GetPendingHandoversForOrg'
    );

    const resultStr = result ? result.toString() : '';
    const handovers = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : [];

    logger.info(`Found ${handovers ? handovers.length : 0} pending handovers`);

    res.json({
      success: true,
      count: handovers ? handovers.length : 0,
      handovers: handovers || []
    });

  } catch (error) {
    logger.error('Error fetching pending handovers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/handovers/:id
 * @desc    Get handover details by ID
 * @access  Private
 */
router.get('/:id',
  param('id').notEmpty().withMessage('Handover ID is required'),
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Fetching handover details: ${id}`);

      const result = await fabricClient.evaluateTransaction(
        CHANNEL_NAME,
        CHAINCODE_NAME,
        'GetHandover',
        id
      );

      const resultStr = result ? result.toString() : '';
      const handover = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : null;
      if (!handover) {
        return res.status(404).json({
          success: false,
          error: 'Handover not found'
        });
      }

      res.json({
        success: true,
        handover: handover
      });

    } catch (error) {
      logger.error(`Error fetching handover ${req.params.id}:`, error);

      if (error.message.includes('does not exist')) {
        return res.status(404).json({
          success: false,
          error: 'Handover not found'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/handovers/:id/accept
 * @desc    Accept handover (Shipper/Warehouse/Retailer)
 * @access  Private
 */
router.post('/:id/accept',
  [
    param('id').notEmpty().withMessage('Handover ID is required'),
    body('receiverId').notEmpty().withMessage('Receiver ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { receiverId, signature } = req.body;

      logger.info(`Accepting handover: ${id}`);

      const result = await fabricClient.submitTransaction(
        CHANNEL_NAME,
        CHAINCODE_NAME,
        'AcceptHandover',
        id,
        receiverId,
        signature
      );

      logger.info(`Handover ${id} accepted successfully`);

      res.json({
        success: true,
        message: 'Handover accepted successfully',
        transactionId: result.toString()
      });

    } catch (error) {
      logger.error(`Error accepting handover ${req.params.id}:`, error);

      if (error.message.includes('unauthorized')) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You cannot accept this handover'
        });
      }

      if (error.message.includes('not in pending state')) {
        return res.status(409).json({
          success: false,
          error: 'Handover is not in pending state'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/handovers/:id/reject
 * @desc    Reject handover (Shipper/Warehouse/Retailer)
 * @access  Private
 */
router.post('/:id/reject',
  [
    param('id').notEmpty().withMessage('Handover ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, signature } = req.body;

      logger.info(`Rejecting handover: ${id}`);

      const result = await fabricClient.submitTransaction(
        CHANNEL_NAME,
        CHAINCODE_NAME,
        'RejectHandover',
        id,
        reason,
        signature
      );

      logger.info(`Handover ${id} rejected`);

      res.json({
        success: true,
        message: 'Handover rejected successfully',
        transactionId: result.toString()
      });

    } catch (error) {
      logger.error(`Error rejecting handover ${req.params.id}:`, error);

      if (error.message.includes('unauthorized')) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You cannot reject this handover'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
