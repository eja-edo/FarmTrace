import mqtt from 'mqtt';
import { logger } from '../utils/logger.js';
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
    client.subscribe('iot/+/data', (err) => {
      if (err) logger.error({ err }, 'Failed to subscribe to iot/+/data');
    });
  });

  client.on('message', async (topic, message) => {
    try {
      await handleIncomingMqttData(topic, message);
    } catch (err) {
      logger.error({ err }, 'Error processing MQTT message');
    }
  });

  client.on('error', (err) => logger.error({ err }, 'MQTT error'));
}

