#!/usr/bin/env bash
# ==============================================================================
# SV-mine Host Provisioning & Network Optimization Script
# Compatible with Ubuntu 22.04/24.04 LTS (Oracle Cloud ARM Ampere & Home Server)
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "  🚀 Bắt Đầu Cài Đặt Hạ Tầng Máy Chủ SV-mine (0đ Hosting)"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy script với quyền root: sudo bash setup.sh"
  exit 1
fi

echo "[1/6] Đang cập nhật hệ điều hành và cài đặt các gói cần thiết..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  tar \
  gzip \
  jq \
  iptables-persistent \
  netfilter-persistent \
  ufw \
  stress-ng

echo "[2/6] Đang cài đặt Docker Engine & Docker Compose Plugin chính thức..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker đã được cài đặt thành công."
else
  echo "✅ Docker đã có sẵn trên hệ thống."
fi

echo "[3/6] Tối ưu hóa mạng Linux Kernel (TCP BBR & Tinh chỉnh Sysctl cho Minecraft)..."
cat << 'EOF' > /etc/sysctl.d/99-minecraft-bbr.conf
# Google TCP BBR Congestion Control
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# TCP Performance & Buffer Tuning
net.ipv4.tcp_nodelay = 1
net.ipv4.tcp_fastopen = 3
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
EOF

sysctl --system > /dev/null
echo "✅ Đã kích hoạt TCP BBR và tối ưu thông lượng mạng cho kết nối từ Việt Nam."

echo "[4/6] Cấu hình Tường lửa (UFW & Xử lý triệt để lỗi chặn cổng trên Oracle Cloud)..."
# Oracle Cloud Ubuntu Image has aggressive default iptables rules that DROP input before UFW!
# Fix: Insert ACCEPT rules at top of INPUT chain
iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
iptables -I INPUT 2 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 3 -p tcp --dport 443 -j ACCEPT
iptables -I INPUT 4 -p tcp --dport 25565 -j ACCEPT
iptables -I INPUT 5 -p tcp --dport 3001 -j ACCEPT
iptables -I INPUT 6 -p tcp --dport 25566:25600 -j ACCEPT
iptables -I INPUT 7 -m state --state ESTABLISHED,RELATED -j ACCEPT

netfilter-persistent save

# Enable and configure UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH Management'
ufw allow 80/tcp comment 'HTTP / Let-s Encrypt'
ufw allow 443/tcp comment 'HTTPS / Web API'
ufw allow 25565/tcp comment 'mc-router Primary Port'
ufw allow 3001/tcp comment 'SV-mine Backend'
ufw allow 25566:25600/tcp comment 'Direct Minecraft Container Ports'
echo "y" | ufw enable
echo "✅ Tường lửa đã mở đầy đủ các cổng cho Minecraft và API Web."

echo "[5/6] Khởi tạo các thư mục lưu trữ dữ liệu máy chủ..."
mkdir -p /var/minecraft/servers
mkdir -p /var/minecraft/backups
mkdir -p /var/minecraft/router

# Create initial empty routes.json if not present
if [ ! -f /var/minecraft/router/routes.json ]; then
  echo '{}' > /var/minecraft/router/routes.json
fi
chmod -R 775 /var/minecraft

echo "[6/6] Hoàn tất cài đặt!"
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "Không xác định")

echo "=========================================================="
echo "🎉 HẠ TẦNG SV-MINE ĐÃ SẴN SÀNG!"
echo "📍 IP Public của máy chủ: ${PUBLIC_IP}"
echo ""
echo "Các bước tiếp theo:"
echo "1. Chỉnh sửa file infra/.env với DuckDNS token và IP của bạn."
echo "2. Khởi chạy hệ thống bằng lệnh:"
echo "   cd /root/SV-mine/infra && docker compose up -d"
echo "=========================================================="
