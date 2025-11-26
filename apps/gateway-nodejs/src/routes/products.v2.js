const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const fabricClient = require('../utils/fabricClient');
const logger = require('../utils/logger');
const { requireMSP, optionalMSP } = require('../middleware/mspValidation');

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'supplychain-channel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'supplychain_cc';

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

/**
 * @route   POST /api/v2/products
 * @desc    Create a new product
 * @access  Private (Manufacturer MSP only)
 * @workflow Step 1: Product creation at manufacturing facility
 * @security MSP validation enforced - only OrgManufacturerMSP allowed
 */
router.post('/',
    requireMSP('manufacturer'),
    [
        body('id').notEmpty().withMessage('Product ID is required'),
        body('name').notEmpty().withMessage('Product name is required'),
        body('batch').notEmpty().withMessage('Batch number is required'),
        body('origin').notEmpty().withMessage('Origin is required'),
        body('manufactureDate').isISO8601().withMessage('Valid manufacture date (ISO8601) is required'),
        body('metaHash').optional().isString()
    ],
    validate,
    async (req, res) => {
        try {
            const { id, name, batch, origin, manufactureDate, metaHash } = req.body;

            logger.info(`[Product] Creating product: ${id}, batch: ${batch}`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
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

            logger.info(`[Product] Created: ${id}`);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: {
                    id,
                    name,
                    batch,
                    origin,
                    manufactureDate,
                    status: 'Manufactured',
                    owner: 'Manufacturer',
                    createdAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('[Product] Error creating product:', error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only manufacturer can create products'
                });
            }
            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Product with this ID already exists'
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
 * @route   GET /api/v2/products/:id
 * @desc    Get product by ID
 * @access  Public (All MSPs)
 * @security Optional MSP validation (logs identity)
 */
router.get('/:id',
    optionalMSP,
    param('id').notEmpty().withMessage('Product ID is required'),
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            logger.info(`[Product] Fetching product: ${id}`);

            // Query blockchain
            const result = await fabricClient.evaluateTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'GetProduct',
                id
            );

            const resultStr = result ? result.toString() : '';
            const product = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : null;

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }

            logger.info(`[Product] Found: ${id}, status: ${product.status}, owner: ${product.owner}`);

            res.status(200).json({
                success: true,
                data: product
            });

        } catch (error) {
            logger.error(`[Product] Error fetching product ${req.params.id}:`, error);

            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
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
 * @route   GET /api/v2/products/:id/history
 * @desc    Get product transaction history (audit trail)
 * @access  Public (All MSPs)
 * @security Optional MSP validation (logs identity)
 * @returns Full blockchain history including all state changes
 */
router.get('/:id/history',
    optionalMSP,
    param('id').notEmpty().withMessage('Product ID is required'),
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            logger.info(`[Product] Fetching history for product: ${id}`);

            // Query blockchain
            const result = await fabricClient.evaluateTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'GetProductHistory',
                id
            );

            const resultStr = result ? result.toString() : '';
            const history = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : [];

            logger.info(`[Product] Found ${history.length} historical records for ${id}`);

            res.status(200).json({
                success: true,
                count: history.length,
                data: history
            });

        } catch (error) {
            logger.error(`[Product] Error fetching history for ${req.params.id}:`, error);

            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
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
 * @route   GET /api/v2/products
 * @desc    Get all products (filtered by chaincode)
 * @access  Public (All MSPs)
 * @security Optional MSP validation (logs identity)
 * @note    Returns only Product objects, not Handovers or Shipments
 */
router.get('/', optionalMSP, async (req, res) => {
    try {
        logger.info('[Product] Fetching all products');

        // Query blockchain
        const result = await fabricClient.evaluateTransaction(
            CHANNEL_NAME,
            CHAINCODE_NAME,
            'GetAllProducts'
        );

        const resultStr = result ? result.toString() : '';
        const products = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : [];

        logger.info(`[Product] Found ${products.length} products`);

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        logger.error('[Product] Error fetching all products:', error);
        logger.error('[Product] Error stack:', error.stack);
        logger.error('[Product] Error details:', {
            message: error.message,
            errors: error.errors,
            endorsements: error.endorsements
        });
        res.status(500).json({
            success: false,
            error: 'Query failed. Errors: ' + (error.errors ? JSON.stringify(error.errors) : error.message)
        });
    }
});

/**
 * @route   PUT /api/v2/products/:id/sold
 * @desc    Mark product as sold (final step)
 * @access  Private (Retailer MSP only)
 * @workflow Final step: Product reaches end consumer
 * @security MSP validation enforced - only OrgRetailerMSP allowed
 */
router.put('/:id/sold',
    requireMSP('retailer'),
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('invoiceRef').notEmpty().withMessage('Invoice reference is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceRef } = req.body;

            logger.info(`[Product] Marking product as sold: ${id}, invoice: ${invoiceRef}`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'MarkAsSold',
                id,
                invoiceRef
            );

            logger.info(`[Product] Marked as sold: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Product marked as sold successfully',
                data: {
                    productId: id,
                    status: 'Sold',
                    invoiceRef,
                    soldAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`[Product] Error marking product as sold ${req.params.id}:`, error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only retailer can mark product as sold'
                });
            }
            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
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
 * @route   PUT /api/v2/products/:id/warehouse
 * @desc    Receive product at warehouse (DIRECT - no handover)
 * @access  Private (Warehouse MSP only)
 * @security MSP validation enforced - only OrgWarehouseMSP allowed
 * @note    DEPRECATED: Use handover workflow instead for consistency
 * @note    Kept for backward compatibility
 */
router.put('/:id/warehouse',
    requireMSP('warehouse'),
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('warehouseId').notEmpty().withMessage('Warehouse ID is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { warehouseId } = req.body;

            logger.warn(`[Product] DEPRECATED: Direct warehouse receipt for ${id}. Consider using handover workflow.`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'ReceiveAtWarehouse',
                id,
                warehouseId
            );

            logger.info(`[Product] Received at warehouse: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Product received at warehouse',
                warning: 'This endpoint is deprecated. Use handover workflow for better audit trail.',
                data: {
                    productId: id,
                    warehouseId,
                    status: 'ReceivedAtWarehouse',
                    receivedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`[Product] Error receiving at warehouse ${req.params.id}:`, error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only warehouse can receive product'
                });
            }
            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
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
 * @route   PUT /api/v2/products/:id/retailer
 * @desc    Deliver product to retailer (DIRECT - no handover)
 * @access  Private (Warehouse MSP only)
 * @security MSP validation enforced - only OrgWarehouseMSP allowed
 * @note    DEPRECATED: Use handover workflow instead for consistency
 * @note    Kept for backward compatibility
 */
router.put('/:id/retailer',
    requireMSP('warehouse'),
    [
        param('id').notEmpty().withMessage('Product ID is required'),
        body('retailerId').notEmpty().withMessage('Retailer ID is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { retailerId } = req.body;

            logger.warn(`[Product] DEPRECATED: Direct retailer delivery for ${id}. Consider using handover workflow.`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'DeliverToRetailer',
                id,
                retailerId
            );

            logger.info(`[Product] Delivered to retailer: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Product delivered to retailer',
                warning: 'This endpoint is deprecated. Use handover workflow for better audit trail.',
                data: {
                    productId: id,
                    retailerId,
                    status: 'DeliveredToRetailer',
                    deliveredAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`[Product] Error delivering to retailer ${req.params.id}:`, error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only warehouse can deliver to retailer'
                });
            }
            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
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
