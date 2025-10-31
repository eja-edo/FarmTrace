import mqtt from 'mqtt';

const broker = process.env.MQTT_URL || 'mqtt://localhost:1883';
const client = mqtt.connect(broker);

client.on('connect', () => {
  console.log('connected to broker', broker);
  const topic = 'iot/esp32-001/data';

  const tests = [
    // numeric strings with comma decimal
    {
      data: {
        temperature: '24,5',
        humidity: '40,2',
        gps: { lat: '10,78', lon: '106,66' },
        orderId: '1',
        vehicleId: '1'
      }
    },

    // already numeric
    {
      data: {
        temperature: 24,
        humidity: 40,
        gps: { lat: 0, lon: 0 }
      }
    },

    // mixed types
    {
      data: {
        temperature: '23.1',
        humidity: 55,
        gps: { lat: '0', lon: 0 }
      }
    }
  ];

  let sent = 0;
  tests.forEach((payload, i) => {
    const message = JSON.stringify(payload);
    client.publish(topic, message, { qos: 1 }, (err) => {
      console.log(`published test ${i}`, err ? err.message : 'ok');
      sent += 1;
      if (sent === tests.length) {
        client.end();
      }
    });
  });
});

client.on('error', (err) => {
  console.error('mqtt error', err.message);
});
