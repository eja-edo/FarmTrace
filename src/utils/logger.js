import winston from 'winston';
import path from 'path';
import pino from 'pino';

const { combine, timestamp, errors, json, printf } = winston.format;

// Pino logger for HTTP requests
export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Custom format to include file:line if present in meta
const errorFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaKeys = Object.keys(meta || {});
  const metaStr = metaKeys.length ? ` meta=${JSON.stringify(meta)}` : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `${timestamp} ${level}: ${message || ''}${metaStr}${stackStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [new winston.transports.Console({ format: combine(timestamp(), errorFormat) })]
});

// Helper to log errors in a consistent, serializable way.
// Accepts either an Error or an object/meta and an optional message.
export function logError(errOrMeta, message, extra = {}) {
  if (errOrMeta instanceof Error) {
    // try to extract file:line from stack (first stack frame after the error line)
    const stack = errOrMeta.stack || '';
    let fileLine = null;
    const stackLines = stack.split('\n').map(s => s.trim());
    if (stackLines.length > 1) {
      // Example stack frame: at Object.<anonymous> (C:\path\to\file.js:10:15)
      const m = /\((.*):([0-9]+):([0-9]+)\)$/.exec(stackLines[1]);
      if (m) {
        fileLine = `${path.basename(m[1])}:${m[2]}`;
      }
    }

    logger.error(message || errOrMeta.message || 'Error', {
      message: errOrMeta.message,
      stack: errOrMeta.stack,
      file: fileLine,
      ...extra
    });
  } else {
    // errOrMeta is some meta object
    logger.error(message || 'Error', { ...errOrMeta, ...extra });
  }
}

