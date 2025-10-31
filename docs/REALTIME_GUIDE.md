# Realtime WebSocket Integration Guide

## Overview

Backend đã được tích hợp **Socket.IO** để stream dữ liệu realtime từ IoT devices tới frontend. Hệ thống hỗ trợ:

- **WebSocket** (Socket.IO) - Primary transport
- **Server-Sent Events (SSE)** - Fallback cho môi trường không hỗ trợ WS
- **JWT Authentication** - Bảo mật kết nối realtime
- **Room-based subscriptions** - Subscribe theo device/shipment
- **Throttling** - Giới hạn tần suất emit để tối ưu bandwidth

---

## 🔌 Connection Setup

### WebSocket (Socket.IO Client)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join device rooms to receive events
  socket.emit('join', {
    devices: ['esp32-001', 'esp32-002'],
    shipments: [1, 2]
  });
});

socket.on('joined', (data) => {
  console.log('Joined rooms:', data);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### SSE Fallback

```javascript
const deviceId = 'esp32-001';
const token = 'YOUR_JWT_TOKEN';

const eventSource = new EventSource(
  `http://localhost:3000/api/stream/devices/${deviceId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

eventSource.addEventListener('sensor_reading', (event) => {
  const data = JSON.parse(event.data);
  console.log('Sensor:', data);
});

eventSource.addEventListener('device_location', (event) => {
  const data = JSON.parse(event.data);
  console.log('Location:', data);
});

eventSource.onerror = (err) => {
  console.error('SSE error:', err);
  eventSource.close();
};
```

---

## 📡 Event Types

### 1. `sensor_reading`

Được phát khi có dữ liệu cảm biến mới (temperature, humidity, pressure).

**Throttle**: Tối đa 2 Hz (mỗi 500ms)

```json
{
  "deviceId": "esp32-001",
  "type": "temperature",
  "value": 5.5,
  "createdAt": "2025-10-31T10:30:00.000Z"
}
```

### 2. `device_location`

Được phát khi có tọa độ GPS mới.

**Throttle**: Tối đa 1 Hz (mỗi 1000ms)

```json
{
  "deviceId": "esp32-001",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "createdAt": "2025-10-31T10:30:01.000Z"
}
```

### 3. `alert`

Được phát khi giá trị cảm biến vượt ngưỡng cấu hình.

**Throttle**: Không throttle (realtime)

```json
{
  "deviceId": "esp32-001",
  "type": "temperature",
  "value": 12.5,
  "thresholdId": 1,
  "createdAt": "2025-10-31T10:30:02.000Z"
}
```

---

## 🎨 Frontend Implementation Examples

### React + Socket.IO

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function DeviceMonitor({ deviceId, token }) {
  const [socket, setSocket] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join', { devices: [deviceId] });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Listen to sensor readings
    newSocket.on('sensor_reading', (data) => {
      setSensorData(prev => [...prev.slice(-99), data]); // Keep last 100
    });

    // Listen to location updates
    newSocket.on('device_location', (data) => {
      setLocation(data);
    });

    // Listen to alerts
    newSocket.on('alert', (data) => {
      setAlerts(prev => [data, ...prev]);
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Alert!', {
          body: `${data.type}: ${data.value}`
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [deviceId, token]);

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      
      <h3>Latest Sensor Data</h3>
      <ul>
        {sensorData.slice(-5).reverse().map((s, i) => (
          <li key={i}>
            {s.type}: {s.value} at {new Date(s.createdAt).toLocaleTimeString()}
          </li>
        ))}
      </ul>

      <h3>Current Location</h3>
      {location && (
        <div>
          Lat: {location.latitude}, Lon: {location.longitude}
        </div>
      )}

      <h3>Alerts</h3>
      <ul>
        {alerts.slice(0, 5).map((a, i) => (
          <li key={i} style={{ color: 'red' }}>
            ⚠️ {a.type}: {a.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue 3 + Composition API

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps(['deviceId', 'token']);

const connected = ref(false);
const sensorData = ref([]);
const location = ref(null);
const alerts = ref([]);

let socket = null;

onMounted(() => {
  socket = io('http://localhost:3000', {
    auth: { token: props.token }
  });

  socket.on('connect', () => {
    connected.value = true;
    socket.emit('join', { devices: [props.deviceId] });
  });

  socket.on('disconnect', () => {
    connected.value = false;
  });

  socket.on('sensor_reading', (data) => {
    sensorData.value.push(data);
    if (sensorData.value.length > 100) {
      sensorData.value.shift();
    }
  });

  socket.on('device_location', (data) => {
    location.value = data;
  });

  socket.on('alert', (data) => {
    alerts.value.unshift(data);
  });
});

onUnmounted(() => {
  if (socket) socket.close();
});
</script>

<template>
  <div>
    <div :class="connected ? 'connected' : 'disconnected'">
      {{ connected ? '🟢 Connected' : '🔴 Disconnected' }}
    </div>
    <!-- Rest of template -->
  </div>
</template>
```

---

## 📊 Chart Integration (Chart.js)

```javascript
import { Chart } from 'chart.js/auto';

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Temperature',
      data: [],
      borderColor: 'rgb(255, 99, 132)'
    }]
  },
  options: {
    animation: false, // Disable for realtime
    scales: {
      x: {
        type: 'time'
      }
    },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: 500
      }
    }
  }
});

socket.on('sensor_reading', (data) => {
  if (data.type === 'temperature') {
    chart.data.labels.push(new Date(data.createdAt));
    chart.data.datasets[0].data.push(data.value);
    
    // Keep last 1000 points
    if (chart.data.labels.length > 1000) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    
    chart.update('none'); // Update without animation
  }
});
```

---

## 🗺️ Map Integration (Leaflet)

```javascript
import L from 'leaflet';

const map = L.map('map').setView([10.762622, 106.660172], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const marker = L.marker([10.762622, 106.660172]).addTo(map);
const polyline = L.polyline([], { color: 'blue' }).addTo(map);

socket.on('device_location', (data) => {
  const latLng = [data.latitude, data.longitude];
  
  // Update marker
  marker.setLatLng(latLng);
  
  // Add to path
  polyline.addLatLng(latLng);
  
  // Keep last 500 points
  const points = polyline.getLatLngs();
  if (points.length > 500) {
    polyline.setLatLngs(points.slice(-500));
  }
  
  // Center map
  map.panTo(latLng);
});
```

---

## 🔐 Authentication

JWT token phải được gửi khi kết nối:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('jwt_token')
  }
});
```

Nếu token invalid hoặc expired, kết nối sẽ bị reject với error:
```
Error: Invalid authentication token
```

---

## 📈 Performance Best Practices

### Client-side Throttling

```javascript
let lastRender = 0;
const RENDER_INTERVAL = 250; // 250ms = 4 FPS

socket.on('sensor_reading', (data) => {
  // Buffer data
  dataBuffer.push(data);
  
  // Throttle render
  const now = Date.now();
  if (now - lastRender >= RENDER_INTERVAL) {
    updateChart(dataBuffer);
    dataBuffer = [];
    lastRender = now;
  }
});
```

### Data Windowing

```javascript
const MAX_POINTS = 3000;

function addDataPoint(data) {
  dataPoints.push(data);
  
  if (dataPoints.length > MAX_POINTS) {
    dataPoints = dataPoints.slice(-MAX_POINTS);
  }
}
```

### Reconnection Strategy

```javascript
const socket = io('http://localhost:3000', {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-join rooms
  socket.emit('join', { devices: ['esp32-001'] });
});
```

---

## 🧪 Testing

### Test Socket Connection

```bash
cd e:\server_ship\backend
node scripts/test-socket-client.js
```

### Monitor Realtime Stats

```bash
curl http://localhost:3000/api/realtime/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "connectedClients": 5,
    "rooms": ["device:esp32-001", "device:esp32-002", "shipment:1"]
  }
}
```

---

## 🚀 Production Checklist

- [ ] Enable CORS with specific origin (update `CORS_ORIGIN` env)
- [ ] Use Redis adapter for multi-instance scaling
- [ ] Set up rate limiting per connection
- [ ] Monitor metrics (connected clients, emit rate)
- [ ] Configure load balancer sticky sessions
- [ ] Enable TLS/SSL for secure WebSocket (wss://)
- [ ] Implement proper error boundaries in frontend
- [ ] Add reconnection UI feedback
- [ ] Test with real network conditions (throttling, packet loss)

---

## 📚 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/realtime/stats` | GET | Get realtime statistics |
| `/api/realtime/health` | GET | Health check for realtime services |
| `/api/stream/devices/:id` | GET | SSE stream for device (fallback) |

---

## 🛠️ Troubleshooting

### Socket not connecting

1. Check JWT token is valid
2. Verify CORS settings
3. Check firewall/proxy allows WebSocket
4. Try SSE fallback

### Not receiving events

1. Verify you called `socket.emit('join', { devices: [...] })`
2. Check device is sending data via MQTT
3. Monitor backend logs for emit events
4. Check throttling isn't blocking events

### High latency

1. Reduce polling interval in SSE
2. Use WebSocket instead of polling transport
3. Implement client-side throttling
4. Check network bandwidth

---

For more info, see source code:
- `src/realtime/socket.js` - Socket.IO server
- `src/realtime/emitter.js` - Event emitters
- `src/routes/realtimeRoutes.js` - SSE and stats endpoints
