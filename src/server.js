import './config/dotenv.js';
import { createServer } from 'http';
import app from './app.js';
import { initMqtt } from './config/mqtt.js';
import { initSocket } from './realtime/socket.js';
import { logger, logError } from './utils/logger.js';
import { connectDb } from './config/database.js';

const PORT = process.env.PORT || 3000;

const server = createServer(app);

server.listen(PORT, async () => {
  logger.info(`HTTP server listening on port ${PORT}`);
  try {
    await connectDb();
    logger.info('Database connected');

    // Initialize Socket.IO for realtime events
    initSocket(server);
    logger.info('Socket.IO initialized');

    await initMqtt();
    logger.info('MQTT initialized');
  } catch (err) {
    if (err instanceof Error) logError(err, 'Failed to initialize services', { phase: 'startup' });
    else logger.error('Failed to initialize services', { err });
    process.exit(1);
  }
});

export default server;


