#!/usr/bin/env bash
# ==============================================================================
# Playit.gg Tunnel Setup Script for Home Servers behind CGNAT (Viettel/VNPT/FPT)
# Allows friends to join without router port forwarding or public IP!
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "  🌐 Thiết Lập Tunnel Playit.gg Cho Máy Chủ Tại Nhà (CGNAT)"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy script với quyền root: sudo bash playit-setup.sh"
  exit 1
fi

echo "[1/3] Đang tải và cài đặt Playit.gg CLI Agent..."
curl -SsL https://playit-cloud.github.io/ppa/key.gpg | gpg --dearmor | tee /etc/apt/trusted.gpg.d/playit.gpg >/dev/null
echo "deb [signed-by=/etc/apt/trusted.gpg.d/playit.gpg] https://playit-cloud.github.io/ppa/data ./" | tee /etc/apt/sources.list.d/playit-cloud.list
apt-get update -y
apt-get install -y playit

echo "[2/3] Bật dịch vụ Playit chạy ngầm tự khởi động cùng máy tính..."
systemctl enable playit
systemctl start playit

echo "[3/3] Hoàn tất thiết lập cơ bản."
echo "=========================================================="
echo "🔗 BƯỚC CUỐI CÙNG: LIÊN KẾT TÀI KHOẢN PLAYIT"
echo "Chạy lệnh sau để lấy đường link liên kết tunnel về tài khoản:"
echo ""
echo "   playit claim-url"
echo ""
echo "Mở link trên trình duyệt, tạo tunnel trỏ vào port 25565 của máy này."
echo "Bạn sẽ nhận được 1 địa chỉ miễn phí (ví dụ: my-server.gl.joinmc.link)."
echo "=========================================================="
