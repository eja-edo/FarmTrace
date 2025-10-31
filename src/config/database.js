import { PrismaClient } from '@prisma/client';
import { logger, logError } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: ['error', 'warn']
});

export async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');
  } catch (err) {
    if (err instanceof Error) logError(err, 'Failed to connect to PostgreSQL');
    else logger.error('Failed to connect to PostgreSQL', { err });
    throw err;
  }
}

