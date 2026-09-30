#!/bin/bash
set -euo pipefail

# ============================================
# NomNa Database Backup Script (PostgreSQL)
# ============================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="nomna_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

# Đọc biến từ file .env nếu có
if [ -f "${PROJECT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-nomna_user}"
DB_NAME="${POSTGRES_DB:-NomNa}"
S3_BUCKET="${AwsS3__BucketName:-}"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Bắt đầu sao lưu cơ sở dữ liệu ${DB_NAME}..."

# 1. Thực hiện pg_dump trực tiếp từ container postgres và nén gzip
docker exec nomna_postgres pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Đã tạo bản backup thành công: ${BACKUP_FILE} (Dung lượng: ${BACKUP_SIZE})"

# Tạo symlink nomna_db_latest.sql.gz để dễ dàng tải về
ln -sf "${BACKUP_DIR}/${BACKUP_FILE}" "${BACKUP_DIR}/nomna_db_latest.sql.gz"

# 2. Nếu máy có cài aws cli và đã cấu hình S3 Bucket, tự động đẩy lên Cloud
if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ☁️ Đang đồng bộ bản backup lên S3 bucket: s3://${S3_BUCKET}/db-backups/ ..."
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/db-backups/${BACKUP_FILE}"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Đã tải lên S3 an toàn!"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Bản backup được lưu cục bộ tại VPS: ${BACKUP_DIR}/${BACKUP_FILE}"
  echo "👉 Bạn có thể tải về máy tính bất cứ lúc nào bằng lệnh:"
  echo "   scp deploy@<IP_VPS>:${BACKUP_DIR}/${BACKUP_FILE} ."
fi

# 3. Dọn dẹp các bản backup cũ hơn RETENTION_DAYS ngày trên đĩa VPS
find "$BACKUP_DIR" -name "nomna_db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🏁 Sao lưu hoàn tất!"
