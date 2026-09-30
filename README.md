# 💬 NomNa — Nền Tảng Làm Việc Nhóm & Nhắn Tin Thời Gian Thực

<p align="center">
  <img src="previews/icon.png" alt="NomNa Logo" width="96" height="96" style="border-radius: 20%;" />
</p>

<p align="center">
  <strong>Nền tảng Workspace thời gian thực hiệu năng cao, xây dựng trên .NET 9 & React 18.</strong><br />
  Kết hợp sự tập trung, chuyên nghiệp của Slack và tính linh hoạt của Discord.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt=".NET 9" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Architecture-Clean%20%2B%20CQRS-brightgreen?style=flat-square" alt="Clean Architecture" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## ⚡ Điểm Nhấn Kỹ Thuật

- **Real-Time Engine**: Nhắn tin tức thì, trả lời theo phân luồng (Thread), và hiển thị typing indicator qua SignalR (WebSockets).
- **User Presence Tracking**: Theo dõi trạng thái Online/Offline thời gian thực đa thiết bị, an toàn đa luồng (`ConcurrentDictionary` + Redis).
- **Phân Trang Con Trỏ (Cursor Pagination)**: Tải tin nhắn cũ mượt mà, không giật màn hình với cơ chế neo vị trí cuộn (`Before` timestamp cursor).
- **Nhắn Tin Riêng Kiểu Slack (Deferred DM)**: Kênh chat riêng tư chỉ thực sự tạo khi có tin nhắn đầu tiên gửi đi.
- **Bảo Mật Đa Tầng**: Phân quyền kênh Public / Private, JWT Token xoay vòng (Rotation) qua HttpOnly Cookie, đăng nhập Google OAuth 2.0.
- **Hạ Tầng 100% (Stateless)**: File đính kèm và avatar lưu trực tiếp trên AWS S3 / Cloudflare R2 (Fail-Fast trong môi trường Production).
- **Sẵn Sàng Triển Khai (Production-Ready)**: Docker Alpine siêu nhẹ (< 70MB), Nginx Reverse Proxy tích hợp tự động gia hạn SSL (Certbot), CI/CD tự động qua GitHub Actions & GHCR.

---

## 🏛️ Kiến Trúc Hệ Thống

```
                       ┌──────────────────────────────┐
                       │   Client (React 18 + Vite)   │
                       └──────────────┬───────────────┘
                                      │ HTTPS / WSS
                       ┌──────────────▼──────────────┐
                       │     Nginx Reverse Proxy     │
                       └──────────────┬───────────────┘
                                      │ :8080
                       ┌──────────────▼──────────────┐
                       │   NomNa WebAPI (.NET 9)     │
                       │  Clean Architecture + CQRS  │
                       └───┬──────────┬───────────┬──┘
             EF Core 9     │          │ Presence  │ S3 SDK
        ┌──────────────────▼──┐   ┌───▼───┐   ┌───▼─────────────────┐
        │  PostgreSQL 16 DB   │   │ Redis │   │ AWS S3 / Cloudflare │
        └─────────────────────┘   └───────┘   └─────────────────────┘
```

### Cấu Trúc Mã Nguồn (Clean Architecture)

```
src/
├── NomNa.Domain/          # Độc lập 100%: Thực thể (Entities), Enums, BaseEntity
├── NomNa.Application/     # Nghiệp vụ CQRS (MediatR), Validation, Pipeline Behaviors
│   └── Features/          # Tách biệt tuyệt đối: Command.cs, Handler.cs, Validator.cs
├── NomNa.Infrastructure/  # EF Core, PostgreSQL, S3, Redis Presence, Email SMTP, JWT
├── NomNa.WebAPI/          # Thin Controllers, SignalR Hub, Middlewares, DI Setup
└── NomNa.Shared/          # Constants & DTOs dùng chung
client/                    # React 18 SPA, Vite, Tailwind CSS, Atomic UI Primitives
```

---

## 🚀 Khởi Chạy Nhanh (Local Development)

### Yêu Cầu Môi Trường

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)
- [Docker & Docker Compose](https://www.docker.com/)

### 1. Khởi động Cơ Sở Dữ Liệu & Redis

```bash
docker compose up -d
```

### 2. Cấu Hình Biến Môi Trường

```bash
cp .env.example .env
# File mẫu đã được cấu hình sẵn để chạy ngay với Docker local
```

### 3. Khởi Chạy Backend (.NET 9)

```bash
dotnet restore NomNa.sln
dotnet run --project src/NomNa.WebAPI/NomNa.WebAPI.csproj
```

> API sẵn sàng tại `http://localhost:5000` (Swagger UI tại `/swagger`).

### 4. Khởi Chạy Frontend (React 18)

```bash
cd client
npm install
npm run dev
```

> Giao diện sẵn sàng tại `http://localhost:5173`.

---

## 🐳 Triển Khai Production (VPS Vultr / Cloud)

NomNa được thiết kế theo tư duy **"Cattle, not Pets"** — toàn bộ hệ thống có thể tái tạo hoàn chỉnh từ con số 0 trong **< 10 phút**:

```bash
# 1. Cấu hình bảo mật server 1-Click (Docker, UFW Firewall, Fail2ban)
bash scripts/setup-vps.sh

# 2. Cấp phát chứng chỉ SSL tự động (Let's Encrypt)
bash scripts/issue-ssl.sh your-domain.com your-email@example.com

# 3. Khởi động toàn bộ cụm Production
docker compose -f docker-compose.prod.yml up -d
```

### Tự Động Hoá CI/CD (GitHub Actions)

- **`ci.yml`**: Chạy trên mọi Pull Request — kiểm tra build .NET, TypeScript type-check và ESLint.
- **`deploy.yml`**: Tự động kích hoạt khi push vào nhánh `main` — đóng gói Docker image, đẩy lên **GitHub Container Registry (GHCR)** và SSH vào VPS để cập nhật container không gián đoạn.

---

## 🛠️ Cheatsheet Lệnh Vận Hành

| Tác vụ                       | Câu lệnh thực thi                                              |
| ---------------------------- | -------------------------------------------------------------- |
| **Sao lưu nhanh DB**         | `bash scripts/backup-db.sh` _(Lưu nén tại `~/nomna/backups/`)_ |
| **Phục hồi DB**              | `bash scripts/restore-db.sh <duong_dan_file.sql.gz>`           |
| **Kiểm tra sức khỏe App**    | `curl -f http://localhost:8080/health`                         |
| **Trạng thái các container** | `docker compose -f docker-compose.prod.yml ps`                 |
| **Xem log trực tiếp**        | `docker compose -f docker-compose.prod.yml logs -f app`        |

---

## 📜 Các Biến Môi Trường Quan Trọng

| Biến môi trường     | Mục đích sử dụng            | Mặc định (Dev)                  |
| ------------------- | --------------------------- | ------------------------------- |
| `POSTGRES_DB`       | Tên Database PostgreSQL     | `NomNa`                         |
| `POSTGRES_USER`     | Tài khoản kết nối DB        | `nomna_user`                    |
| `POSTGRES_PASSWORD` | Mật khẩu DB                 | `nomna_secret_pass_2026`        |
| `Jwt__Secret`       | Khoá bí mật ký JWT Token    | _(Tối thiểu 32 ký tự)_          |
| `AwsS3__BucketName` | Tên Bucket S3 / R2 lưu file | _Dev: Tuỳ chọn, Prod: Bắt buộc_ |
| `APP_IMAGE`         | Image triển khai (CI/CD)    | `nomna-app:latest`              |

---
