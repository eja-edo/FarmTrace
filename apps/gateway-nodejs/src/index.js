const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
const productRoutes = require('./routes/products');
const shipmentRoutes = require('./routes/shipments');
const orderRoutes = require('./routes/orders');
const handoverRoutes = require('./routes/handovers');
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

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/handovers', handoverRoutes);

// API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'Supply Chain Blockchain Gateway API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            products: '/api/products',
            shipments: '/api/shipments',
            orders: '/api/orders',
            handovers: '/api/handovers'
        }
    });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`Gateway API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
