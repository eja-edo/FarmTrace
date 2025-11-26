const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
const fabricClient = require('./utils/fabricClient');

// V1 Routes (backward compatibility)
const productRoutes = require('./routes/products');
const shipmentRoutes = require('./routes/shipments');
const orderRoutes = require('./routes/orders');
const handoverRoutes = require('./routes/handovers');
const authRoutes = require('./routes/auth');

// V2 Routes (with MSP validation)
const productsV2 = require('./routes/products.v2');
const handoversV2 = require('./routes/handovers.v2');
const shipmentsV2 = require('./routes/shipments.v2');
const signaturesV2 = require('./routes/signatures');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes V1 (backward compatibility - no MSP enforcement)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/handovers', handoverRoutes);

// API Routes V2 (with MSP validation and security)
app.use('/api/v2/products', productsV2);
app.use('/api/v2/handovers', handoversV2);
app.use('/api/v2/shipments', shipmentsV2);
app.use('/api/v2/signatures', signaturesV2);

// API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'FarmTrace Supply Chain Blockchain Gateway API',
        version: '2.0.0',
        updated: '2025-11-25',
        security: {
            layer1: 'Hyperledger Fabric (X.509 + ECDSA signatures)',
            layer2: 'MSP-based access control',
            documentation: '/DIGITAL_SIGNATURE_GUIDE.md'
        },
        endpoints: {
            health: '/health',
            v1: {
                note: 'Legacy endpoints - backward compatibility only',
                auth: '/api/auth',
                products: '/api/products',
                shipments: '/api/shipments',
                orders: '/api/orders',
                handovers: '/api/handovers'
            },
            v2: {
                note: 'Recommended - with MSP validation',
                products: '/api/v2/products',
                handovers: '/api/v2/handovers',
                shipments: '/api/v2/shipments',
                signatures: '/api/v2/signatures'
            }
        },
        authentication: {
            header: 'X-User-Identity',
            format: 'org:userId',
            examples: {
                manufacturer: 'manufacturer:user1',
                shipper: 'shipper:user1',
                warehouse: 'warehouse:user1',
                retailer: 'retailer:user1'
            },
            mspIds: {
                manufacturer: 'OrgManufacturerMSP',
                shipper: 'OrgShipperMSP',
                warehouse: 'OrgWarehouseMSP',
                retailer: 'OrgRetailerMSP'
            }
        },
        workflow: {
            step1: 'POST /api/v2/products - Create product (Manufacturer)',
            step2: 'POST /api/v2/handovers/manufacturer-shipper - Request handover (Manufacturer)',
            step3: 'POST /api/v2/handovers/:id/accept - Accept handover (Shipper)',
            step4: 'POST /api/v2/shipments - Create shipment (Shipper)',
            step5: 'PUT /api/v2/shipments/:waybill/location - Track location (Shipper)',
            step6: 'POST /api/v2/handovers/shipper-warehouse - Request handover (Shipper)',
            step7: 'POST /api/v2/handovers/:id/accept - Accept handover (Warehouse)',
            step8: 'PUT /api/v2/products/:id/sold - Mark as sold (Retailer)'
        }
    });
});

// Error handling
app.use(errorHandler);

// Initialize Fabric client and start server
async function startServer() {
    try {
        logger.info('Initializing Fabric client...');
        await fabricClient.initialize();
        logger.info('Fabric client initialized successfully');

        app.listen(PORT, () => {
            logger.info(`Gateway API server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger.info('Wallet ready for identity management');
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
