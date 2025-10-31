# API Reference Documentation

## Table of Contents
- [Authentication](#authentication)
- [IoT Data Ingestion](#iot-data-ingestion)
- [Device Management](#device-management)
- [Vehicle Tracking](#vehicle-tracking)
- [Order Management](#order-management)
- [Shipment Management](#shipment-management)
- [Analytics & Statistics](#analytics--statistics)
- [Realtime Data Stream](#realtime-data-stream)

## Base URL
```
http://localhost:3000
```

## Authentication

All endpoints except `/auth/login` and `/iot/data` require JWT authentication.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** The response contains only the JWT token. User details can be decoded from the token or fetched separately.

### Using Authentication
Include the JWT token in the `Authorization` header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## IoT Data Ingestion

### Submit Sensor Data
```http
POST /iot/data
Content-Type: application/json

{
  "deviceId": "ESP32-001",
  "timestamp": "2024-01-15T10:30:00Z",
  "temperature": 25.5,
  "humidity": 60.2,
  "vibration": 0.8,
  "gps": {
    "latitude": 10.762622,
    "longitude": 106.660172,
    "speed": 45.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data processed successfully"
}
```

**Notes:**
- This endpoint does NOT require authentication (designed for IoT devices)
- GPS coordinates are optional
- Sensor readings (temperature, humidity, vibration) will be saved as separate records
- GPS data creates a DeviceLocation record
- Real-time events are emitted via WebSocket to subscribed clients
- Rate limit: 60 requests/minute per deviceId

---

## Device Management

### List All Devices
```http
GET /device
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "deviceId": "ESP32-001",
      "name": "Temperature Sensor 1",
      "type": "SENSOR",
      "status": "ACTIVE",
      "location": "Warehouse A",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Device Details
```http
GET /device/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 1,
    "deviceId": "ESP32-001",
    "name": "Temperature Sensor 1",
    "type": "SENSOR",
    "status": "ACTIVE",
    "location": "Warehouse A",
    "shipments": [...],
    "vehicles": [...]
  }
}
```

### Register New Device
```http
POST /device
Authorization: Bearer {token}
Content-Type: application/json

{
  "deviceId": "ESP32-002",
  "name": "Humidity Sensor",
  "type": "SENSOR",
  "status": "ACTIVE",
  "location": "Warehouse B",
  "vehicleId": 1
}
```

### Update Device
```http
PUT /device/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Sensor Name",
  "status": "MAINTENANCE"
}
```

### Delete Device
```http
DELETE /device/:id
Authorization: Bearer {token}
```

### Get Device Sensor Data
```http
GET /device/:id/sensors?type=temperature&page=1&limit=50
Authorization: Bearer {token}
```

**Query Parameters:**
- `type` (optional): Filter by sensor type (temperature, humidity, vibration)
- `startTime` (optional): ISO 8601 timestamp
- `endTime` (optional): ISO 8601 timestamp
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": 123,
        "deviceId": "ESP32-001",
        "type": "temperature",
        "value": 25.5,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 250,
      "page": 1,
      "limit": 50,
      "totalPages": 5
    }
  }
}
```

### Get Device Location History
```http
GET /device/:id/location?page=1&limit=50
Authorization: Bearer {token}
```

**Query Parameters:**
- `startTime` (optional): ISO 8601 timestamp
- `endTime` (optional): ISO 8601 timestamp
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": 456,
        "deviceId": "ESP32-001",
        "latitude": 10.762622,
        "longitude": 106.660172,
        "speed": 45.5,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50,
      "totalPages": 2
    }
  }
}
```

---

## Vehicle Tracking

### List All Vehicles
```http
GET /vehicles
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": 1,
      "vehicleId": "TRUCK-001",
      "licensePlate": "29A-12345",
      "type": "TRUCK",
      "status": "ACTIVE",
      "driver": "Nguyen Van A"
    }
  ]
}
```

### Get Vehicle Details
```http
GET /vehicles/:id
Authorization: Bearer {token}
```

### Track Vehicle Location
```http
GET /vehicles/:id/track?page=1&limit=50
Authorization: Bearer {token}
```

**Query Parameters:**
- `startTime` (optional): ISO 8601 timestamp
- `endTime` (optional): ISO 8601 timestamp
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "id": 1,
      "vehicleId": "TRUCK-001",
      "licensePlate": "29A-12345"
    },
    "tracking": [
      {
        "latitude": 10.762622,
        "longitude": 106.660172,
        "speed": 45.5,
        "timestamp": "2024-01-15T10:30:00Z",
        "deviceId": "ESP32-001"
      }
    ],
    "pagination": {
      "total": 200,
      "page": 1,
      "limit": 50,
      "totalPages": 4
    }
  }
}
```

---

## Order Management

### List All Orders
```http
GET /orders
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "orderId": "ORD-2024-001",
      "customerName": "ABC Company",
      "status": "IN_TRANSIT",
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### Get Order Details
```http
GET /orders/:id
Authorization: Bearer {token}
```

### Track Order Location
```http
GET /orders/:id/track
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "orderId": "ORD-2024-001",
    "customerName": "ABC Company",
    "status": "IN_TRANSIT"
  },
  "tracking": [
    {
      "latitude": 10.762622,
      "longitude": 106.660172,
      "speed": 45.5,
      "timestamp": "2024-01-15T10:30:00Z",
      "deviceId": "ESP32-001",
      "vehicleId": "TRUCK-001"
    }
  ]
}
```

---

## Shipment Management

### Create Shipment
```http
POST /shipments
Authorization: Bearer {token}
Content-Type: application/json

{
  "deviceIds": ["ESP32-001", "ESP32-002"],
  "vehicleId": 1,
  "orderIds": [1, 2],
  "status": "PENDING",
  "origin": "Warehouse A",
  "destination": "Customer Site B",
  "scheduledDeparture": "2024-01-16T08:00:00Z",
  "estimatedArrival": "2024-01-16T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "id": 1,
    "status": "PENDING",
    "origin": "Warehouse A",
    "destination": "Customer Site B",
    "scheduledDeparture": "2024-01-16T08:00:00Z",
    "estimatedArrival": "2024-01-16T12:00:00Z",
    "actualDeparture": null,
    "actualArrival": null,
    "devices": [...],
    "vehicle": {...},
    "orders": [...]
  }
}
```

### List Shipments
```http
GET /shipments?page=1&limit=20&status=IN_TRANSIT
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Items per page
- `status` (optional): Filter by status (PENDING, IN_TRANSIT, DELIVERED, CANCELLED)

**Response:**
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "status": "IN_TRANSIT",
        "origin": "Warehouse A",
        "destination": "Customer Site B",
        "scheduledDeparture": "2024-01-16T08:00:00Z",
        "estimatedArrival": "2024-01-16T12:00:00Z",
        "devices": [...],
        "vehicle": {...}
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### Get Shipment Details with Tracking
```http
GET /shipments/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "id": 1,
    "status": "IN_TRANSIT",
    "origin": "Warehouse A",
    "destination": "Customer Site B",
    "devices": [...],
    "vehicle": {...},
    "orders": [...],
    "sensorReadings": [
      {
        "deviceId": "ESP32-001",
        "type": "temperature",
        "value": 25.5,
        "timestamp": "2024-01-16T09:30:00Z"
      }
    ],
    "locations": [
      {
        "deviceId": "ESP32-001",
        "latitude": 10.762622,
        "longitude": 106.660172,
        "speed": 45.5,
        "timestamp": "2024-01-16T09:30:00Z"
      }
    ],
    "alerts": [
      {
        "type": "TEMPERATURE_HIGH",
        "message": "Temperature exceeds threshold",
        "severity": "WARNING",
        "timestamp": "2024-01-16T09:35:00Z"
      }
    ]
  }
}
```

### Update Shipment
```http
PUT /shipments/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "IN_TRANSIT",
  "actualDeparture": "2024-01-16T08:15:00Z"
}
```

### Delete Shipment
```http
DELETE /shipments/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipment deleted successfully"
}
```

### Get Shipment Statistics
```http
GET /shipments/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "byStatus": {
      "PENDING": 10,
      "IN_TRANSIT": 30,
      "DELIVERED": 55,
      "CANCELLED": 5
    }
  }
}
```

---

## Analytics & Statistics

### Get Dashboard Overview
```http
GET /analytics/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": {
      "total": 50,
      "active": 45,
      "withAlerts": 5
    },
    "recentAlerts": [
      {
        "type": "TEMPERATURE_HIGH",
        "count": 12
      },
      {
        "type": "HUMIDITY_HIGH",
        "count": 5
      }
    ],
    "shipments": {
      "total": 100,
      "byStatus": {
        "PENDING": 10,
        "IN_TRANSIT": 30,
        "DELIVERED": 55,
        "CANCELLED": 5
      },
      "avgDuration": "4:35:00"
    },
    "timestamp": "2024-01-16T10:00:00Z"
  }
}
```

### Get Device Statistics
```http
GET /analytics/devices
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 45,
    "withAlerts": 5
  }
}
```

### Get Sensor Statistics
```http
GET /analytics/sensors/:deviceId?type=temperature&startTime=2024-01-15T00:00:00Z&endTime=2024-01-16T00:00:00Z
Authorization: Bearer {token}
```

**Query Parameters (required):**
- `type`: Sensor type (temperature, humidity, vibration)

**Query Parameters (optional):**
- `startTime`: ISO 8601 timestamp (default: last 24 hours)
- `endTime`: ISO 8601 timestamp (default: now)

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32-001",
    "type": "temperature",
    "count": 1440,
    "min": 18.5,
    "max": 32.8,
    "avg": 25.3,
    "startTime": "2024-01-15T00:00:00Z",
    "endTime": "2024-01-16T00:00:00Z"
  }
}
```

### Get Alert Statistics
```http
GET /analytics/alerts?startTime=2024-01-10T00:00:00Z&endTime=2024-01-16T00:00:00Z
Authorization: Bearer {token}
```

**Query Parameters (optional):**
- `startTime`: ISO 8601 timestamp (default: last 7 days)
- `endTime`: ISO 8601 timestamp (default: now)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAlerts": 45,
    "byType": [
      {
        "type": "TEMPERATURE_HIGH",
        "count": 25
      },
      {
        "type": "HUMIDITY_HIGH",
        "count": 12
      },
      {
        "type": "VIBRATION_HIGH",
        "count": 8
      }
    ],
    "startTime": "2024-01-10T00:00:00Z",
    "endTime": "2024-01-16T00:00:00Z"
  }
}
```

### Get Shipment Statistics
```http
GET /analytics/shipments?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z
Authorization: Bearer {token}
```

**Query Parameters (optional):**
- `startTime`: ISO 8601 timestamp (default: last 30 days)
- `endTime`: ISO 8601 timestamp (default: now)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "byStatus": {
      "PENDING": 10,
      "IN_TRANSIT": 30,
      "DELIVERED": 55,
      "CANCELLED": 5
    },
    "avgDuration": "4:35:00",
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-31T23:59:59Z"
  }
}
```

---

## Realtime Data Stream

### WebSocket Connection

Connect to Socket.IO server for realtime updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to device updates
  socket.emit('subscribe:device', { deviceId: 'ESP32-001' });
  
  // Subscribe to shipment updates
  socket.emit('subscribe:shipment', { shipmentId: 1 });
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

### Subscribe to Device Updates
```javascript
socket.emit('subscribe:device', { deviceId: 'ESP32-001' });

// Listen for sensor readings
socket.on('sensor:reading', (data) => {
  console.log('Sensor update:', data);
  // {
  //   deviceId: 'ESP32-001',
  //   type: 'temperature',
  //   value: 25.5,
  //   timestamp: '2024-01-16T10:30:00Z'
  // }
});

// Listen for location updates
socket.on('device:location', (data) => {
  console.log('Location update:', data);
  // {
  //   deviceId: 'ESP32-001',
  //   latitude: 10.762622,
  //   longitude: 106.660172,
  //   speed: 45.5,
  //   timestamp: '2024-01-16T10:30:00Z'
  // }
});

// Listen for alerts
socket.on('alert:new', (data) => {
  console.log('Alert:', data);
  // {
  //   deviceId: 'ESP32-001',
  //   type: 'TEMPERATURE_HIGH',
  //   message: 'Temperature exceeds threshold',
  //   severity: 'WARNING',
  //   timestamp: '2024-01-16T10:30:00Z'
  // }
});
```

### Subscribe to Shipment Updates
```javascript
socket.emit('subscribe:shipment', { shipmentId: 1 });

// All events from devices in the shipment will be received
socket.on('sensor:reading', (data) => { /* ... */ });
socket.on('device:location', (data) => { /* ... */ });
socket.on('alert:new', (data) => { /* ... */ });
```

### Unsubscribe
```javascript
socket.emit('unsubscribe:device', { deviceId: 'ESP32-001' });
socket.emit('unsubscribe:shipment', { shipmentId: 1 });
```

### Server-Sent Events (SSE) Fallback

For clients that don't support WebSocket:

```javascript
const eventSource = new EventSource(
  'http://localhost:3000/api/stream/devices/ESP32-001',
  {
    headers: {
      'Authorization': 'Bearer your-jwt-token'
    }
  }
);

eventSource.addEventListener('sensor', (e) => {
  const data = JSON.parse(e.data);
  console.log('Sensor update:', data);
});

eventSource.addEventListener('location', (e) => {
  const data = JSON.parse(e.data);
  console.log('Location update:', data);
});

eventSource.addEventListener('alert', (e) => {
  const data = JSON.parse(e.data);
  console.log('Alert:', data);
});

eventSource.onerror = (err) => {
  console.error('SSE error:', err);
  eventSource.close();
};
```

### Get Realtime Statistics
```http
GET /api/realtime/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "connectedClients": 12,
    "emittedEvents": {
      "sensor:reading": 1250,
      "device:location": 450,
      "alert:new": 15
    }
  }
}
```

---

## Rate Limits

- **General API endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints** (`/auth/*`): 5 requests per 15 minutes per IP
- **IoT data ingestion** (`/iot/*`): 60 requests per minute per deviceId

When rate limit is exceeded, you'll receive:
```json
{
  "error": "Too many requests, please try again later."
}
```
HTTP Status: `429 Too Many Requests`

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": {
    "deviceId": "deviceId is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Device not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Data Throttling

Realtime WebSocket events are throttled to prevent overwhelming clients:

- **Sensor readings**: Maximum 2 updates per second (500ms throttle)
- **Location updates**: Maximum 1 update per second (1000ms throttle)
- **Alerts**: No throttling (immediate delivery)

This ensures smooth frontend performance while maintaining data freshness.

---

## Examples

### Complete Device Monitoring Flow

```javascript
// 1. Authenticate
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
});
const { token } = await loginResponse.json();

// 2. Connect to WebSocket
const socket = io('http://localhost:3000', {
  auth: { token }
});

// 3. Subscribe to device updates
socket.emit('subscribe:device', { deviceId: 'ESP32-001' });

// 4. Listen for realtime updates
socket.on('sensor:reading', (data) => {
  updateChart(data); // Update your UI
});

socket.on('device:location', (data) => {
  updateMap(data); // Update map marker
});

socket.on('alert:new', (data) => {
  showNotification(data); // Show alert popup
});

// 5. Fetch historical data for initial chart
const historyResponse = await fetch(
  'http://localhost:3000/device/1/sensors?type=temperature&limit=100',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const history = await historyResponse.json();
initializeChart(history.data.readings);
```

### Shipment Tracking Dashboard

```javascript
// 1. Get dashboard overview
const dashboard = await fetch('http://localhost:3000/analytics/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const overview = await dashboard.json();
renderDashboard(overview.data);

// 2. List active shipments
const shipments = await fetch('http://localhost:3000/shipments?status=IN_TRANSIT', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const activeShipments = await shipments.json();

// 3. Subscribe to all active shipments
activeShipments.data.shipments.forEach(shipment => {
  socket.emit('subscribe:shipment', { shipmentId: shipment.id });
});

// 4. Handle realtime updates
socket.on('device:location', (data) => {
  updateShipmentMarker(data);
});

socket.on('alert:new', (data) => {
  if (data.severity === 'CRITICAL') {
    triggerAlertNotification(data);
  }
});
```

---

## Notes

- All timestamps use ISO 8601 format (UTC timezone)
- Pagination defaults: page=1, limit varies by endpoint (typically 20-50)
- Maximum pagination limit: 100 items per page
- WebSocket authentication required via JWT in connection handshake
- SSE endpoints use same authentication as REST API (Bearer token)
- MQTT broker is NOT exposed to the internet - use REST API for data ingestion

For more details on realtime integration, see [REALTIME_GUIDE.md](./REALTIME_GUIDE.md).
