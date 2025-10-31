# Realtime IoT Backend - Migration Summary

## ✅ Hoàn thành

### 1. Database Schema Migration
- ✅ Tách `SensorData` thành:
  - `SensorReading` - Dữ liệu cảm biến đơn lẻ (temperature, humidity, pressure)
  - `DeviceLocation` - Tọa độ GPS riêng biệt
- ✅ Thêm `ShipmentOrder` - Quan hệ nhiều-nhiều giữa Shipment và Order
- ✅ Cập nhật seed data phù hợp schema mới

### 2. Backend Services
- ✅ Cập nhật `iotService.js` - Xử lý và lưu dữ liệu theo cấu trúc mới
- ✅ Cập nhật `alertService.js` - Logic đánh giá ngưỡng với sensor types
- ✅ Cập nhật `deviceController.js` - API lấy sensor readings và location history
- ✅ Thêm validation cho sensor types (temperature, humidity, pressure)

### 3. Realtime Infrastructure ⭐ NEW
- ✅ **Socket.IO Server** (`src/realtime/socket.js`)
  - JWT authentication middleware
  - Room-based subscriptions (device:<id>, shipment:<id>)
  - Authorization checks
  - Connection/disconnect handling
  
- ✅ **Event Emitters** (`src/realtime/emitter.js`)
  - `emitSensorReading()` - Throttled 2 Hz
  - `emitDeviceLocation()` - Throttled 1 Hz
  - `emitAlert()` - No throttling (realtime)
  - Batch emit support
  - Statistics tracking
  
- ✅ **Throttle Utility** (`src/utils/throttle.js`)
  - Key-based rate limiting
  - Memory leak prevention
  - Auto cleanup old entries

### 4. API Endpoints
- ✅ `GET /device/:id/sensors` - Lấy lịch sử sensor readings
- ✅ `GET /device/:id/location` - Lấy lịch sử location tracking
- ✅ `GET /api/stream/devices/:id` - SSE fallback cho WebSocket
- ✅ `GET /api/realtime/stats` - Thống kê realtime connections
- ✅ `GET /api/realtime/health` - Health check cho realtime services

### 5. Integration Points
- ✅ Emit events từ `iotService.js` khi lưu sensor/location data
- ✅ Emit alerts từ `alertService.js` khi phát hiện vượt ngưỡng
- ✅ Socket.IO attached vào HTTP server trong `server.js`
- ✅ Realtime routes registered trong `app.js`

### 6. Documentation & Testing
- ✅ **REALTIME_GUIDE.md** - Hướng dẫn chi tiết frontend integration
  - React examples
  - Vue examples
  - Chart.js integration
  - Leaflet map integration
  - Performance best practices
  
- ✅ **test-socket-client.js** - Node.js test client
  - CLI tool để test WebSocket connection
  - Event monitoring
  - Statistics summary
  
- ✅ **test-client.html** - Browser-based test UI
  - Visual monitoring dashboard
  - Real-time event display
  - Connection management

---

## 🎯 Event Contracts

### sensor_reading
```json
{
  "deviceId": "esp32-001",
  "type": "temperature|humidity|pressure",
  "value": 5.5,
  "createdAt": "2025-10-31T10:30:00.000Z"
}
```
**Throttle**: 500ms (2 Hz max)

### device_location
```json
{
  "deviceId": "esp32-001",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "createdAt": "2025-10-31T10:30:01.000Z"
}
```
**Throttle**: 1000ms (1 Hz max)

### alert
```json
{
  "deviceId": "esp32-001",
  "type": "temperature",
  "value": 12.5,
  "thresholdId": 1,
  "createdAt": "2025-10-31T10:30:02.000Z"
}
```
**Throttle**: None (realtime)

---

## 🚀 Cách sử dụng

### Khởi động Backend
```bash
cd e:\server_ship\backend
docker-compose up --build -d
```

### Test WebSocket Connection (Node.js)
```bash
# Get JWT token first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Test socket với token
node scripts/test-socket-client.js esp32-001 <YOUR_JWT_TOKEN>
```

### Test trong Browser
1. Mở `docs/test-client.html` trong browser
2. Nhập JWT token (lấy từ login API)
3. Nhập Device ID (ví dụ: `esp32-001`)
4. Click "Connect"
5. Gửi dữ liệu qua MQTT để xem realtime events

### Gửi test data qua MQTT
```bash
node scripts/publish-test.js
```

---

## 📊 Kiến trúc Realtime

```
IoT Device (MQTT)
     ↓
MQTT Broker (Mosquitto)
     ↓
Backend (iotService.js)
     ├─→ Database (Prisma/PostgreSQL)
     └─→ Realtime Emitters
          ├─→ Socket.IO (WebSocket)
          │    └─→ Frontend Clients
          └─→ SSE Fallback
               └─→ Legacy Clients
```

---

## 🔐 Security

- ✅ JWT authentication required cho WebSocket
- ✅ JWT authentication required cho SSE
- ✅ Authorization checks trước khi join rooms
- ✅ Admin role có quyền truy cập tất cả devices
- ✅ Rate limiting qua throttle mechanism

---

## 📈 Performance Optimization

- ✅ Throttling: GPS 1 Hz, Sensors 2 Hz
- ✅ Memory leak prevention trong throttle map
- ✅ Room-based targeting (không broadcast toàn bộ)
- ✅ Decimation support cho frontend charts
- ✅ Data windowing (giới hạn số điểm lưu trong RAM)

---

## 🔄 Data Flow

### Ingest Flow
```
MQTT Message
  → handleIncomingMqttData()
  → processPayload()
  → processSensorReadings() / processLocation()
  → Prisma.create()
  → emitSensorReading() / emitDeviceLocation()
  → Socket.IO → Frontend
```

### Alert Flow
```
Sensor Data
  → evaluateAndAlert()
  → Check thresholds
  → Prisma.alert.create()
  → MQTT publish (device notification)
  → emitAlert()
  → Socket.IO → Frontend
```

---

## 🛠️ Files Modified/Created

### Modified
- ✅ `prisma/schema.prisma` - Schema mới
- ✅ `prisma/seed.js` - Seed data mới
- ✅ `src/server.js` - Init Socket.IO
- ✅ `src/app.js` - Register realtime routes
- ✅ `src/services/iotService.js` - Emit events
- ✅ `src/services/alertService.js` - Emit alerts
- ✅ `src/controllers/deviceController.js` - New endpoints
- ✅ `src/routes/deviceRoutes.js` - Sensor/location routes
- ✅ `package.json` - Added socket.io dependency

### Created
- ✅ `src/realtime/socket.js` - Socket.IO server
- ✅ `src/realtime/emitter.js` - Event emitters
- ✅ `src/utils/throttle.js` - Throttle utility
- ✅ `src/routes/realtimeRoutes.js` - SSE + stats endpoints
- ✅ `docs/REALTIME_GUIDE.md` - Frontend integration guide
- ✅ `docs/test-client.html` - Browser test UI
- ✅ `scripts/test-socket-client.js` - CLI test tool

---

## 📝 Migration Notes

### Breaking Changes
- ⚠️ `SensorData` table đã bị xóa - thay bằng `SensorReading` + `DeviceLocation`
- ⚠️ Shipment không còn trực tiếp liên kết với Order - dùng `ShipmentOrder`
- ⚠️ MQTT payload format đã thay đổi - xem `iotService.js` validation schema

### Backward Compatibility
- ✅ Các API cũ vẫn hoạt động
- ✅ MQTT broker connection không đổi
- ✅ Authentication mechanism không đổi

### Database
- Migration tự động khi chạy `prisma migrate`
- Seed data mới phù hợp với schema
- Backup tables được tạo tự động (nếu dùng migration script)

---

## 🧪 Testing Checklist

- [x] ✅ Socket.IO connection với valid JWT
- [x] ✅ Socket.IO reject invalid JWT
- [x] ✅ Room join authorization
- [x] ✅ Sensor reading events emitted
- [x] ✅ Location events emitted
- [x] ✅ Alert events emitted
- [x] ✅ Throttling hoạt động đúng
- [x] ✅ SSE fallback hoạt động
- [x] ✅ Stats endpoint trả về data
- [ ] 🔄 Load testing với 100+ devices
- [ ] 🔄 Memory leak testing
- [ ] 🔄 Reconnection handling
- [ ] 🔄 Multi-instance scaling với Redis

---

## 🚧 TODO / Future Enhancements

### P1 (Next Sprint)
- [ ] Redis adapter cho Socket.IO scaling
- [ ] Rate limiting per connection
- [ ] Metrics/monitoring dashboard
- [ ] Load testing và optimization
- [ ] User-device relationship trong DB
- [ ] Shipment aggregation (nhiều devices)

### P2 (Future)
- [ ] Playback chuyến đi (replay shipment)
- [ ] Real-time statistics rollups
- [ ] Export báo cáo PDF
- [ ] Alert notifications (email, SMS, push)
- [ ] WebRTC cho video streaming (nếu cần)
- [ ] GraphQL subscriptions (alternative)

---

## 📚 References

- Socket.IO Documentation: https://socket.io/docs/v4/
- Prisma Documentation: https://www.prisma.io/docs
- Chart.js Decimation: https://www.chartjs.org/docs/latest/configuration/decimation.html
- Leaflet Documentation: https://leafletjs.com/

---

## 💡 Tips

1. **JWT Token**: Lấy từ `/auth/login` endpoint
2. **Device ID**: Mặc định seed có `esp32-001`, `esp32-002`
3. **Test MQTT**: Dùng `scripts/publish-test.js`
4. **Monitor Logs**: `docker-compose logs -f backend`
5. **Check Stats**: `GET /api/realtime/stats`

---

**Lưu ý**: Hệ thống realtime đã sẵn sàng cho production với một vài điều chỉnh (Redis adapter, monitoring, security hardening).
