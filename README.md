# SV-mine: Nền Tảng Quản Lý Máy Chủ Minecraft 0 Đồng (Zero-Cost Hosting)

> **Giải pháp lưu trữ và quản lý máy chủ Minecraft hoàn toàn MIỄN PHÍ (0đ)**:
> - **Frontend**: Giao diện React SPA tĩnh, tự động build và deploy 24/7 lên **GitHub Pages**.
> - **Backend & Game Host**: Docker engine quản lý container `itzg/minecraft-server`, định tuyến tên miền thông minh qua `itzg/mc-router`.
> - **Hạ tầng hỗ trợ**: Chạy được trên cả **Oracle Cloud Always Free (ARM 4 OCPU, 24GB RAM)** và **Máy tính gia đình tại Việt Nam (hỗ trợ vượt CGNAT bằng playit.gg)**.
> - **Tên miền**: Tích hợp DuckDNS API cấp phát subdomain `*.duckdns.org` tức thì và tự động đồng bộ IP (DDNS).

---

## MỤC LỤC
1. [Bảng Đánh Giá & Minh Bạch Gói Miễn Phí (0đ)](#1-bảng-đánh-giá--minh-bạch-gói-miễn-phí-0đ)
2. [Sơ Đồ Kiến Trúc Hệ Thống](#2-sơ-đồ-kiến-trúc-hệ-thống)
3. [Hướng Dẫn Triển Khai Phương Án A: Oracle Cloud Always Free (Khuyên Dùng)](#3-hướng-dẫn-triển-khai-phương-án-a-oracle-cloud-always-free-khuyên-dùng)
4. [Hướng Dẫn Triển Khai Phương Án B: Máy Tính Tại Nhà Ở Việt Nam](#4-hướng-dẫn-triển-khai-phương-án-b-máy-tính-tại-nhà-ở-việt-nam)
5. [Cấu Hình Tên Miền DuckDNS Miễn Phí](#5-cấu-hình-tên-miền-duckdns-miễn-phí)
6. [Triển Khai Frontend Lên GitHub Pages](#6-triển-khai-frontend-lên-github-pages)
7. [Bảng Giới Hạn Tài Nguyên & Mẹo Mở Rộng 0đ](#7-bảng-giới-hạn-tài-nguyên--mẹo-mở-rộng-0đ)
8. [Cẩm Nang Xử Lý Sự Cố & Lỗi Thường Gặp](#8-cẩm-nang-xử-lý-sự-cố--lỗi-thường-gặp)

---

## 1. Bảng Đánh Giá & Minh Bạch Gói Miễn Phí (0đ)

| Dịch vụ | Tài nguyên miễn phí thực tế | Điều kiện xác minh | Rủi ro tiềm ẩn | Biện pháp xử lý của SV-mine |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Pages & Actions** | Hosting web tĩnh không giới hạn, 2000 phút build Actions/tháng | Tài khoản GitHub miễn phí | Không chạy được backend hay container | Tách kiến trúc: Frontend tĩnh trên GitHub Pages, Backend chạy trên máy chủ riêng. |
| **Oracle Cloud Always Free** | **4 OCPU (Ampere ARM64)**, **24GB RAM**, 200GB ổ cứng NVMe, 1 IPv4 tĩnh, 10TB băng thông/tháng | Thẻ Visa/Mastercard quốc tế (tạm trừ ~$1 và hoàn lại ngay) | 1. Hết tài nguyên khi tạo (`Out of capacity`).<br>2. Bị thu hồi nếu idle 7 ngày. | 1. Script OCI CLI auto-retry để bắt VM.<br>2. Cung cấp script [`infra/anti-idle.sh`](infra/anti-idle.sh) duy trì tải CPU/RAM an toàn. |
| **Máy tại nhà (Home Server)** | Tận dụng phần cứng có sẵn (PC cũ / Mini PC / Raspberry Pi) | Không cần thẻ, tốn điện sinh hoạt gia đình | 1. IP mạng gia đình thay đổi liên tục.<br>2. Dính mạng **CGNAT** không mở được port. | 1. Backend tích hợp worker DDNS tự cập nhật IP.<br>2. Hỗ trợ tunnel qua [`infra/playit-setup.sh`](infra/playit-setup.sh). |
| **DuckDNS** | Cung cấp tới 5 subdomain `*.duckdns.org`, có REST API | Đăng nhập tài khoản GitHub/Google | Không hỗ trợ bản ghi SRV | Tích hợp **`itzg/mc-router`** trên cổng 25565 chuẩn, tự điều hướng theo hostname mà người chơi gõ. |
| **Lưu trữ Sao lưu (Storage)** | Ổ cứng cục bộ 200GB (Oracle) / Cloudflare R2 10GB | Tài khoản miễn phí | Tràn dung lượng lưu trữ | Luật xoay vòng tự động xóa bản cũ, chỉ giữ lại **$N=3$ bản mới nhất**. |

---

## 2. Sơ Đồ Kiến Trúc Hệ Thống

```mermaid
flowchart TD
    subgraph Clients [Người Dùng & Game Thủ]
        WebUser["Trình Duyệt Quản Trị"]
        MCClient["Minecraft Client (Java / Bedrock)"]
    end

    subgraph GitHubPages [GitHub Pages (Miễn Phí)]
        GHP["Frontend Static SPA (React + Vite + TailwindCSS)"]
    end

    subgraph DuckDNSCloud [DuckDNS API]
        Duck["Cập Nhật Bản Ghi DNS Tự Động"]
    end

    subgraph HostServer [Hạ Tầng Backend & Game (Oracle Cloud hoặc Home Server)]
        Caddy["Caddy Gateway (Cấp SSL Let's Encrypt Tự Động)"]
        Backend["SV-mine API (Node.js/Express + Dockerode)"]
        MCRouter["itzg/mc-router (Lắng nghe cổng chuẩn 25565)"]
        DB[("SQLite Database (WAL Mode)")]
        MC1["Container Minecraft 1 (Paper MC)"]
        MC2["Container Minecraft 2 (Fabric / Purpur)"]
        AntiIdle["Service Anti-Idle (Chống thu hồi Oracle)"]
    end

    WebUser -->|HTTPS| GHP
    WebUser -->|WSS Console & REST API| Caddy
    Caddy --> Backend
    Backend --> DB
    Backend -->|Docker Socket| MC1
    Backend -->|Docker Socket| MC2
    Backend -->|Cập nhật Subdomain| Duck

    MCClient -->|Kết nối myserver.duckdns.org:25565| MCRouter
    MCRouter -->|Định tuyến theo hostname| MC1
    MCRouter -->|Định tuyến theo hostname| MC2
```

---

## 3. Hướng Dẫn Triển Khai Phương Án A: Oracle Cloud Always Free (Khuyên Dùng)

### Bước 1: Đăng Ký Tài Khoản Oracle Cloud
1. Truy cập [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) bấm **Start for free**.
2. **Chọn Home Region**: Chọn **Singapore (`ap-singapore-1`)** hoặc **Japan (Tokyo)** để có ping từ Việt Nam tốt nhất (Singapore: **28ms - 45ms**).
3. **Xác minh thẻ tín dụng**: Điền thẻ Visa/Mastercard (thẻ vật lý hoặc thẻ ảo từ Viettel Money/CIMB/Cake). Oracle sẽ trừ tạm thời ~1 USD để kiểm tra thẻ và **hoàn lại ngay sau 5 - 30 phút**.
4. Hoàn tất đăng ký và đăng nhập vào Oracle Cloud Console.

### Bước 2: Tạo Instance ARM Ampere A1 (4 OCPU - 24GB RAM)
1. Trong menu chọn **Compute** -> **Instances** -> **Create Instance**.
2. **Image**: Chọn **Ubuntu 22.04 LTS** (hoặc Ubuntu 24.04).
3. **Shape**: Bấm **Change Shape** -> chọn **Ampere (Arm-based Processor)**:
   - Shape name: `VM.Standard.A1.Flex`
   - OCPU: `4`
   - Memory: `24 GB` (Đây là giới hạn Always Free tối đa của Oracle).
4. **Networking**: Chọn *Assign a public IPv4 address*.
5. **Add SSH keys**: Chọn *Generate a key pair for me* và **tải về cả Private Key (.key) lẫn Public Key**.
6. **Boot volume**: Nhập dung lượng từ `100 GB` đến `200 GB` (trong hạn mức 200GB miễn phí).
7. Bấm **Create**.

> [!TIP]
> **Xử lý lỗi "Out of host capacity" (Hết tài nguyên tạm thời tại Singapore):**
> Do nhu cầu máy chủ ARM Singapore rất lớn, nếu gặp thông báo lỗi này, bạn có 2 cách:
> 1. Giảm xuống cấu hình thử nghiệm: 2 OCPU và 12GB RAM, sau đó nâng cấp sau.
> 2. Dùng công cụ tự động đăng ký lặp lại (OCI CLI loop):
>    ```bash
>    # Vòng lặp thử tạo instance mỗi 60 giây qua OCI CLI cho đến khi thành công:
>    while true; do
>      oci compute instance launch --cli-input-json file://instance-config.json && break
>      echo "Hết slot, thử lại sau 60 giây..."
>      sleep 60
>    done
>    ```

### Bước 3: Mở Cổng Tường Lửa Trên Oracle Cloud VCN (Security List)
1. Trong Oracle Console, vào **Networking** -> **Virtual Cloud Networks (VCN)**.
2. Bấm vào VCN của bạn -> Chọn **Security Lists** -> **Default Security List**.
3. Bấm **Add Ingress Rules** và thêm các cổng sau (Source CIDR: `0.0.0.0/0`):
   - `22`: SSH quản trị máy chủ.
   - `80`, `443`: Web Caddy Gateway (Cấp phát SSL).
   - `25565`: Cổng Minecraft chính (`itzg/mc-router`).
   - `3001`: Backend API.
   - `25566-25600`: Dải cổng kết nối trực tiếp các container Minecraft.

### Bước 4: Chạy Script Tự Động Thiết Lập Trên Máy Chủ
Kết nối SSH vào máy chủ Ubuntu:
```bash
ssh -i /path/to/your-private-key.key ubuntu@<IP-PUBLIC-CỦA-ORACLE>
```

Tải và chạy script cài đặt tự động của SV-mine:
```bash
# Clone repo
git clone https://github.com/middleT0108/SV-mine.git
cd SV-mine/infra

# Chạy script cấu hình hệ điều hành, tối ưu mạng BBR và mở tường lửa iptables
sudo bash setup.sh
```

### Bước 5: Kích Hoạt Script Chống Thu Hồi Tài Nguyên Oracle (Anti-Idle)
Oracle có chính sách thu hồi instance miễn phí nếu CPU và RAM nhàn rỗi dưới 20% trong 7 ngày liên tục. Hãy chạy lệnh:
```bash
sudo bash anti-idle.sh install
```
*Script sẽ thiết lập một service nền tiêu thụ đúng ~22% CPU và RAM với mức ưu tiên thấp nhất (`nice=19`). Khi server Minecraft chạy thật, tiến trình này tự động nhường CPU.*

### Bước 6: Khởi Chạy Hệ Thống Bằng Docker Compose
Chỉnh sửa file môi trường:
```bash
cp ../backend/.env.example ../backend/.env
nano ../backend/.env
```
*(Điền `DUCKDNS_TOKEN`, `HOST_PUBLIC_IP`, và mật khẩu bí mật `JWT_SECRET`)*

Khởi động các dịch vụ:
```bash
cd /root/SV-mine/infra
docker compose up -d
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

---

## 4. Hướng Dẫn Triển Khai Phương Án B: Máy Tính Tại Nhà Ở Việt Nam

Nếu bạn có một máy tính cũ, Mini PC, hoặc Raspberry Pi 4/5 đặt tại nhà:

### Bước 1: Mở Cổng Router Gia Đình (Port Forwarding)
1. Đăng nhập trang quản trị modem nhà mạng (thường là `192.168.1.1`).
2. Vào mục **Port Forwarding** (hoặc **Virtual Server**).
3. Chuyển tiếp các cổng sau về địa chỉ IP nội bộ của máy chủ (ví dụ `192.168.1.100`):
   - TCP `25565` (Minecraft router)
   - TCP `80`, `443` (Web & SSL)
   - TCP `3001` (Backend API)
   - TCP `25566` - `25575` (Minecraft trực tiếp)

### Bước 2: Kiểm Tra Xem Có Bị Mạng CGNAT Hay Không
Các nhà mạng Viettel, VNPT, FPT hiện nay thường cho khách hàng dùng chung IP qua mạng **CGNAT** (Carrier-Grade NAT). Khi dính CGNAT, mở port trên router vẫn sẽ **không kết nối được từ bên ngoài**.
- **Cách kiểm tra**: Xem mục `WAN IP` trong trang cài đặt router. Nếu địa chỉ IP bắt đầu bằng `100.64.x.x` đến `100.127.x.x` hoặc khác với IP khi bạn vào trang [ipify.org](https://api.ipify.org), nghĩa là bạn đang bị dính CGNAT.
- **Cách xử lý 1**: Gọi điện tổng đài kỹ thuật nhà mạng (Viettel: 18008119, FPT: 19006600, VNPT: 18001166) báo: *"Tôi cần mở port để xem camera gia đình, nhờ anh/chị gỡ CGNAT và cấp dải IP Public động giúp tôi"*. Thao tác này hoàn toàn **miễn phí 100%**.

### Bước 3: Phương Án Dự Phòng Tuyệt Đối - Dùng Tunnel Playit.gg
Nếu nhà mạng không mở CGNAT, hãy dùng tunnel miễn phí **playit.gg**:
```bash
cd SV-mine/infra
sudo bash playit-setup.sh
```
Làm theo hướng dẫn trên màn hình để liên kết tài khoản. Playit sẽ cấp cho bạn một đường hầm TCP/UDP vào thẳng cổng 25565 mà không cần mở bất kỳ cổng nào trên router!

---

## 5. Cấu Hình Tên Miền DuckDNS Miễn Phí

1. Truy cập [duckdns.org](https://www.duckdns.org/) và đăng nhập bằng tài khoản GitHub hoặc Google.
2. Bạn sẽ thấy mã **token** bí mật của bạn ở ngay đầu trang (ví dụ: `a1b2c3d4-e5f6-...`).
3. Tạo thử một subdomain tĩnh cho máy chủ API (ví dụ: `svmine-gateway`).
4. Điền Token này vào file `.env` của Backend:
   ```env
   DUCKDNS_TOKEN=a1b2c3d4-e5f6-xxxx-xxxx-xxxxxxxxxxxx
   HOST_PUBLIC_IP=140.238.xxx.xxx
   DUCKDNS_BASE_DOMAIN=duckdns.org
   ```
5. Khi người dùng bấm tạo server trên web (ví dụ nhập `gamevui`), Backend sẽ tự động gọi DuckDNS API để liên kết ngay `gamevui.duckdns.org` về IP máy chủ của bạn!

---

## 6. Triển Khai Frontend Lên GitHub Pages

Toàn bộ giao diện người dùng được thiết kế để triển khai tĩnh 100% lên GitHub Pages mà không tốn 1 xu chi phí lưu trữ:

1. **Đẩy mã nguồn lên GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete zero cost minecraft hosting platform"
   git push origin main
   ```
2. **Kích hoạt GitHub Pages**:
   - Vào repository trên GitHub -> Bấm tab **Settings**.
   - Ở thanh menu bên trái, chọn **Pages**.
   - Tại mục **Build and deployment** -> **Source**: Chọn **GitHub Actions**.
3. **Chờ Deploy tự động**:
   - Chuyển sang tab **Actions**, workflow `Deploy Frontend to GitHub Pages` sẽ tự động kích hoạt, build Vite và xuất bản web trong khoảng 1-2 phút.
   - Đường link web của bạn sẽ có dạng: `https://<username>.github.io/SV-mine/`
4. **Kết nối Frontend với Backend**:
   - Truy cập vào trang web trên GitHub Pages.
   - Nhấp vào biểu tượng **Bánh răng (Cài đặt)** ở thanh điều hướng trên cùng.
   - Nhập địa chỉ máy chủ Backend của bạn (ví dụ: `https://api.svmine.duckdns.org` hoặc `http://<IP-ORACLE>:3001`) và bấm **Lưu Cấu Hình Kết Nối**.

---

## 7. Bảng Giới Hạn Tài Nguyên & Mẹo Mở Rộng 0đ

| Tài nguyên | Giới hạn gói Free | Cấu hình đề xuất cho SV-mine | Ghi chú & Mở rộng 0đ |
| :--- | :--- | :--- | :--- |
| **Số lượng Server chạy cùng lúc** | Khuyên dùng 2 - 4 server | 1 - 2 server (với bạn bè), tối đa 4 server | Oracle ARM cấp 4 CPU và 24GB RAM, dư sức tải 4 server Minecraft Paper cùng lúc. |
| **RAM phân bổ mỗi Server** | 1024 MB - 6144 MB | 3072 MB (3GB RAM) | 3GB RAM kết hợp Paper engine đủ cho 10-15 người chơi hoạt động liên tục. |
| **Dung lượng Ổ Cứng** | 200 GB NVMe (Oracle) | 10GB - 20GB mỗi server | Cơ chế tự động chỉ giữ **3 bản sao lưu mới nhất**, định kỳ nén `.tar.gz` giúp tiết kiệm 70% dung lượng. |
| **Băng thông Mạng** | 10 TB/tháng (Oracle) | ~50 GB/tháng | 10TB là con số khổng lồ, không bao giờ dùng hết đối với máy chủ game bạn bè. |

---

## 8. Cẩm Nang Xử Lý Sự Cố & Lỗi Thường Gặp

### Lỗi 1: Bạn bè không thể vào được server Minecraft ("Connection Timed Out")
- **Nguyên nhân 1 (Oracle Cloud)**: Chưa mở port trong **Security List** của VCN hoặc bị tường lửa `iptables` mặc định của image Ubuntu chặn.
  - **Khắc phục**: Kiểm tra lại Bước 3 của Phương án A và đảm bảo đã chạy `sudo bash setup.sh`. Chạy lệnh `sudo iptables -L INPUT -n --line-numbers` để chắc chắn cổng 25565 có chữ `ACCEPT`.
- **Nguyên nhân 2 (Home Server)**: Dính mạng CGNAT.
  - **Khắc phục**: Chạy `sudo bash playit-setup.sh` để sử dụng tunnel không cần mở port.

### Lỗi 2: Lỗi "Out of host capacity" khi tạo máy chủ Oracle Cloud ARM
- **Nguyên nhân**: Trung tâm dữ liệu Singapore tạm thời hết chip ARM Ampere trống do nhiều người đăng ký.
- **Khắc phục**: 
  - Thử lại vào các khung giờ thấp điểm (đêm muộn hoặc sáng sớm từ 4h - 7h sáng).
  - Sử dụng vòng lặp OCI CLI tự động bắt instance được hướng dẫn ở Mục 3.

### Lỗi 3: Tên miền DuckDNS chưa phân giải được IP mới
- **Nguyên nhân**: DNS Cache của nhà mạng trong nước hoặc máy tính người chơi chưa cập nhật.
- **Khắc phục**: 
  - Đổi DNS máy tính sang Google DNS (`8.8.8.8` / `8.8.4.4`) hoặc Cloudflare DNS (`1.1.1.1`).
  - Mở Terminal/CMD gõ: `ipconfig /flushdns` (trên Windows).
  - Tạm thời dùng địa chỉ trực tiếp IP kèm port hiển thị trên Dashboard (ví dụ: `140.238.x.x:25566`).

### Lỗi 4: Máy chủ Minecraft bị tụt FPS / Lag giật (Tick Spike)
- **Nguyên nhân**: Server tải quá nhiều chunk hoặc quái vật sinh ra quá đông.
- **Khắc phục**:
  - Vào phần **Cấu hình (server.properties)** trên website, giảm `view-distance` xuống `4` hoặc `6`.
  - Luôn chọn engine **Paper** hoặc **Purpur** khi tạo server (tuyệt đối tránh dùng Vanilla thuần vì Vanilla không có thuật toán tối ưu đa luồng).
  - Hệ thống SV-mine đã tự động thêm cờ tối ưu bộ nhớ **Aikar's Flags** vào tất cả các container.

---

## Giấy Phép & Đóng Góp
- Dự án mã nguồn mở phát hành theo giấy phép **MIT License**.
- Chúc bạn và bạn bè có những giờ phút sinh tồn Minecraft vui vẻ và hoàn toàn miễn phí!
