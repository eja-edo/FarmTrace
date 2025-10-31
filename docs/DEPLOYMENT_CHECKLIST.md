# Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Configuration
- [ ] Set `DATABASE_URL` in `.env`
- [ ] Set `JWT_SECRET` (use strong random key)
- [ ] Set `MQTT_BROKER_URL`
- [ ] Set `LOG_LEVEL=info` for production
- [ ] Set `CORS_ORIGIN` with actual frontend URL
- [ ] Set `NODE_ENV=production`

### 2. Database Setup
```bash
# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
node prisma/seed.js

# Verify schema
npx prisma db pull
```

### 3. Dependencies Installation
```bash
# Install production dependencies
npm ci --production

# Or install all (including dev)
npm install
```

### 4. Build & Test
```bash
# Run linter (if configured)
npm run lint

# Run tests (if configured)
npm test

# Test database connection
npx prisma db execute --preview-feature --stdin <<< "SELECT 1"
```

---

## Deployment Methods

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

**Services Started:**
- PostgreSQL on port 5432
- Mosquitto MQTT on port 1883
- Backend API on port 3000

### Option 2: Docker (Backend Only)

```bash
# Build image
docker build -t iot-logistics-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e MQTT_BROKER_URL="mqtt://..." \
  --name backend \
  iot-logistics-backend

# Check logs
docker logs -f backend
```

### Option 3: PM2 (Node Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name iot-backend

# Save process list
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# Logs
pm2 logs iot-backend

# Restart
pm2 restart iot-backend
```

### Option 4: Systemd Service

Create `/etc/systemd/system/iot-backend.service`:

```ini
[Unit]
Description=IoT Logistics Backend
After=network.target postgresql.service

[Service]
Type=simple
User=node
WorkingDirectory=/opt/iot-backend
Environment="NODE_ENV=production"
EnvironmentFile=/opt/iot-backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable iot-backend

# Start service
sudo systemctl start iot-backend

# Check status
sudo systemctl status iot-backend

# View logs
sudo journalctl -u iot-backend -f
```

---

## Post-Deployment Verification

### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "time": "2024-01-16T10:00:00.000Z"
}
```

### 2. Database Connection
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Or for native installation
tail -f /var/log/postgresql/postgresql-*.log
```

### 3. MQTT Connection
```bash
# Subscribe to test topic
mosquitto_sub -h localhost -p 1883 -t "test/topic"

# Publish test message
mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "Hello"
```

### 4. API Authentication
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### 5. WebSocket Connection
```bash
# Run test client
node scripts/test-socket-client.js

# Or open browser test client
# Open docs/test-client.html in browser
```

### 6. Test IoT Data Ingestion
```bash
# Get JWT token first
TOKEN="your-jwt-token-here"

# Submit test sensor data
curl -X POST http://localhost:3000/iot/data \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32-001",
    "timestamp": "2024-01-16T10:00:00Z",
    "temperature": 25.5,
    "humidity": 60.2,
    "vibration": 0.8,
    "gps": {
      "latitude": 10.762622,
      "longitude": 106.660172,
      "speed": 45.5
    }
  }'
```

---

## Monitoring & Maintenance

### Application Logs

**Docker:**
```bash
docker-compose logs -f backend
```

**PM2:**
```bash
pm2 logs iot-backend
```

**Systemd:**
```bash
sudo journalctl -u iot-backend -f
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d iot_logistics

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries (if logging enabled)
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Performance Metrics

```bash
# Get realtime statistics
curl http://localhost:3000/api/realtime/stats \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard overview
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Resource Usage

**Docker:**
```bash
# Container stats
docker stats backend postgres mosquitto

# Disk usage
docker system df
```

**System:**
```bash
# CPU and memory
top -p $(pgrep -f "node src/server.js")

# Network connections
netstat -an | grep :3000
ss -tn | grep :3000

# Open files
lsof -p $(pgrep -f "node src/server.js")
```

---

## Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump \
  -U postgres \
  -d iot_logistics \
  -F c \
  -b \
  -v \
  -f "/tmp/backup_$TIMESTAMP.dump"

docker cp postgres:/tmp/backup_$TIMESTAMP.dump $BACKUP_DIR/
docker-compose exec postgres rm /tmp/backup_$TIMESTAMP.dump

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete
```

### Database Restore

```bash
# Stop backend to prevent writes
docker-compose stop backend

# Restore from backup
docker-compose exec -T postgres pg_restore \
  -U postgres \
  -d iot_logistics \
  -c \
  -v \
  /path/to/backup.dump

# Restart backend
docker-compose start backend
```

### MQTT Configuration Backup

```bash
# Backup mosquitto config
cp mosquitto/mosquitto.conf mosquitto/mosquitto.conf.backup

# Restore
cp mosquitto/mosquitto.conf.backup mosquitto/mosquitto.conf
docker-compose restart mosquitto
```

---

## Scaling Considerations

### Horizontal Scaling (Multiple Backend Instances)

When scaling to multiple backend instances, you need:

1. **Redis for Socket.IO Adapter:**
   ```javascript
   // In src/realtime/socket.js
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';
   
   const pubClient = createClient({ host: 'redis', port: 6379 });
   const subClient = pubClient.duplicate();
   
   io.adapter(createAdapter(pubClient, subClient));
   ```

2. **Load Balancer Configuration:**
   ```nginx
   upstream backend {
     ip_hash; # Sticky sessions for WebSocket
     server backend1:3000;
     server backend2:3000;
     server backend3:3000;
   }
   
   server {
     listen 80;
     
     location / {
       proxy_pass http://backend;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
     }
   }
   ```

3. **Session Store (if using sessions):**
   ```javascript
   // Use connect-redis for session storage
   import RedisStore from 'connect-redis';
   import { createClient } from 'redis';
   
   const redisClient = createClient();
   app.use(session({
     store: new RedisStore({ client: redisClient }),
     secret: process.env.SESSION_SECRET
   }));
   ```

### Database Scaling

1. **Connection Pooling:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     
     # Add connection pool config
     pool_max_size = 20
     pool_timeout = 10
   }
   ```

2. **Read Replicas:**
   - Configure PostgreSQL replication
   - Route read queries to replicas
   - Keep writes on master

3. **Indexing Strategy:**
   - Already implemented key indexes
   - Monitor slow queries
   - Add composite indexes as needed

---

## Security Checklist

- [ ] **JWT Secret** is strong and random (32+ characters)
- [ ] **Database credentials** are not default
- [ ] **CORS origins** are properly whitelisted (not `*`)
- [ ] **Rate limiting** is enabled
- [ ] **Helmet middleware** is configured
- [ ] **HTTPS** is enabled (use reverse proxy like nginx)
- [ ] **Environment variables** are not committed to git
- [ ] **Error messages** don't leak sensitive info
- [ ] **SQL injection** protection via Prisma ORM
- [ ] **XSS protection** via Helmet CSP headers
- [ ] **Regular dependency updates** scheduled
- [ ] **Logs** don't contain sensitive data

---

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Database not ready → Wait for PostgreSQL to start
- Port 3000 in use → Check `netstat -an | grep 3000`
- Missing environment variables → Verify `.env` file
- Database connection failed → Check `DATABASE_URL`

### WebSocket connection fails

**Check:**
1. Backend server is running
2. JWT token is valid
3. CORS origin matches frontend URL
4. Firewall allows port 3000
5. Client library version matches server (socket.io 4.x)

**Test:**
```bash
node scripts/test-socket-client.js
```

### Database migration errors

**Reset database (CAUTION: deletes all data):**
```bash
npx prisma migrate reset
```

**Check migration status:**
```bash
npx prisma migrate status
```

### MQTT not receiving data

**Test MQTT broker:**
```bash
mosquitto_sub -h localhost -p 1883 -t "#" -v
```

**Check backend MQTT connection:**
```bash
docker-compose logs backend | grep -i mqtt
```

### Rate limiting too strict

**Adjust in `src/middleware/rateLimiter.js`:**
```javascript
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increase limit
  // ...
});
```

---

## Rollback Procedure

### If deployment fails:

1. **Stop new version:**
   ```bash
   docker-compose down
   ```

2. **Restore database backup:**
   ```bash
   docker-compose exec -T postgres pg_restore \
     -U postgres -d iot_logistics -c backup.dump
   ```

3. **Checkout previous version:**
   ```bash
   git checkout <previous-commit-hash>
   ```

4. **Restart services:**
   ```bash
   docker-compose up -d
   ```

5. **Verify health:**
   ```bash
   curl http://localhost:3000/health
   ```

---

## Success Criteria

Deployment is successful when:

- ✅ Health endpoint returns 200 OK
- ✅ Authentication works (login returns JWT)
- ✅ IoT data submission succeeds
- ✅ WebSocket connection establishes
- ✅ Database queries return results
- ✅ MQTT messages are processed
- ✅ Realtime events are emitted
- ✅ Analytics endpoints return data
- ✅ No errors in logs for 10 minutes
- ✅ Frontend can connect and display data

---

## Support Contacts

- **Backend Issues:** Check `docs/API_REFERENCE.md`
- **Realtime Issues:** Check `docs/REALTIME_GUIDE.md`
- **System Overview:** Check `docs/IMPLEMENTATION_SUMMARY.md`

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version:** 2.0.0
