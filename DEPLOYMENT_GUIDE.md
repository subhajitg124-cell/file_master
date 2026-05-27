# FileMaster AI - Deployment & Production Configuration

## Environment Variables

Create `.env.production` with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/filemaster_ai
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Encryption
ENCRYPTION_MASTER_KEY=your-256-bit-hex-key-here
ENCRYPTION_SALT=filemaster-ai-salt-change-in-prod

# API Configuration
NODE_ENV=production
APP_URL=https://filemaster.example.com
API_PORT=3000
API_TIMEOUT_MS=30000

# Security
CORS_ORIGINS=https://filemaster.example.com,https://www.filemaster.example.com
SESSION_SECRET=your-secure-session-secret
JWT_SECRET=your-jwt-secret-key

# File Storage (AWS S3 or similar)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=filemaster-documents

# Document Processing
FFMPEG_PATH=/usr/bin/ffmpeg
LIBRE_OFFICE_PATH=/usr/bin/soffice

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn-here

# External Services (Optional)
GOOGLE_CLOUD_VISION_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DIGILOCKER_API_KEY=mock-api-key

# Features
ENABLE_WHATSAPP_SHARING=true
ENABLE_VOICE_ASSISTANT=true
ENABLE_DOCUMENT_SCANNER=true
ENABLE_DIGILOCKER_SYNC=true

# Cleanup Jobs
CLEANUP_SCHEDULE_HOURS=24
CLEANUP_KEEP_DAYS=7
```

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    libreoffice \
    ca-certificates \
    tini

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY . .

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Build
RUN pnpm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY . .

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm run build

FROM nginx:alpine

COPY --from=builder /app/artifacts/file-master/dist/public /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: filemaster_ai
      POSTGRES_USER: filemaster
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filemaster"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgresql://filemaster:${DB_PASSWORD}@postgres:5432/filemaster_ai
      ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY}
      NODE_ENV: production
      APP_URL: ${APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - api
    environment:
      - VITE_API_URL=${APP_URL}/api

volumes:
  postgres_data:

networks:
  default:
    name: filemaster-network
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # API proxy
    location /api/ {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_request_buffering off;
    }

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Kubernetes Deployment

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: filemaster-api
  labels:
    app: filemaster-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: filemaster-api
  template:
    metadata:
      labels:
        app: filemaster-api
    spec:
      containers:
      - name: api
        image: your-registry/filemaster-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: filemaster-secrets
              key: database-url
        - name: ENCRYPTION_MASTER_KEY
          valueFrom:
            secretKeyRef:
              name: filemaster-secrets
              key: encryption-key
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      imagePullSecrets:
      - name: registry-credentials

---
apiVersion: v1
kind: Service
metadata:
  name: filemaster-api-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  selector:
    app: filemaster-api
```

## Database Migrations

Run migrations during deployment:

```bash
# Create migration
pnpm run db:migration:create --name add_premium_features

# Run migrations
pnpm run db:migrate:prod

# Rollback (if needed)
pnpm run db:migrate:rollback
```

## Monitoring & Logging

### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'filemaster-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

Configure pino logger:
```javascript
const transport = pino.transport({
  target: 'pino/file',
  options: {
    destination: '/var/log/filemaster/api.log',
    mkdir: true,
  },
});
```

### Sentry Error Tracking

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d filemaster.example.com -d www.filemaster.example.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Nginx SSL Config

```nginx
server {
    listen 443 ssl http2;
    server_name filemaster.example.com;

    ssl_certificate /etc/letsencrypt/live/filemaster.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/filemaster.example.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 80;
    server_name filemaster.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Backup & Disaster Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# backup.sh - Run via cron job daily

BACKUP_DIR="/backups/filemaster"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="filemaster_backup_${TIMESTAMP}.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/$FILENAME

# Upload to S3
aws s3 cp $BACKUP_DIR/$FILENAME s3://filemaster-backups/

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

### Restore from Backup

```bash
aws s3 cp s3://filemaster-backups/filemaster_backup_LATEST.sql.gz /tmp/
gunzip /tmp/filemaster_backup_LATEST.sql.gz
psql $DATABASE_URL < /tmp/filemaster_backup_LATEST.sql
```

## Performance Tuning

### PostgreSQL Optimization

```sql
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Node.js Performance

```javascript
// Enable clustering
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(3000);
}
```

## Maintenance Checklist

- [ ] Database backups verified
- [ ] SSL certificates auto-renewing
- [ ] Log rotation configured
- [ ] Monitoring alerts set up
- [ ] Rate limiting enforced
- [ ] File cleanup jobs running
- [ ] API documentation updated
- [ ] Security patches applied
- [ ] Performance metrics baseline
