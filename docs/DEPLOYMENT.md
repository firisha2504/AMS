# AMS Production Deployment Guide

## Architecture Overview

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ Web App   │ │  API  │ │ PostgreSQL│
        │ (React)   │ │(Node) │ │           │
        └───────────┘ └───────┘ └───────────┘
                           │
                    ┌──────▼──────┐
                    │   Mobile    │
                    │  (Flutter)  │
                    └─────────────┘
```

## Server Requirements

- Ubuntu 22.04 LTS (recommended)
- 2+ CPU cores, 4GB+ RAM
- PostgreSQL 14+
- Node.js 18+
- Nginx
- SSL certificate (Let's Encrypt)

## 1. Database Setup

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql

CREATE DATABASE afosha_ms;
CREATE USER ams_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE afosha_ms TO ams_user;
\q
```

## 2. Backend Deployment

```bash
cd backend
cp .env.example .env
# Edit .env with production values

npm install
npx prisma migrate deploy
npx prisma db seed
npm run build

# Using PM2
npm install -g pm2
pm2 start dist/index.js --name ams-api
pm2 save
pm2 startup
```

### Production Environment Variables

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://ams_user:password@localhost:5432/afosha_ms
JWT_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-64-char-random-string>
CORS_ORIGIN=https://your-domain.com
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
FCM_SERVER_KEY=<your-fcm-key>
```

## 3. Web App Deployment

```bash
cd web
cp .env.example .env
# Set VITE_API_URL=https://your-domain.com/api

npm install
npm run build
```

Serve the `dist/` folder via Nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/ams/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:5000;
    }
}
```

## 4. Mobile App Deployment

### Android

```bash
cd mobile
flutter build appbundle --dart-define=API_URL=https://your-domain.com/api
```

Upload the `.aab` file to Google Play Console.

### iOS

```bash
flutter build ios --dart-define=API_URL=https://your-domain.com/api
```

Upload via Xcode to App Store Connect.

## 5. Scheduled Jobs

The backend runs these cron jobs automatically:

| Schedule | Job |
|----------|-----|
| Saturday 6:00 AM | Create weekly obligations |
| Daily midnight | Mark overdue obligations |
| Friday 6:00 PM | Meeting reminders (SMS) |
| Saturday 7:00 AM | Payment reminders (SMS) |
| Daily 2:00 AM | Automatic backup |

## 6. Backup Strategy

- **Automatic**: Daily at 2 AM (stored in `backups/` directory)
- **Manual**: Admin can trigger via web UI
- **Recommended**: Copy backups to external storage (S3, cloud drive)

```bash
# Cron for off-site backup copy
0 3 * * * rsync -az /path/to/backups/ user@backup-server:/backups/ams/
```

## 7. Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Enable HTTPS only
- [ ] Configure firewall (allow 80, 443 only)
- [ ] Set up PostgreSQL SSL
- [ ] Configure rate limiting (already enabled in API)
- [ ] Regular security updates
- [ ] Monitor audit logs

## 8. Monitoring

```bash
# PM2 monitoring
pm2 monit
pm2 logs ams-api

# Database size
psql -c "SELECT pg_size_pretty(pg_database_size('afosha_ms'));"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API won't start | Check DATABASE_URL, run `npx prisma migrate deploy` |
| CORS errors | Verify CORS_ORIGIN matches your web domain |
| SMS not sending | Check Twilio credentials in .env |
| Push notifications fail | Verify FCM_SERVER_KEY and Firebase setup |
