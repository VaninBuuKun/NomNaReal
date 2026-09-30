#!/bin/bash
set -euo pipefail

# ============================================
# NomNa Database Restore Script (PostgreSQL)
# ============================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Thiếu đường dẫn file backup!"
  echo "Cách dùng: $0 <duong_dan_file_backup.sql.gz>"
  echo "Ví dụ:    $0 backups/nomna_db_latest.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Không tìm thấy file backup: $BACKUP_FILE"
  exit 1
fi

# Đọc biến từ file .env nếu có
if [ -f "${PROJECT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-nomna_user}"
DB_NAME="${POSTGRES_DB:-NomNa}"

echo "======================================================"
echo "⚠️  CẢNH BÁO NGUY HIỂM:"
echo "Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của database '${DB_NAME}'!"
echo "File khôi phục: ${BACKUP_FILE}"
echo "======================================================"
read -r -p "Bạn có chắc chắn muốn khôi phục không? (gõ 'y' để tiếp tục): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Đã huỷ thao tác khôi phục."
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏸️ Đang tạm dừng container app để ngắt kết nối DB..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" stop app

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Đang làm sạch và tạo mới Database '${DB_NAME}'..."
docker exec nomna_postgres psql -U "${DB_USER}" -d postgres \
  -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
docker exec nomna_postgres psql -U "${DB_USER}" -d postgres \
  -c "CREATE DATABASE \"${DB_NAME}\";"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📥 Đang nạp dữ liệu từ file backup vào '${DB_NAME}'..."
gunzip -c "$BACKUP_FILE" | docker exec -i nomna_postgres \
  psql -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ▶️ Đang khởi động lại container app..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" start app

sleep 5
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🩺 Kiểm tra Healthcheck app sau khi restore:"
curl -s http://localhost:8080/health || true
echo ""
echo "======================================================"
echo "✅ KHÔI PHỤC DỮ LIỆU THÀNH CÔNG 100%!"
echo "======================================================"
