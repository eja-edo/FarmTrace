import { logger, logError } from '../utils/logger.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log full error with request context so we know where it came from
  try {
    const reqContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      route: req.route && req.route.path,
      params: req.params,
      query: req.query
    };
    if (err instanceof Error) {
      logError(err, 'Unhandled error', { request: reqContext });
    } else {
      // if someone threw a non-Error value
      logger.error('Unhandled non-Error thrown', { err, request: reqContext });
    }
  } catch (logErr) {
    // fallback to basic logging
    logger.error('Error while logging error', { logErr: logErr && logErr.message });
  }

  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal Server Error' });
}

