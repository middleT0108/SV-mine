#!/usr/bin/env bash
# ==============================================================================
# Oracle Cloud Always-Free Anti-Reclamation Script (anti-idle.sh)
# Prevents Oracle from terminating your free ARM instance due to "idle resource"
# Criteria: Oracle reclaims if 95th percentile CPU & RAM < 20% over 7 days.
# This script maintains ~22% CPU and safely reserves ~22% RAM with lowest priority.
# ==============================================================================

set -euo pipefail

SERVICE_FILE="/etc/systemd/system/svmine-anti-idle.service"

install_service() {
  echo "[1/3] Cài đặt script duy trì hoạt động máy chủ Oracle..."
  mkdir -p /opt/svmine

  cat << 'EOF' > /opt/svmine/anti-idle-worker.py
import time
import os
import math

# Allocate ~22% of total RAM to meet Oracle threshold safely
def allocate_safe_memory():
    try:
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                if 'MemTotal' in line:
                    total_kb = int(line.split()[1])
                    break
        # Target ~22% of RAM
        target_bytes = int(total_kb * 1024 * 0.22)
        # Allocate dummy block in memory
        memory_block = bytearray(target_bytes)
        print(f"[Anti-Idle] Reserved {len(memory_block) // (1024*1024)} MB RAM safely.")
        return memory_block
    except Exception as e:
        print(f"[Anti-Idle] Warning reserving memory: {e}")
        return None

# Generate gentle ~22% CPU cycle without starving Minecraft processes
def maintain_cpu():
    active_duration = 0.22 # active 22% of a 1-second interval
    sleep_duration = 0.78  # sleep 78% of a 1-second interval

    while True:
        start_time = time.time()
        # Busy loop for 220ms
        while (time.time() - start_time) < active_duration:
            math.sqrt(1234567.89) * math.sin(45)
        # Yield CPU to real Minecraft containers
        time.sleep(sleep_duration)

if __name__ == '__main__':
    mem = allocate_safe_memory()
    maintain_cpu()
EOF

  echo "[2/3] Đăng ký Systemd Daemon với độ ưu tiên thấp nhất (nice = 19)..."
  cat << EOF > "$SERVICE_FILE"
[Unit]
Description=SV-mine Oracle Cloud Anti-Idle Keeper
After=network.target

[Service]
Type=simple
User=root
Nice=19
CPUSchedulingPolicy=idle
ExecStart=/usr/bin/python3 /opt/svmine/anti-idle-worker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable svmine-anti-idle.service
  systemctl restart svmine-anti-idle.service

  echo "=========================================================="
  echo "✅ Đã kích hoạt bảo vệ chống thu hồi tài nguyên Oracle thành công!"
  echo "Trạng thái: systemctl status svmine-anti-idle"
  echo "=========================================================="
}

if [ "${1:-}" = "install" ] || [ ! -f "$SERVICE_FILE" ]; then
  install_service
else
  echo "Dịch vụ đã được cài đặt. Để cài lại: sudo bash anti-idle.sh install"
fi
