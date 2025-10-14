import express from 'express';
import helmet from 'helmet';
import { json } from 'express';
import pinoHttp from 'pino-http';
import { logger, pinoLogger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import configRoutes from './routes/configRoutes.js';

const app = express();

app.use(helmet());
app.use(json({ limit: '1mb' }));
app.use(pinoHttp({ logger: pinoLogger }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/iot', iotRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/orders', orderRoutes);
app.use('/config', configRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

