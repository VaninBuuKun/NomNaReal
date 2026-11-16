# 🚀 Kế Hoạch Triển Khai Production 100% Miễn Phí Cho NomNa (FE, BE, Database, Redis, Storage)

---

## 📌 Tổng Quan Kiến Trúc Hạ Tầng 0 Đồng (Zero-Cost Stack)

Dự án NomNa gồm 5 thành phần chính:
1. **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + WebRTC Client.
2. **Backend**: .NET 9 WebAPI + ASP.NET Core Identity + SignalR Hub.
3. **Database**: PostgreSQL 16 (EF Core Migrations).
4. **Cache & Realtime Backplane**: Redis (Presence Tracking & SignalR Scale-out).
5. **Media Storage**: S3-compatible (Upload Avatar, Ảnh, Video, Voice Notes).

### Bảng Phân Bổ Nền Tảng Miễn Phí (Free Tiers 2024 - 2026)

| Thành phần | Nền tảng miễn phí tối ưu | Thông số gói Free | Chi phí |
| :--- | :--- | :--- | :--- |
| **Frontend (FE)** | **Vercel** hoặc **Cloudflare Pages** | Unlimited Bandwidth, Global Edge CDN, SSL tự động, Auto Deploy khi Git Push | **0 đ** |
| **Backend (BE)** | **Render.com** (Web Service) hoặc **Koyeb** | 512MB RAM, 0.1 vCPU, Docker container, HTTPS tự động | **0 đ** |
| **Database** | **Supabase** (PostgreSQL 16) | 500MB Database, Backup tự động, PgBouncer Connection Pooling | **0 đ** |
| **Redis** | **Upstash Redis** (Serverless) | 10,000 commands/ngày, hỗ trợ TLS/SSL, không bị đóng băng | **0 đ** |
| **File Storage** | **Cloudflare R2** hoặc **Supabase Storage** | 10GB lưu trữ miễn phí, **0 phí băng thông tải về (Zero Egress)** | **0 đ** |
| **Keep-Alive (Chống Sleep)** | **UptimeRobot** | Ping HTTP 5 phút/lần giữ Backend Render luôn thức 24/7 | **0 đ** |

---

## 🏗️ 2 Lựa Chọn Mô Hình Triển Khai

```
┌────────────────────────────────────────────────────────────────────────┐
│  MÔ HÌNH 1: ĐỘC LẬP (KHUYẾN NGHỊ CHO PRODUCTION)                      │
│                                                                        │
│   [Vercel / Cloudflare Pages] ──(HTTPS/WSS)──► [Render / Koyeb .NET 9] │
│        (Frontend React SPA)                         (Backend API)      │
│                                                           │            │
│                     ┌─────────────────────────────────────┼──────┐     │
│                     ▼                                     ▼      ▼     │
│             [Supabase Postgres]                    [Upstash] [CF R2]   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  MÔ HÌNH 2: TẤT CẢ TRONG MỘT (ALL-IN-ONE SINGLE CONTAINER)             │
│                                                                        │
│   [Render / Koyeb: Dockerfile] ────────────────────────────────────┐    │
│    ├─ Static SPA (wwwroot)                                         │    │
│    └─ .NET 9 WebAPI & SignalR (/api, /hubs)                        │    │
│                     │                                              │    │
│                     ├──────────────────────────────┐               │    │
│                     ▼                              ▼               ▼    │
│             [Supabase Postgres]             [Upstash Redis]     [CF R2] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Hướng Dẫn Triển Khai Chi Tiết Từng Bước (Theo Mô Hình 1)

### Bước 1: Tạo Database PostgreSQL Miễn Phí (Supabase)
1. Đăng ký tài khoản tại [supabase.com](https://supabase.com) (Đăng nhập nhanh bằng GitHub).
2. Chọn **New Project**, đặt tên (ví dụ `nomna-db`), mật khẩu database và chọn Region gần nhất: `Singapore (ap-southeast-1)`.
3. Vào mục **Project Settings** $\to$ **Database** $\to$ **Connection string**:
   - Chọn tab **URI** (hoặc Transaction Pooler port `6543`).
   - Sao chép Connection String dạng:
     ```
     Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.your_project_ref;Password=your_password;SSL Mode=Require;Trust Server Certificate=true;
     ```

---

### Bước 2: Tạo Redis Miễn Phí (Upstash)
1. Đăng nhập tại [console.upstash.com](https://console.upstash.com) bằng GitHub.
2. Bấm **Create Database**:
   - Type: **Regional**
   - Region: `ap-southeast-1 (Singapore)`
   - TLS (SSL): **Enabled** (Bắt buộc).
3. Sau khi tạo xong, cuộn xuống phần **Connect to your database** $\to$ chọn tab **ioredis / redis-cli** hoặc lấy chuỗi kết nối:
   ```
   rediss://default:your_token@your-endpoint.upstash.io:6379
   ```
   Hoặc định dạng dùng cho StackExchange.Redis:
   ```
   your-endpoint.upstash.io:6379,password=your_token,ssl=True,abortConnect=False
   ```

---

### Bước 3: Tạo File Storage Miễn Phí (Cloudflare R2)
1. Đăng ký tài khoản tại [cloudflare.com](https://dash.cloudflare.com) $\to$ chọn **R2 Object Storage**.
2. Bấm **Create bucket** $\to$ đặt tên bucket: `nomna-storage`.
3. Bấm **Manage R2 API Tokens** $\to$ **Create API Token**:
   - Quyền: **Object Read & Write**.
   - Lưu lại: `Access Key ID`, `Secret Access Key`, và Endpoint URL:
     `https://<account_id>.r2.cloudflarestorage.com`
4. Tại bucket `nomna-storage`, vào **Settings** $\to$ bật **Public Access** (hoặc Custom Domain) để lấy `Public Base URL`.

---

### Bước 4: Deploy Backend lên Render.com
1. Đăng ký tài khoản tại [render.com](https://render.com) bằng GitHub.
2. Bấm **New +** $\to$ **Web Service**:
   - Chọn repository GitHub `NomNaReal`.
   - **Environment**: Chọn `Docker` (Render sẽ tự động đọc `Dockerfile` ở root).
   - **Instance Type**: Chọn `Free` (512MB RAM, 0.1 CPU).
   - **Region**: `Singapore`.
3. Thêm các **Environment Variables** (Biến môi trường) tại Render:
   - `ASPNETCORE_ENVIRONMENT`: `Production`
   - `ConnectionStrings__DefaultConnection`: *(Chuỗi kết nối Supabase ở Bước 1)*
   - `ConnectionStrings__Redis`: *(Chuỗi kết nối Upstash ở Bước 2)*
   - `Jwt__Secret`: *(Chuỗi ngẫu nhiên dài trên 64 ký tự)*
   - `Jwt__Issuer`: `NomNa`
   - `Jwt__Audience`: `NomNaClient`
   - `AwsS3__BucketName`: `nomna-storage`
   - `AwsS3__AccessKey`: *(R2 Access Key)*
   - `AwsS3__SecretKey`: *(R2 Secret Key)*
   - `AwsS3__ServiceUrl`: `https://<account_id>.r2.cloudflarestorage.com`
   - `AwsS3__PublicBaseUrl`: `https://pub-xxxx.r2.dev`
   - `AwsS3__ForcePathStyle`: `true`
   - `Cors__AllowedOrigins__0`: `https://nomna.vercel.app` *(Domain frontend sẽ tạo ở Bước 5)*
4. Bấm **Create Web Service**. Render sẽ bắt đầu build Docker image và khởi chạy. Khi hoàn tất, bạn nhận được URL backend:
   👉 `https://nomna-api.onrender.com`

---

### Bước 5: Deploy Frontend lên Vercel
1. Đăng nhập [vercel.com](https://vercel.com) bằng GitHub.
2. Bấm **Add New...** $\to$ **Project** $\to$ Import repository `NomNaReal`.
3. Cấu hình Project:
   - **Root Directory**: Chọn thư mục `client` (Bấm Edit $\to$ chọn `client`).
   - **Framework Preset**: `Vite` (Vercel tự động nhận diện).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Cấu hình **Environment Variables** tại Vercel:
   - `VITE_API_URL`: `https://nomna-api.onrender.com/api`
   - `VITE_DEFAULT_AVATAR`: `/avatars/avatar-default.png`
   - `VITE_TURN_URL`: `stun:stun.l.google.com:19302` *(Dùng STUN miễn phí của Google)*
5. Bấm **Deploy**. Trong vòng 1 phút, Vercel sẽ build và cấp URL:
   👉 `https://nomna.vercel.app` (kèm chứng chỉ SSL HTTPS miễn phí).

---

### Bước 6: Đồng bộ CORS & Chống Sleep (Cold-Start) Cho Backend Free

#### A. Cập nhật lại biến CORS trên Render:
Sau khi Vercel cấp domain chính thức (ví dụ `https://nomna-chat.vercel.app`), vào lại Render Dashboard $\to$ Environment $\to$ cập nhật:
- `Cors__AllowedOrigins__0`: `https://nomna-chat.vercel.app`
- Render sẽ tự động redeploy trong 30 giây để áp dụng.

#### B. Mẹo giữ Backend Render hoạt động 24/7 (Bypass 15-minute Sleep):
> [!IMPORTANT]
> Dịch vụ miễn phí của Render sẽ tạm ngủ (Spindown) nếu không có truy cập trong 15 phút, gây trễ 30 - 50 giây cho lần mở đầu tiên. Để giải quyết:
1. Đăng ký tài khoản miễn phí tại [uptimerobot.com](https://uptimerobot.com).
2. Tạo **New Monitor**:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `NomNa Backend Keepalive`
   - URL: `https://nomna-api.onrender.com/health` (Endpoint healthcheck đã có sẵn trong .NET 9).
   - Monitoring Interval: `Every 5 minutes` (5 phút 1 lần).
3. **Kết quả**: UptimeRobot sẽ liên tục gửi request ping nhẹ nhàng đến `/health`, máy chủ Render sẽ **thức liên tục 24/7**, không bao giờ bị rơi vào trạng thái ngủ!

---

## 📋 Checklist Kiểm Thử Sau Khi Deploy (Production Sanity Test)

- [ ] **Auth**: Đăng ký tài khoản mới $\to$ Đăng nhập $\to$ Lưu JWT Token thành công.
- [ ] **Database Migration**: EF Core tự động chạy migration tạo đủ các bảng Identity, Workspaces, Channels, Messages trên Supabase.
- [ ] **Realtime Chat (SignalR)**: Mở 2 tab trình duyệt ẩn danh, gửi tin nhắn và thấy tin xuất hiện tức thì (< 50ms).
- [ ] **Upload File & Media**: Gửi ảnh, video và tin nhắn thoại voice note xem file có được đẩy lên Cloudflare R2 / load mượt không.
- [ ] **WebRTC Voice Call & Stage**:
  - Hai người dùng tham gia kênh thoại `general-voice`.
  - Kiểm tra đàm thoại hai chiều, viền xanh nói (`isSpeaking`) và chức năng Fullscreen tự ẩn thanh công cụ.

