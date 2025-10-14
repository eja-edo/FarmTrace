import './config/dotenv.js';
import { createServer } from 'http';
import app from './app.js';
import { initMqtt } from './config/mqtt.js';
import { logger } from './utils/logger.js';
import { connectDb } from './config/database.js';

const PORT = process.env.PORT || 3000;

const server = createServer(app);

server.listen(PORT, async () => {
  logger.info(`HTTP server listening on port ${PORT}`);
  try {
    await connectDb();
    logger.info('Database connected');
    await initMqtt();
    logger.info('MQTT initialized');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize MQTT');
  }
});

export default server;

