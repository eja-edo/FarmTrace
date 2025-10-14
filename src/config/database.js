import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: ['error', 'warn']
});

export async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to PostgreSQL');
    throw err;
  }
}

