import winston from 'winston';
import pino from 'pino';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'info' });

