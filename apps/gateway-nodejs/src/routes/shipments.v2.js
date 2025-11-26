const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
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
 * @route   POST /api/v2/shipments
 * @desc    Create shipment record
 * @access  Private (Manufacturer or Shipper MSP)
 * @note    Called after handover accepted, before transit begins
 * @security MSP validation enforced - manufacturer or shipper only
 */
router.post('/',
    requireMSP(['manufacturer', 'shipper']),
    [
        body('productId').notEmpty().withMessage('Product ID is required'),
        body('shipperId').notEmpty().withMessage('Shipper ID is required'),
        body('waybill').notEmpty().withMessage('Waybill is required'),
        body('destination').notEmpty().withMessage('Destination is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { productId, shipperId, waybill, destination } = req.body;

            logger.info(`[Shipment] Creating shipment for product ${productId}, waybill: ${waybill}`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'ShipProduct',
                productId,
                shipperId,
                waybill,
                destination
            );

            logger.info(`[Shipment] Created: ${waybill}`);

            res.status(201).json({
                success: true,
                message: 'Shipment created successfully',
                data: {
                    shipmentId: waybill,
                    productId,
                    shipperId,
                    destination,
                    status: 'InTransit',
                    createdAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('[Shipment] Error creating shipment:', error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only manufacturer or shipper can create shipment'
                });
            }
            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Shipment with this waybill already exists'
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
 * @route   GET /api/v2/shipments/:waybill
 * @desc    Get shipment details and tracking history
 * @access  Public (All MSPs)
 * @security Optional MSP validation (logs identity)
 * @returns Shipment data including locations array, temperature, status
 */
router.get('/:waybill',
    optionalMSP,
    param('waybill').notEmpty().withMessage('Waybill is required'),
    validate,
    async (req, res) => {
        try {
            const { waybill } = req.params;

            logger.info(`[Shipment] Fetching shipment: ${waybill}`);

            // Query blockchain
            const result = await fabricClient.evaluateTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'GetShipment',
                waybill
            );

            const resultStr = result ? result.toString() : '';
            const shipment = resultStr && resultStr.trim() !== '' ? JSON.parse(resultStr) : null;

            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            logger.info(`[Shipment] Found: ${waybill}, ${shipment.locations.length} locations tracked`);

            res.status(200).json({
                success: true,
                data: shipment
            });

        } catch (error) {
            logger.error(`[Shipment] Error fetching shipment ${req.params.waybill}:`, error);

            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
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
 * @route   PUT /api/v2/shipments/:waybill/location
 * @desc    Update shipment location and temperature
 * @access  Private (Shipper MSP only)
 * @note    Can be called multiple times during transit
 * @security MSP validation enforced - only OrgShipperMSP allowed
 */
router.put('/:waybill/location',
    requireMSP('shipper'),
    [
        param('waybill').notEmpty().withMessage('Waybill is required'),
        body('location').notEmpty().withMessage('Location is required'),
        body('temperature').isFloat().withMessage('Valid temperature is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { waybill } = req.params;
            const { location, temperature } = req.body;

            logger.info(`[Shipment] Updating shipment ${waybill} at ${location}, temp: ${temperature}°C`);

            // Submit transaction to blockchain
            await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'UpdateShipment',
                waybill,
                location,
                temperature.toString()
            );

            logger.info(`[Shipment] Updated: ${waybill}`);

            res.status(200).json({
                success: true,
                message: 'Shipment location updated successfully',
                data: {
                    waybill,
                    location,
                    temperature,
                    updatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`[Shipment] Error updating shipment ${req.params.waybill}:`, error);

            // Parse specific errors
            if (error.message.includes('unauthorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Only shipper can update shipment'
                });
            }
            if (error.message.includes('does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
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
