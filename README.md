## IoT Logistics Backend (Node.js + Express + Prisma)

Production-ready backend for smart delivery with IoT devices (ESP32). Supports REST + MQTT ingestion, AES-256-GCM payload decryption, JWT auth, PostgreSQL storage, and alerting via MQTT.

### Stack
- Node.js 20, Express (ES Modules)
- Prisma ORM + PostgreSQL
- MQTT (Mosquitto)
- JWT (jsonwebtoken)
- AES-256-GCM (crypto)
- Winston + Pino HTTP logging
- Docker + Docker Compose

### Quick Start
1) Copy env and review values
```bash
cp .env.example .env
```

2) Install deps
```bash
npm install
```

3) Start with Docker Compose
```bash
docker-compose up --build
```
This will bring up Postgres, Mosquitto, run migrations, seed data, and start the backend at http://localhost:3000.

#### Local without Docker
```bash
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### REST API
- POST `/auth/login` - { email, password } => { token }
- POST `/auth/device` - { deviceId, secret } => { token } (tạm thời-sau này sẽ sử dụng Challenge – Response để thay thế)
- POST `/iot/data` - Ingest IoT payload (JWT required)
- GET `/orders/:id/tracking` - Latest data for order
- GET `/vehicles/:id/track` - GPS track for vehicle
- GET `/config/device/:id` - Device thresholds
- POST `/config/device/:id/update` - Upsert threshold

### MQTT Topics
- `iot/{device_id}/data` - device -> server (encrypted)
- `iot/{device_id}/alert` - server -> device alerts
- `iot/{device_id}/config` - server -> device config (future)

### Payload Format
HTTP/MQTT body:
```json
{
  "device_id": "esp32-001",
  "encrypted_data": {
    "ciphertext": "...base64...",
    "iv": "...base64...",
    "authTag": "...base64..."
  }
}
```
Decrypted plaintext JSON:
```json
{
  "temperature": 5.1,
  "humidity": 56.3,
  "gps": { "lat": 10.78, "lon": 106.66 },
  "orderId": 1,
  "vehicleId": 1
}
```

### Architecture (Mermaid)
```mermaid
flowchart LR
  subgraph Device[ESP32 Devices]
    D1((ESP32))
  end
  subgraph Broker[Mosquitto MQTT]
    B1[(MQTT Broker)]
  end
  subgraph Backend[Node.js Backend]
    G[IoT Gateway (MQTT Listener)]
    R[REST API (Express)]
    S[Services: IoT, Alert, Threshold]
    A[Auth]
  end
  subgraph DB[(PostgreSQL)]
    P[(Prisma ORM)]
  end

  D1 -- iot/{device}/data --> B1
  B1 -- subscribe --> G
  R -- /iot/data --> S
  S -- read/write --> P
  P --- DB
  S -- alerts --> B1
```

### IoT Data Flow
1. Device sends `{ device_id, encrypted_data }` via MQTT topic `iot/{device_id}/data` or REST `/iot/data` with JWT.
2. Backend authenticates JWT (for REST) and looks up device by `device_id` to get AES key.
3. Decrypt AES-256-GCM payload, parse JSON.
4. Persist to `SensorData` with GPS/temperature/humidity.
5. Check `Threshold` per device; if out of range, create `Alert` and publish MQTT `iot/{device_id}/alert`.
6. Dashboard/mobile consumes REST endpoints for tracking.

### Notes
- Use HTTPS in production (behind reverse proxy).
- Rotate JWT secrets and device secrets periodically.
- Ensure devices and server share the same AES key per device.

## Kiến trúc dự án (Architecture)

### Thành phần chính
- Backend (Express, ESM): xử lý REST, MQTT, xác thực, giải mã, lưu DB, phát cảnh báo.
- PostgreSQL + Prisma: lưu trữ users, devices, shipments, orders, sensorData, thresholds, alerts.
- Mosquitto (MQTT): nhận dữ liệu từ thiết bị; backend subscribe `iot/+/data` và publish alert/config.
- Logger: Pino cho HTTP và Winston cho ứng dụng.

### Cấu trúc thư mục
```
src/
  app.js                # cấu hình Express, routes, middlewares
  server.js             # khởi động HTTP + MQTT + DB
  config/
    database.js         # Prisma client + connectDb
    mqtt.js             # khởi tạo MQTT client và subscribe topics
    jwt.js              # thông số JWT
    crypto.js           # thông số AES-256-GCM
    dotenv.js           # nạp biến môi trường
  controllers/          # xử lý HTTP cho từng module
    authController.js
    iotController.js
    orderController.js
    vehicleController.js
    configController.js
  services/             # nghiệp vụ lõi
    iotService.js       # parse/decrypt/persist sensor data
    alertService.js     # kiểm tra ngưỡng và phát cảnh báo
    thresholdService.js # CRUD ngưỡng theo thiết bị
  routes/               # khai báo endpoints
    authRoutes.js
    iotRoutes.js
    orderRoutes.js
    vehicleRoutes.js
    configRoutes.js
  middleware/
    auth.js             # JWT auth middleware
    errorHandler.js     # 404 + global error handler
  utils/
    logger.js           # Winston + Pino logger
    encryption.js       # AES-256-GCM encrypt/decrypt helpers
    response.js         # helpers phản hồi chuẩn JSON
prisma/
  schema.prisma         # mô hình dữ liệu
  seed.js               # dữ liệu mẫu
mosquitto/
  mosquitto.conf        # cho phép kết nối từ container khác
```

### Mô hình dữ liệu (tóm tắt)
- `User`: tài khoản quản trị/ứng dụng.
- `Device`: thiết bị IoT (deviceId, encryptionKey đối xứng AES, secretHash để lấy JWT).
- `Vehicle`: phương tiện vận chuyển.
- `Order`: đơn hàng.
- `Shipment`: gắn `Order` + `Device` + `Vehicle` theo chuyến.
- `SensorData`: nhiệt độ, độ ẩm, GPS theo thời gian.
- `Threshold`: ngưỡng theo thiết bị cho nhiệt độ/độ ẩm.
- `Alert`: lưu cảnh báo khi vượt ngưỡng.

## Bảo mật & xác thực
- JWT áp dụng cho user và device.
- Device lấy JWT qua `/auth/device` bằng `deviceId` + `secret` (hash lưu trong DB).
- Payload từ device gửi lên phải mã hóa AES-256-GCM. Khóa đối xứng lấy từ `Device.encryptionKey` trên server.

## Dòng dữ liệu IoT chi tiết
1. Thiết bị gửi MQTT `iot/{device_id}/data` hoặc REST `/iot/data` (header Bearer token với JWT device).
2. Backend tìm `Device` theo `device_id`, lấy khóa AES.
3. Giải mã `encrypted_data` bằng AES-256-GCM → JSON `{ temperature, humidity, gps, orderId, vehicleId }`.
4. Lưu `SensorData` (bao gồm GPS nếu có).
5. Đọc `Threshold` theo thiết bị, so sánh giá trị; nếu vượt ngưỡng → tạo `Alert` và publish MQTT `iot/{device_id}/alert`.

## Tài liệu MQTT

### Publish từ thiết bị → server
- Topic: `iot/{device_id}/data`
- Payload (JSON):
```json
{
  "device_id": "esp32-001",
  "encrypted_data": {
    "ciphertext": "base64",
    "iv": "base64",
    "authTag": "base64"
  }
}
```

### Publish từ server → thiết bị
- Topic: `iot/{device_id}/alert`
- Payload (JSON):
```json
{
  "alerts": [
    { "type": "temperature", "value": 9.5, "thresholdId": 1 }
  ],
  "at": "2025-01-01T00:00:00.000Z"
}
```

## Hướng dẫn sử dụng REST API

### 1) Auth

#### Đăng nhập user
- Method: POST
- URL: `/auth/login`
- Body:
```json
{ "email": "admin@example.com", "password": "admin123" }
```
- 200 OK:
```json
{ "token": "<jwt>" }
```
- Curl:
```bash
curl -sS -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

#### Xác thực thiết bị
- Method: POST
- URL: `/auth/device`
- Body:
```json
{ "deviceId": "esp32-001", "secret": "devicesecret" }
```
- 200 OK:
```json
{ "token": "<jwt>" }
```

### 2) Ingest dữ liệu IoT (REST)
- Method: POST
- URL: `/iot/data`
- Headers: `Authorization: Bearer <device_jwt>`
- Body:
```json
{
  "device_id": "esp32-001",
  "encrypted_data": {
    "ciphertext": "...",
    "iv": "...",
    "authTag": "..."
  }
}
```
- 201 Created:
```json
{ "success": true, "data": { "id": 1, "deviceId": 1, "createdAt": "...", "temperature": 5.2, "humidity": 60.1, "latitude": 10.78, "longitude": 106.66, "orderId": 1, "vehicleId": 1 } }
```

### 3) Tracking đơn hàng
- Method: GET
- URL: `/orders/:id/tracking`
- Headers: `Authorization: Bearer <user_jwt>`
- 200 OK:
```json
{ "success": true, "data": [ { "id": 10, "temperature": 5.1, "humidity": 56.2, "latitude": 10.78, "longitude": 106.66, "createdAt": "..." } ] }
```

### 4) Vị trí xe
- Method: GET
- URL: `/vehicles/:id/track`
- Headers: `Authorization: Bearer <user_jwt>`
- 200 OK:
```json
{ "success": true, "data": [ { "latitude": 10.78, "longitude": 106.66, "createdAt": "..." } ] }
```

### 5) Cấu hình ngưỡng theo thiết bị

#### Lấy ngưỡng
- Method: GET
- URL: `/config/device/:id` (id là `deviceId`, ví dụ `esp32-001`)
- Headers: `Authorization: Bearer <user_jwt>`
- 200 OK:
```json
{ "success": true, "data": { "deviceId": "esp32-001", "thresholds": [ { "type": "temperature", "min": 2, "max": 8 } ] } }
```

#### Cập nhật/Upsert ngưỡng
- Method: POST
- URL: `/config/device/:id/update`
- Headers: `Authorization: Bearer <user_jwt>`
- Body:
```json
{ "type": "temperature", "min": 2, "max": 8 }
```
- 200 OK: trả về bản ghi `Threshold` sau upsert.

## Ví dụ mã hóa AES-256-GCM (demo)
Thiết bị cần chia sẻ khóa với server (giá trị trong `Device.encryptionKey`). Ví dụ Node.js phía client:
```js
import crypto from 'crypto'
const key = Buffer.from('0123456789abcdef0123456789abcdef') // 32 bytes
const iv = crypto.randomBytes(12)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
const data = JSON.stringify({ temperature: 5.2, humidity: 61, gps: { lat: 10.78, lon: 106.66 }, orderId: 1, vehicleId: 1 })
const ciphertext = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
const authTag = cipher.getAuthTag()
// gửi { device_id, encrypted_data: { ciphertext: b64, iv: b64, authTag: b64 } }
```

## Mã lỗi & xử lý lỗi
- 400: dữ liệu đầu vào không hợp lệ (Joi validation).
- 401: thiếu/không hợp lệ JWT.
- 404: không tìm thấy tài nguyên.
- 500: lỗi hệ thống; xem logs để biết chi tiết.

## Khuyến nghị triển khai
- Đặt backend sau reverse proxy (Nginx/Traefik) và bật HTTPS.
- Bật auth trên Mosquitto trong môi trường sản xuất; tắt `allow_anonymous` và dùng user/pass/TLS.
- Tạo chỉ mục DB theo `orderId`, `vehicleId`, `deviceId`, `createdAt` để tối ưu truy vấn tracking.

