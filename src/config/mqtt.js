import mqtt from 'mqtt';
import { logger, logError } from '../utils/logger.js';
import { handleIncomingMqttData } from '../services/iotService.js';

let client;

export function getMqttClient() {
  return client;
}

export async function initMqtt() {
  const url = process.env.MQTT_URL || 'mqtt://mosquitto:1883';
  client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 2000
  });

  client.on('connect', () => {
    logger.info('MQTT connected');
    // Subscribe to data and connection topics
    const topics = ['iot/+/data', 'iot/+/connect'];
    topics.forEach(topic => {
      client.subscribe(topic, (err) => {
        if (err) {
          if (err instanceof Error) logError(err, `Failed to subscribe to ${topic}`);
          else logger.error(`Failed to subscribe to ${topic}`, { err });
        } else {
          logger.info(`Subscribed to ${topic}`);
        }
      });
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const parts = topic.split('/');
      const deviceId = parts[1];
      const messageType = parts[2]; // 'data' or 'connect'

      if (messageType === 'connect') {
        // Device đang kết nối, gửi config
        const { sendDeviceThresholds } = await import('../services/deviceConfigService.js');
        await sendDeviceThresholds(deviceId);
      } else if (messageType === 'data') {
        // Xử lý data như bình thường
        await handleIncomingMqttData(topic, message);
      }
    } catch (err) {
      const messageStr = message.toString();
      let payload;
      try {
        payload = JSON.parse(messageStr);
      } catch {
        payload = messageStr;
      }

      if (err instanceof Error) {
        logError(err, 'Error processing MQTT message', {
          topic,
          payload,
          validation: err.status === 400
        });
      } else {
        logger.error('Error processing MQTT message', {
          err,
          topic,
          payload
        });
      }
    }
  });

  client.on('error', (err) => {
    if (err instanceof Error) logError(err, 'MQTT client error');
    else logger.error('MQTT client error', { err });
  });
}

