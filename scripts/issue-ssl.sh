#!/bin/bash
set -euo pipefail

# ============================================
# NomNa SSL Certificate Issuance Script
# ============================================

DOMAIN="${1:-nomna.ddns.net}"
EMAIL="${2:-vanpc1906@gmail.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "🔒 NOMNA SSL CERTIFICATE ISSUANCE (Let's Encrypt)"
echo "Domain: ${DOMAIN}"
echo "Email:  ${EMAIL}"
echo "=========================================="

echo "[1/3] 📡 Đang gửi yêu cầu cấp chứng chỉ SSL tới Let's Encrypt..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/lib/letsencrypt \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

echo "[2/3] ⚙️ Kích hoạt cấu hình HTTPS và tự động chuyển hướng HTTP -> HTTPS..."
cat > "${PROJECT_DIR}/nginx/conf.d/default.conf" << EOF
upstream app_upstream {
    server app:8080;
    keepalive 32;
}

# 1. HTTP Server - Tự động redirect toàn bộ sang HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/lib/letsencrypt;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# 2. HTTPS Server (Bảo mật SSL Ổ khoá xanh)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SignalR WebSocket Hubs
    location /hubs/ {
        proxy_pass http://app_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    # API & SPA Static files proxy
    location / {
        proxy_pass http://app_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

echo "[3/3] 🔄 Khởi động lại Nginx và bật Certbot tự động gia hạn..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" restart nginx
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" up -d certbot

echo "=========================================="
echo "🎉 CHÚC MỪNG BẠN! HTTPS ĐÃ ĐƯỢC BẬT THÀNH CÔNG!"
echo "👉 Truy cập ngay: https://${DOMAIN}"
echo "=========================================="
