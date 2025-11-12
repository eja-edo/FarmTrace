const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const fabricClient = require('../utils/fabricClient');
const db = require('../utils/database');
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
 * @route   POST /api/products
 * @desc    Create a new product (Manufacturer only)
 * @access  Private
 */
router.post('/',
    [
        body('id').notEmpty().withMessage('Product ID is required'),
        body('name').notEmpty().withMessage('Product name is required'),
        body('batch').notEmpty().withMessage('Batch number is required'),
        body('origin').notEmpty().withMessage('Origin is required'),
        body('manufactureDate').isISO8601().withMessage('Valid manufacture date is required'),
        body('metaHash').optional()
    ],
    validate,
    async (req, res) => {
        try {
            const { id, name, batch, origin, manufactureDate, metaHash } = req.body;

            // Submit transaction to blockchain
            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'CreateProduct',
                id,
                name,
                batch,
                origin,
                manufactureDate,
                metaHash || ''
            );

            // Store metadata mapping in database
            await db.query(
                'INSERT INTO product_metadata (product_id, meta_url, created_at) VALUES ($1, $2, NOW())',
                [id, metaHash || '']
            );

            logger.info(`Product ${id} created successfully`);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: JSON.parse(result)
            });
        } catch (error) {
            logger.error('Error creating product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create product',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id',
    [param('id').notEmpty().withMessage('Product ID is required')],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Query blockchain
            const result = await fabricClient.evaluateTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'GetProduct',
                id
            );

            const product = JSON.parse(result);

            // Get additional metadata from database
            const dbResult = await db.query(
                'SELECT meta_url, tx_hash FROM product_metadata WHERE product_id = $1',
                [id]
            );

            if (dbResult.rows.length > 0) {
                product.metaUrl = dbResult.rows[0].meta_url;
                product.txHash = dbResult.rows[0].tx_hash;
            }

            res.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            logger.error('Error fetching product:', error);
            res.status(404).json({
                success: false,
                message: 'Product not found',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/products/:id/history
 * @desc    Get product history (trace)
 * @access  Public
 */
router.get('/:id/history',
    [param('id').notEmpty().withMessage('Product ID is required')],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            const result = await fabricClient.evaluateTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'GetProductHistory',
                id
            );

            const history = JSON.parse(result);

            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            logger.error('Error fetching product history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product history',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const result = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetAllProducts'
        );

        const products = JSON.parse(result);

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        logger.error('Error fetching all products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/products/:id/ship
 * @desc    Ship a product
 * @access  Private (Manufacturer/Shipper)
 */
router.put('/:id/ship',
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('shipperId').notEmpty().withMessage('Shipper ID is required'),
        body('waybill').notEmpty().withMessage('Waybill is required'),
        body('destination').notEmpty().withMessage('Destination is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { shipperId, waybill, destination } = req.body;

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'ShipProduct',
                id,
                shipperId,
                waybill,
                destination
            );

            logger.info(`Product ${id} shipped with waybill ${waybill}`);

            res.status(200).json({
                success: true,
                message: 'Product shipped successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error shipping product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to ship product',
                error: error.message
            });
        }
    }
);

/**
 * @route   PUT /api/products/:id/warehouse
 * @desc    Receive product at warehouse
 * @access  Private (Warehouse)
 */
router.put('/:id/warehouse',
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('warehouseId').notEmpty().withMessage('Warehouse ID is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { warehouseId } = req.body;

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'ReceiveAtWarehouse',
                id,
                warehouseId
            );

            logger.info(`Product ${id} received at warehouse ${warehouseId}`);

            res.status(200).json({
                success: true,
                message: 'Product received at warehouse',
                data: result
            });
        } catch (error) {
            logger.error('Error receiving product at warehouse:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to receive product',
                error: error.message
            });
        }
    }
);

/**
 * @route   PUT /api/products/:id/retailer
 * @desc    Deliver product to retailer
 * @access  Private (Warehouse/Retailer)
 */
router.put('/:id/retailer',
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('retailerId').notEmpty().withMessage('Retailer ID is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { retailerId } = req.body;

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'DeliverToRetailer',
                id,
                retailerId
            );

            logger.info(`Product ${id} delivered to retailer ${retailerId}`);

            res.status(200).json({
                success: true,
                message: 'Product delivered to retailer',
                data: result
            });
        } catch (error) {
            logger.error('Error delivering product to retailer:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to deliver product',
                error: error.message
            });
        }
    }
);

/**
 * @route   PUT /api/products/:id/sold
 * @desc    Mark product as sold
 * @access  Private (Retailer)
 */
router.put('/:id/sold',
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('invoiceRef').notEmpty().withMessage('Invoice reference is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceRef } = req.body;

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'MarkAsSold',
                id,
                invoiceRef
            );

            logger.info(`Product ${id} marked as sold (invoice: ${invoiceRef})`);

            res.status(200).json({
                success: true,
                message: 'Product marked as sold',
                data: result
            });
        } catch (error) {
            logger.error('Error marking product as sold:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark product as sold',
                error: error.message
            });
        }
    }
);

module.exports = router;
