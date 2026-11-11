# 📚 NomNa — Chuyên Khảo Sâu: Hạ Tầng, Kiểm Thử Tải & Tối Ưu Hóa Hệ Thống

> **Tài liệu tham chiếu chính:** Bộ cẩm nang hiệu năng toàn diện dành cho dự án **NomNa** (.NET 9, PostgreSQL 16, SignalR, React 19).
> **Vị trí:** `docs/deep-dive-infrastructure-and-performance-testing.md`

---

## Lời Mở Đầu

Tài liệu này được biên soạn như một **bản đồ định vị và cẩm nang kỹ thuật thực chiến** nhằm giúp đội ngũ kỹ sư NomNa chinh phục bài toán hiệu năng cao (High Concurrency / Realtime Messaging), vượt qua các giới hạn kiến trúc khi mở rộng hệ thống từ 100 người dùng lên hàng chục nghìn người dùng đồng thời (C10K/C100K).

Toàn bộ nội dung chi tiết được chia thành **4 tập chuyên đề độc lập**, đi từ lý thuyết nền tảng đến thực chiến công cụ và cẩm nang tối ưu từng tầng kiến trúc.

---

## 🗂️ Danh Mục Các Tập Chuyên Đề Chi Tiết

### [Tập 1: Toàn Thư Về Performance Testing: Các Loại Kiểm Thử, Chỉ Số Cốt Lõi & Tư Duy Đánh Giá](./performance/01-performance-testing-fundamentals.md)
*Nền tảng lý thuyết vững chắc về kiểm thử hiệu năng phần mềm hiện đại.*
- **Bản chất của Performance Testing:** Vì sao Unit Test và kiểm thử chức năng không bao giờ bảo đảm hệ thống sống sót trên Production.
- **Phân loại chi tiết 6 loại Performance Testing kinh điển** kèm ví dụ sống động trong NomNa:
  1. *Smoke Testing:* Kiểm thử khói, sanity check kịch bản.
  2. *Load Testing:* Kiểm thử tải theo chuẩn cam kết SLA/SLO.
  3. *Stress Testing:* Kiểm thử quá tải, tìm điểm uốn (Inflection Point / Knee of the curve).
  4. *Spike Testing:* Đột biến tải tức thời trong vài giây (Livestream giveaway, flash-sale).
  5. *Soak / Endurance Testing:* Kiểm thử độ bền 12h - 48h để phát hiện rò rỉ bộ nhớ (Memory Leaks), rò rỉ File Descriptors.
  6. *Breakpoint / Capacity Testing:* Tăng tải liên tục đến khi hệ thống gãy hoàn toàn để xác định trần công suất tối đa.
- **Bộ tứ chỉ số vàng của Google SRE:** Throughput (RPS), Latency, Error Rate, Saturation.
- **Cú lừa của con số trung bình (Flaw of Averages):** Vì sao phải nhìn vào phân vị P95 và P99 thay vì Average.
- **Định luật Little (Little's Law):** $L = \lambda \times W$ và công thức tính tải cho hệ thống chat.

👉 **Đọc chi tiết tại:** [`docs/performance/01-performance-testing-fundamentals.md`](./performance/01-performance-testing-fundamentals.md)

---

### [Tập 2: Thực Chiến k6 Trong Dự Án NomNa & Cẩm Nang Đọc - Giải Mã Các Chỉ Số](./performance/02-k6-in-nomna-and-metrics-guide.md)
*Làm chủ công cụ Grafana k6 trong mã nguồn thực tế của NomNa.*
- **k6 là gì và vì sao đánh bại JMeter / Locust:** Kiến trúc Go Goroutines siêu nhẹ, tiết kiệm 95% RAM so với OS Threads của Java JMeter.
- **k6 đã mang lại lợi ích gì cho NomNa:** Thiết lập môi trường đo đạc cô lập (`docker-compose.bench.yml`), phát hiện điểm nghẽn 1 vCPU ở 300 VUs, chứng minh DB không phải điểm nghẽn, kiểm thử giao thức SignalR WebSocket thô.
- **Hướng dẫn từng bước cách chạy k6 trong project:**
  - Chạy kịch bản REST API: `./scripts/k6/run-bench.sh http`
  - Chạy kịch bản Realtime SignalR: `./scripts/k6/run-bench.sh ws`
  - Vòng đời setup, healthcheck và xuất file kết quả tự động.
- **Từ điển tường giải mọi thông số k6:** `http_req_duration`, `http_req_waiting` (TTFB), `http_req_connecting`, `http_req_blocked`, `checks`, `thresholds`, và các custom metric của NomNa.
- **Mổ xẻ thực chiến case study `baseline_http_1792863834.json`:** Giải mã vì sao P95 vọt lên 31.3 giây và 46 request gửi tin bị thất bại do bẫy gọi API Login băm PBKDF2 trong vòng lặp.

👉 **Đọc chi tiết tại:** [`docs/performance/02-k6-in-nomna-and-metrics-guide.md`](./performance/02-k6-in-nomna-and-metrics-guide.md)

---

### [Tập 3: Cạm Bẫy Trong Performance Testing & Lộ Trình Tiến Hóa k6](./performance/03-k6-pitfalls-and-advanced-evolution.md)
*Nhận diện các sai lầm nguy hiểm khi đo tải và lộ trình đưa k6 lên chuẩn Enterprise.*
- **7 Cạm bẫy kinh điển cần tránh:**
  1. *Coordinated Omission:* Sai số hệ thống khi server bị nghẽn làm giảm nhịp gửi request.
  2. *Benchmark Client Saturation:* k6 client bị cạn CPU/RAM hoặc Ephemeral Ports.
  3. *Đăng nhập trong vòng lặp chính:* Thiêu rụi CPU server bằng thuật toán băm mật khẩu.
  4. *Đo WebSocket ảo:* Chỉ bắt HTTP 101 Handshake mà bỏ qua độ trễ lan truyền frame tin nhắn (Fanout latency).
  5. *Cache Hit giả tạo:* Cả 300 VUs đều query cùng 1 channel ID khiến RAM cache hit 100%.
  6. *Thiếu Think Time:* Bắn request liên tục như DDoS thay vì mô phỏng nhịp đọc/gõ của người thật.
  7. *Cạn kiệt cổng tạm thời (Ephemeral Port Exhaustion):* Kẹt socket ở trạng thái `TIME_WAIT`.
- **Lộ trình 5 bước tiến hóa k6 cho NomNa:**
  1. Đo lường SignalR Fanout Latency P99 với C10K (10.000 clients).
  2. Đưa k6 vào GitHub Actions CI/CD làm Performance Regression Gate (chặn PR làm giảm hiệu năng).
  3. Trực quan hóa thời gian thực: k6 + InfluxDB / Prometheus + Grafana Dashboard.
  4. Kiểm thử phân tán (Distributed Load Testing) với k6-operator trên Kubernetes.
  5. Chaos Engineering kết hợp Load Test: Kiểm chứng khả năng tự hồi phục khi sập node hoặc restart container.

👉 **Đọc chi tiết tại:** [`docs/performance/03-k6-pitfalls-and-advanced-evolution.md`](./performance/03-k6-pitfalls-and-advanced-evolution.md)

---

### [Tập 4: Cẩm Nang Kỹ Nghệ Tối Ưu Hệ Thống: Tư Duy Vượt Qua Điểm Nghẽn & Chiến Lược Scale Toàn Diện](./performance/04-scaling-and-bottleneck-engineering-playbook.md)
*Sổ tay thực chiến cho Principal Engineer khi hệ thống chạm ngưỡng giới hạn.*
- **Triết lý kỹ nghệ hiệu năng & Các định luật nền tảng:**
  - Quy trình "Đo lường - Khoan sâu - Tối ưu 1 thứ - Đo lại".
  - Định luật Amdahl về giới hạn tăng tốc song song do khóa tuần tự.
  - Universal Scalability Law (USL): Vì sao thêm máy có thể làm hệ thống chạy chậm hơn do chi phí đồng bộ dữ liệu (Coherency cost).
- **Tầng 1: Tinh chỉnh Framework & Runtime (.NET 9 & Kestrel):**
  - Chuyển `AddDbContext` sang `AddDbContextPool` để tái sử dụng instance, giảm 85% allocations.
  - Bẫy Sync-over-Async (`.Result`, `.Wait()`) gây ThreadPool starvation.
  - Tối ưu Garbage Collection: Server GC trong Docker, Zero-allocation với `Span<T>` và `ArrayPool<byte>`.
  - EF Core 9: `AsNoTracking()` cho read paths và Compiled Queries cho hot-path.
- **Tầng 2: Tối ưu hóa Cơ sở dữ liệu (PostgreSQL 16):**
  - Nghệ thuật Connection Pooling: PgBouncer (Transaction pooling) giải cứu PostgreSQL khỏi việc cạn RAM khi có 10.000 connections.
  - Keyset Cursor Pagination $O(1)$ kết hợp B-Tree Composite Index thay cho thảm họa `OFFSET / LIMIT`.
  - Giải quyết nợ kỹ thuật: Chuyển tìm kiếm `LIKE %kw%` sang PostgreSQL Full-Text Search với GIN Index.
  - CQRS Read/Write Splitting với Read Replicas và Table Partitioning cho bảng Messages.
- **Tầng 3: Tinh chỉnh Hệ điều hành & Mạng (Linux Kernel Tuning cho C10K/C100K):**
  - Mở rộng giới hạn File Descriptors (`ulimit -n`, `nofile` 65535).
  - Tăng độ sâu TCP Listen Backlog (`somaxconn = 65535`, `tcp_max_syn_backlog = 32768`).
  - Mở rộng Ephemeral Ports và tái sử dụng socket `TIME_WAIT` (`tcp_tw_reuse = 1`).
  - Tối ưu bộ đệm TCP socket buffers và tắt Nagle's Algorithm (`TCP_NODELAY`).
- **Tầng 4: Tư duy Kiến trúc & Trải nghiệm Người dùng (UX Mindset):**
  - Cơ chế chống sập: Token Bucket Rate Limiting và Polly Circuit Breaker.
  - Tách rời bất đồng bộ (Asynchronous Decoupling) & Outbox Pattern cho Link Preview, Notifications, Webhooks.
  - Multi-tier Cache và phòng chống Cache Stampede / Thundering Herd bằng SemaphoreSlim SingleFlight.
  - UX khi hệ thống suy thoái: Optimistic UI (hiển thị ngay tức thì trong 0ms) và Graceful Degradation (chủ động tắt Typing Indicator và Presence khi CPU > 85% để bảo toàn luồng chat cốt lõi).

👉 **Đọc chi tiết tại:** [`docs/performance/04-scaling-and-bottleneck-engineering-playbook.md`](./performance/04-scaling-and-bottleneck-engineering-playbook.md)

---

### [Tập 5: Khảo Sát Kiến Trúc: Cơ Sở Dữ Liệu & Chiến Lược Caching Cho Hệ Thống Realtime Chat Ở Quy Mô Lớn](./architecture/realtime-chat-database-and-caching-strategies.md)
*Góc nhìn Senior/Staff/Principal Engineer về bài toán lưu trữ và tăng tốc dữ liệu chat.*
- **Bản chất dữ liệu chat:** Write-heavy (99% append-only), High temporal locality (95% đọc 50 tin mới nhất), Strict chronological ordering.
- **Cuộc chiến SQL vs NoSQL vs NewSQL:** B-Tree in-place update vs LSM-Tree append-only (SSTables).
- **Mổ xẻ các case study chuyển đổi cơ sở dữ liệu lịch sử:**
  - *Discord:* Từ MongoDB ➔ Apache Cassandra ➔ **ScyllaDB** (C++, không JVM GC pauses, P99 < 15ms).
  - *Meta Messenger:* Từ HBase (NoSQL) ➔ **MyRocks** (LSM trên MySQL, giảm 75% dung lượng đĩa, tận dụng tooling MySQL).
  - *Slack:* Trung thành với **MySQL** qua Vitess Sharding (giữ trọn vẹn ACID & phân quyền phức tạp cho B2B).
  - *WhatsApp:* **Erlang Mnesia** + triết lý "Store-and-Forward" (Server không lưu tin vĩnh viễn, xóa ngay sau khi client ACK).
  - *Telegram:* MTProto + 5 Datacenter phân tán địa lý theo đầu số điện thoại.
- **Toàn thư về chiến lược Caching trong Chat Realtime:**
  - 4 mô hình: Cache-Aside, Write-Through, Write-Behind, Refresh-Ahead.
  - Cấu trúc Redis tối ưu: `Sorted Set (ZSET)` cho hot messages range queries, `Hash` cho bộ đếm tin chưa đọc, `String` với Heartbeat TTL cho Presence.
  - 4 thảm họa Cache: Cache Stampede (SingleFlight / Mutex), Cache Penetration (Bloom Filter, Cache Null), Cache Avalanche (TTL Jitter), Cache Invalidation race conditions (Transactional Outbox & CDC Debezium).
- **Lộ trình kiến trúc cho NomNa:** PostgreSQL 16 hiện tại + Redis ZSET ➔ Read Replicas + Table Partitioning ➔ ScyllaDB khi đạt quy mô hàng trăm triệu tin nhắn.

👉 **Đọc chi tiết tại:** [`docs/architecture/realtime-chat-database-and-caching-strategies.md`](./architecture/realtime-chat-database-and-caching-strategies.md)

---

### [Tập 6: Kế Hoạch Toàn Diện: Chuẩn Hóa k6 Performance Suite, Chiến Lược Sinh Dữ Liệu Tải Lớn & Quy Trình Đo Đạc Tối Ưu](./performance/05-k6-enterprise-suite-and-seeding-plan.md)
*Kế hoạch tổng thể cấp Staff/Principal Engineer đưa kiểm thử hiệu năng lên chuẩn công nghiệp.*
- **Khảo sát thực trạng:** Cạm bẫy dữ liệu tí hon (Tiny Seed Data Fallacy); Bẫy băm mật khẩu trong loop; Thiếu mô hình phân phối hành vi người dùng (Traffic Modeling).
- **Chiến lược sinh dữ liệu lớn (High-Volume Seeding Strategy):**
  - Cấu trúc đa phân cấp: 100 Users, 10 Servers, 50 Channels, quan hệ phức tạp.
  - 3 nấc quy mô: Standard (100.000 tin), Scale (1.000.000 tin), Enterprise (10.000.000 tin).
  - Kỹ thuật sinh tốc độ cao: PostgreSQL `COPY FROM STDIN` Binary/CSV streaming (100.000 dòng trong 2.5s, 1.000.000 dòng trong 22s).
- **Tái cấu trúc bộ test k6 chuẩn Enterprise:**
  - Cấu trúc module hóa: `config/`, `lib/`, `scenarios/`.
  - Quản lý Token Pool (`auth-pool.js`) loại bỏ 100% chi phí login khỏi vòng lặp test.
  - Mô hình hành vi thực tế: 75% lướt đọc, 20% gửi tin, 5% reaction.
  - Think-time ngẫu nhiên theo phân phối Gaussian/Poisson.
- **Hệ thống 4 kịch bản mục tiêu:** Realistic Traffic, Deep Pagination Stress, Sudden Spike Surge, SignalR Fanout C10K.
- **Quy trình tích hợp:** Performance Regression Gate trong GitHub Actions CI chặn PR làm suy giảm P95 > 15%.
- **Lộ trình thực thi 4 giai đoạn micro-slices.**

👉 **Đọc chi tiết tại:** [`docs/performance/05-k6-enterprise-suite-and-seeding-plan.md`](./performance/05-k6-enterprise-suite-and-seeding-plan.md)

---

### [Chuyên Đề Trọng Tâm: Kiến Trúc Chi Tiết & Kế Hoạch Kiểm Thử Toàn Diện Hệ Thống Message](./features/message-system-deep-dive-and-testing-plan.md)
*Mổ xẻ 100% "nội tạng" tính năng Message trong mã nguồn NomNa phục vụ Tuần 1: Chinh phục Core Messages.*
- **Kiến trúc phân tầng:** Domain entities, CQRS Commands & Queries, EF Core mapping, Caching, Controllers & SignalR ChatHub.
- **Mổ xẻ SQL thực tế:**
  - `SendMessage`: 3-4 round-trips mạng tuần tự (channel, membership, reply, insert message, update channel, notifications).
  - `GetMessages`: Keyset cursor `Before/After`, `AsNoTracking()`, gộp reactions batching (chống N+1).
  - `GetMessagesAround`: Jump-to-message 2 chiều.
  - `SearchMessages`: `LIKE '%kw%'` (rủi ro quét đĩa tuần tự).
- **Đánh giá nợ kỹ thuật:** Cần `AddDbContextPool`, cursor kép `(CreatedAt, Id)`, gộp query kiểm tra quyền, chuyển search sang GIN index, thêm `IdempotencyKey`.
- **Ma trận 5 bài kiểm thử k6:** Pure Read Throughput, Pure Write Concurrency & Lock Contention, Realistic Mixed Traffic, SignalR Fanout C1K, Search Stress Test.

👉 **Đọc chi tiết tại:** [`docs/features/message-system-deep-dive-and-testing-plan.md`](./features/message-system-deep-dive-and-testing-plan.md)

---

## 🎯 Tóm Tắt Bản Đồ Hành Động (Execution Checklist)

| Mục Tiêu | Việc Cần Làm Ngay | Tài Liệu Tham Chiếu |
| :--- | :--- | :--- |
| **Sửa kịch bản k6 hiện tại** | Tách `POST /api/auth/login` ra khỏi `default function()`, chuyển sang cấp trước token ở `setup()` | [Tập 2: Mục 6.3](./performance/02-k6-in-nomna-and-metrics-guide.md#63-giải-pháp-khắc-phục-kịch-bản-k6) |
| **Giảm áp lực GC của WebAPI** | Đổi `AddDbContext` thành `AddDbContextPool` trong `DependencyInjection.cs` | [Tập 4: Mục 2.1](./performance/04-scaling-and-bottleneck-engineering-playbook.md#21-adddbcontextpool-vs-adddbcontext-tái-sử-dụng-tài-nguyên) |
| **Bảo vệ Database** | Bật `AsNoTracking()` cho `GetMessagesQueryHandler`, chuyển đổi Keyset Cursor | [Tập 4: Mục 2.4 & 3.2](./performance/04-scaling-and-bottleneck-engineering-playbook.md#32-chiến-lược-indexing--phân-trang-keyset-cursor-o1) |
| **Giải quyết nợ Full-Text Search** | Tạo cột `tsvector` và index GIN cho `Messages.Content` | [Tập 4: Mục 3.3](./performance/04-scaling-and-bottleneck-engineering-playbook.md#33-giải-quyết-nợ-kỹ-thuật-full-text-search-gin-index-thay-vì-like-kw) |
| **Tăng cường trải nghiệm Frontend** | Triển khai Optimistic UI với temp ID và cơ chế retry khi gửi tin nhắn | [Tập 4: Mục 5.4](./performance/04-scaling-and-bottleneck-engineering-playbook.md#54-ux-khi-hệ-thống-quá-tải-optimistic-ui--graceful-degradation) |
| **Mở rộng Socket Linux cho C10K** | Cấu hình `ulimits.nofile: 65536` và sysctl `somaxconn` trong docker-compose | [Tập 4: Mục 4.1 & 4.2](./performance/04-scaling-and-bottleneck-engineering-playbook.md#41-giới-hạn-file-descriptors-ulimit--n-nofile) |
