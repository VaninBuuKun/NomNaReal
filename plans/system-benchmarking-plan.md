# 🧪 NomNa — Kế Hoạch 1 Tuần Luyện Testing & Đo Đạc Hiệu Năng Hệ Thống (System Benchmarking Lab)

> **Mục tiêu:** Chuyển dịch tư duy từ "Feature Coder" sang "System & Performance Engineer". Dùng số liệu thực nghiệm (P95, P99, RPS, GC, ThreadPool, Sockets) trên môi trường Docker cô lập và VPS thật để tìm điểm gãy (Breakpoint) và tối ưu hóa toàn bộ hệ thống NomNa (.NET 9, SignalR, PostgreSQL, Redis, Linux OS).
> **Nhánh thực chiến:** `perf/system-benchmarking`

---

## 📅 Lộ Trình 7 Ngày Chi Tiết

### [Giai đoạn 1] Ngày 1–2: Thiết lập Baseline & Đo đạc bằng Grafana k6
- [ ] Khởi chạy cụm benchmark cô lập: `docker-compose -f scripts/k6/docker-compose.bench.yml up -d` (WebAPI 1 vCPU, 512MB RAM).
- [ ] Chạy kịch bản HTTP REST (Login token pool, Keyset pagination query): `./scripts/k6/run-bench.sh http`.
- [ ] Chạy kịch bản WebSocket Realtime (SignalR Ping/Pong, SendMessage, ReceiveMessage): `./scripts/k6/run-bench.sh ws`.
- [ ] Đọc và lưu lại bộ chỉ số vàng baseline: RPS, P95/P99 latency, Error rate.
- [ ] Sinh 100.000 messages bằng `scripts/seed_large_dataset.py` để kiểm tra độ trượt của truy vấn khi DB phình to.

### [Giai đoạn 2] Ngày 3: Đào sâu Runtime .NET 9 & C# Internals
- [ ] Cài đặt và sử dụng `dotnet-counters monitor --process-name NomNa.WebAPI`:
  - Quan sát CPU usage, GC Heap sizes (Gen 0, Gen 1, Gen 2, LOH).
  - Giám sát **ThreadPool Queue Length** để phát hiện nghẽn ThreadPool Starvation.
- [ ] Dùng `dotnet-trace` thu thập trace file khi đang chạy k6 stress test $\to$ Phân tích Flame Graph / SpeedScope để xác định method C# tốn CPU nhất.
- [ ] Đánh giá việc cấp phát bộ nhớ (Allocation per request): tối ưu `ValueTask`, `ArrayPool` nếu cần.

### [Giai đoạn 3] Ngày 4: Tinh chỉnh Linux Kernel, VPS & Nginx
- [ ] Tháo gỡ giới hạn File Descriptors (`ulimit -n 65535`, cấu hình `/etc/security/limits.conf`).
- [ ] Tinh chỉnh mạng Linux (`/etc/sysctl.conf`):
  - `net.core.somaxconn = 32768` (TCP listen backlog)
  - `net.ipv4.tcp_tw_reuse = 1` (Tái sử dụng TIME_WAIT sockets)
  - Mở rộng dãy Ephemeral Ports.
- [ ] Tối ưu hóa Nginx reverse proxy cho 10.000 kết nối WebSocket (`worker_rlimit_nofile`, `proxy_read_timeout`).

### [Giai đoạn 4] Ngày 5: Kiểm tra sức chịu tải của PostgreSQL & Redis
- [ ] **PostgreSQL 16**:
  - Soi câu lệnh `EXPLAIN (ANALYZE, BUFFERS)` của các query phân trang Keyset tin nhắn.
  - Đo giới hạn Max Connection Pooling của `Npgsql` / `PgBouncer`.
  - Bật `log_min_duration_statement = 200` để bắt vết các slow queries.
- [ ] **Redis 7**:
  - Dùng `SLOWLOG GET` kiểm tra thời gian thực thi của các Lua scripts trong `RedisUserPresenceTracker`.
  - Đo độ trễ Redis khi hàng nghìn client gửi `PingPresence` định kỳ 25s.

### [Giai đoạn 5] Ngày 6–7: Bắn tải trên VPS Thật & Tìm điểm gãy (Breakpoint Testing)
- [ ] Triển khai NomNa lên VPS thật qua `scripts/setup-vps.sh` và Docker Compose.
- [ ] Dùng máy bên ngoài bắn k6 tăng dần tải: 100 VUs $\to$ 500 VUs $\to$ 1.000 VUs $\to$ 2.000 VUs.
- [ ] Xác định chính xác **Điểm Gãy (Inflection Point)**: Ở mốc bao nhiêu CCU thì hệ thống bắt đầu quá tải? Điểm gãy sập ở đâu đầu tiên (OOM RAM, CPU 100%, hay Socket)?
- [ ] Xuất báo cáo tổng kết hoàn chỉnh: `docs/performance/benchmark-report-vps.md`.

