# 📚 NomNa — Trung Tâm Tài Liệu Kỹ Thuật (Engineering Documentation Hub)

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án **NomNa** — Hệ thống trò chuyện thời gian thực hiện đại xây dựng trên nền tảng .NET 9, Clean Architecture, PostgreSQL, Redis, SignalR và React 18.

Tài liệu được phân loại theo từng chuyên mục rõ ràng để phục vụ việc phát triển độc lập theo tính năng (Feature Branches / RFCs) mà không gây chồng chéo.

---

## 🗂️ Cấu Trúc Tổng Quan Thư Mục `docs/`

```
docs/
├── README.md                                          # Trang chủ điều hướng tài liệu (Bạn đang ở đây)
│
├── architecture/                                      # Kiến trúc cốt lõi & Thiết kế hệ thống
│   ├── system-requirements-and-technical-overview.md  # Yêu cầu hệ thống, Tech stack, Clean Architecture & CQRS
│   ├── realtime-chat-database-and-caching-strategies.md# Chiến lược đánh chỉ mục DB, Caching & Partitioning
│   └── webrtc-architecture-and-engineering-deep-dive.md# Kiến trúc WebRTC P2P, Transceivers & Signaling chuyên sâu
│
├── features/                                          # Chuyên khảo tính năng & RFC theo từng module
│   ├── presence-tracker/                              # Hệ thống theo dõi trạng thái Online/Offline v2
│   │   └── presence-tracker-deep-dive-and-architecture.md
│   ├── messaging/                                     # Hệ thống nhắn tin, phân trang Keyset & Virtualization
│   │   └── message-system-deep-dive-and-testing-plan.md
│   └── webrtc-call/                                   # Cuộc gọi đàm thoại 1-1 qua WebRTC
│       └── webrtc-1v1-call-and-signaling-guide.md
│
├── database/                                          # Lược đồ cơ sở dữ liệu quan hệ (PostgreSQL)
│   ├── README.md                                      # Tổng quan danh mục dữ liệu
│   ├── database_schema.md                             # Đặc tả chi tiết các bảng, trường và khóa
│   ├── database_schema.dbml                           # Lược đồ DBML dùng cho dbdiagram.io
│   └── database_schema.xml                            # Lược đồ XML
│
└── performance/                                       # Kiểm thử tải k6 & Cẩm nang mở rộng quy mô
    ├── deep-dive-infrastructure-and-performance-testing.md # Bản đồ định vị và cẩm nang hiệu năng tổng thể
    ├── 01-performance-testing-fundamentals.md         # Lý thuyết nền tảng & 6 loại kiểm thử
    ├── 02-k6-in-nomna-and-metrics-guide.md            # Thực chiến k6 trong NomNa & đọc hiểu metrics
    ├── 03-k6-pitfalls-and-advanced-evolution.md       # Cạm bẫy thường gặp & kịch bản nâng cao
    ├── 04-scaling-and-bottleneck-engineering-playbook.md # Cẩm nang tối ưu từng tầng nghẽn (DB, Redis, OS)
    └── 05-k6-enterprise-suite-and-seeding-plan.md     # Bộ kịch bản enterprise & kế hoạch dữ liệu mẫu
```

---

## 🧭 Lộ Trình Tham Khảo Dành Cho Kỹ Sư

### 1. Dành cho thành viên mới bắt đầu (Onboarding)
- Đọc [Yêu Cầu Hệ Thống & Tổng Quan Kỹ Thuật](architecture/system-requirements-and-technical-overview.md) để nắm toàn bộ luồng Clean Architecture, CQRS MediatR và React SPA.
- Xem [Đặc Tả Cơ Sở Dữ Liệu](database/database_schema.md) để hiểu quan hệ giữa Server, Channel, Permission và Message.

### 2. Dành cho kỹ sư phát triển tính năng Realtime
- **Trạng thái kết nối & Hiện diện:** Tham khảo [Chuyên Khảo Presence Tracker v2](features/presence-tracker/presence-tracker-deep-dive-and-architecture.md) (Redis Lease Model, Lua Scripting, Batch Pipelining).
- **Hệ thống nhắn tin:** Tham khảo [Messaging Deep Dive & Testing Plan](features/messaging/message-system-deep-dive-and-testing-plan.md).
- **Đàm thoại thoại & video:** Tham khảo [WebRTC 1-1 Feature Guide](features/webrtc-call/webrtc-1v1-call-and-signaling-guide.md) và [WebRTC Architecture Deep Dive](architecture/webrtc-architecture-and-engineering-deep-dive.md).

### 3. Dành cho kỹ sư SRE, DevOps & Kiểm Thử Hiệu Năng
- Bắt đầu với [Bản Đồ Định Vị & Cẩm Nang Hiệu Năng](deep-dive-infrastructure-and-performance-testing.md).
- Xem chi tiết 5 tập cẩm nang Grafana k6 trong thư mục [`performance/`](performance/).

---

## ✍️ Quy Định Đóng Góp Tài Liệu Khi Tạo Branch Mới
Khi bạn mở một nhánh tính năng mới (`feat/<feature-name>`), hãy áp dụng quy chuẩn **RFC-Driven Development**:
1. Tạo một thư mục con trong `docs/features/<feature-name>/`.
2. Soạn thảo file kiến trúc theo chuẩn:
   - **Bối cảnh & Vấn đề giải quyết.**
   - **Sơ đồ Mermaid (Flowchart / Sequence Diagram).**
   - **Thiết kế dữ liệu (Redis Keys, DB Tables, DTOs).**
   - **Các trường hợp biên (Edge Cases) & Khả năng chịu lỗi.**
   - **Kế hoạch kiểm thử (Unit tests, k6 scripts).**
3. Chi tiết quy chuẩn được định nghĩa tại skill `.agents/skills/rfc-documentation/SKILL.md`.

