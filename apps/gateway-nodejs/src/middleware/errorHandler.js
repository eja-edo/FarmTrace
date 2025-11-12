const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error handler:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });

    // Fabric errors
    if (err.message && err.message.includes('ENDORSEMENT_POLICY_FAILURE')) {
        return res.status(403).json({
            success: false,
            message: 'Endorsement policy not met',
            error: err.message
        });
    }

    if (err.message && err.message.includes('does not exist')) {
        return res.status(404).json({
            success: false,
            message: 'Resource not found',
            error: err.message
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = { errorHandler };
