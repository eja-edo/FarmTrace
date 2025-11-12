const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
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
 * @route   PUT /api/shipments/:waybill/update
 * @desc    Update shipment location and temperature
 * @access  Private (Shipper)
 */
router.put('/:waybill/update',
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

            const result = await fabricClient.submitTransaction(
                CHANNEL_NAME,
                CHAINCODE_NAME,
                'UpdateShipment',
                waybill,
                location,
                temperature.toString()
            );

            logger.info(`Shipment ${waybill} updated at ${location}`);

            res.status(200).json({
                success: true,
                message: 'Shipment updated successfully',
                data: result
            });
        } catch (error) {
            logger.error('Error updating shipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update shipment',
                error: error.message
            });
        }
    }
);

module.exports = router;
