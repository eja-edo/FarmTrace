import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

