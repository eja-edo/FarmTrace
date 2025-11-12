const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'supplychain-channel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'supplychain_cc';

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/',
    [
        body('orderId').notEmpty().withMessage('Order ID is required'),
        body('productIds').isArray({ min: 1 }).withMessage('At least one product ID is required'),
        body('buyerId').notEmpty().withMessage('Buyer ID is required'),
        body('sellerId').notEmpty().withMessage('Seller ID is required'),
        body('totalPrice').isFloat({ min: 0 }).withMessage('Valid total price is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { orderId, productIds, buyerId, sellerId, totalPrice } = req.body;

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'CreateOrder',
                orderId,
                JSON.stringify(productIds),
                buyerId,
                sellerId,
                totalPrice.toString()
            );

            logger.info(`Order ${orderId} created successfully`);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error creating order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }
);

module.exports = router;
