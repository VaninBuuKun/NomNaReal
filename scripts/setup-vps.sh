#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "🚀 NOMNA VPS INITIAL BOOTSTRAP SCRIPT"
echo "=========================================="

# 1. Kiểm tra quyền root
if [ "$(id -u)" -ne 0 ]; then
   echo "❌ Script này bắt buộc phải chạy dưới quyền root (chạy: sudo bash setup-vps.sh hoặc đăng nhập root)."
   exit 1
fi

echo "📦 1. Đang cập nhật hệ điều hành..."
apt update && apt upgrade -y

echo "👤 2. Đang tạo tài khoản deploy và phân quyền..."
if id "deploy" &>/dev/null; then
    echo "Tài khoản 'deploy' đã tồn tại."
else
    adduser deploy --disabled-password --gecos ""
    usermod -aG sudo deploy
fi

# Sao chép SSH Key từ root sang user deploy để đăng nhập không cần mật khẩu
mkdir -p /home/deploy/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
fi
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

echo "🐳 3. Đang cài đặt Docker và Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker deploy
apt install -y docker-compose-plugin

echo "🛡️ 4. Cấu hình tường lửa UFW (chỉ mở cổng 22, 80, 443)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "🕒 5. Cài đặt múi giờ Việt Nam (Asia/Ho_Chi_Minh)..."
timedatectl set-timezone Asia/Ho_Chi_Minh

echo "🔒 6. Cài đặt Fail2ban bảo vệ SSH chống Brute-force..."
apt install -y fail2ban htop ncdu unattended-upgrades
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF
systemctl enable fail2ban
systemctl restart fail2ban

echo "=========================================="
echo "✅ HOÀN TẤT THIẾT LẬP SERVER!"
echo "👉 Từ máy local của bạn, hãy mở terminal và kiểm tra kết nối:"
echo "   ssh deploy@<IP_VPS>"
echo "=========================================="
