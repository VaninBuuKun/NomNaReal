# 🚀 NomNa — Performance Engineering & Load Testing Hub

Thư mục này chứa bộ cẩm nang toàn diện về kiểm thử tải, phân tích chỉ số và tối ưu hóa hệ thống NomNa sử dụng **Grafana k6**:

## 📚 7 Tập Chuyên Khảo Thực Chiến

1. **[`01-performance-testing-fundamentals.md`](./01-performance-testing-fundamentals.md)**  
   *Nền tảng kiểm thử hiệu năng phần mềm hiện đại:* Smoke, Load, Stress, Spike, Soak, Capacity testing; Các chỉ số vàng SRE (RPS, Latency, Error Rate, Saturation); Định luật Little.

2. **[`02-k6-in-nomna-and-metrics-guide.md`](./02-k6-in-nomna-and-metrics-guide.md)**  
   *Thực chiến k6 trong NomNa:* Hướng dẫn chạy k6 HTTP/WebSocket trong Docker (`scripts/k6/run-bench.sh`), từ điển giải mã metrics và case study thực tế.

3. **[`03-k6-pitfalls-and-advanced-evolution.md`](./03-k6-pitfalls-and-advanced-evolution.md)**  
   *Cạm bẫy k6 & Kịch bản nâng cao:* Tránh ngộ nhận phân phối, kiểm thử SignalR protocol, giả lập độ trễ mạng và mô hình VU arrival-rate.

4. **[`04-scaling-and-bottleneck-engineering-playbook.md`](./04-scaling-and-bottleneck-engineering-playbook.md)**  
   *Cẩm nang tháo gỡ điểm nghẽn:* Tối ưu PostgreSQL connection pooling, Redis pipelining/Lua, GC .NET 9, Linux kernel TCP tuning (`sysctl.conf`).

5. **[`05-k6-enterprise-suite-and-seeding-plan.md`](./05-k6-enterprise-suite-and-seeding-plan.md)**  
   *Kịch bản kiểm thử quy mô Enterprise & Dữ liệu mẫu:* Chiến lược sinh dữ liệu ảo (Seeding 100k users, 1M messages) và kịch bản hỗn hợp (Spike + Soak).

6. **[`06-principal-system-scaling-and-tradeoffs-bible.md`](./06-principal-system-scaling-and-tradeoffs-bible.md)**  
   *Bách khoa toàn thư Kiến trúc Hiệu năng cao & Ma trận Đánh đổi (Principal Engineer Bible):* Giải phẫu sâu C# CLR/.NET 9 Memory Model (SOH/LOH/POH/DATAS, `ValueTask`), Audit 5 điểm nghẽn thực tế trong code NomNa, Kestrel & SignalR Multi-node Scaling, PostgreSQL 16 Internals (MVCC, HOT update, UUIDv7, 6 cấp độ scale DB), 4 tầng tiến hóa Search Engine, Linux Kernel Ephemeral Ports / Unix Domain Sockets, và Ma trận Trade-Off từ 1k đến >100k CCU.

7. **[`07-postgresql-internals-mvcc-indexing-and-tuning-guide.md`](./07-postgresql-internals-mvcc-indexing-and-tuning-guide.md)**  
   *Cẩm nang Ôn luyện PostgreSQL Chuyên sâu:* Giải phẫu cơ chế MVCC (`xmin`, `xmax`, `ctid`, Dead Tuples, Bloat, VACUUM vs VACUUM FULL, HOT Update), 6 loại Index trong Postgres (B-Tree, GIN, BRIN, Hash, GiST), thực nghiệm đối đầu `UUIDv4` (`messages`) vs `UUIDv7` (`ms2`), giải mã toàn bộ tham số cấu hình (`shared_buffers`, `work_mem`, `effective_cache_size`...) và từ điển đọc `EXPLAIN (ANALYZE, BUFFERS)`.

---
> Để xem tài liệu tổng quan và bản đồ định vị hiệu năng, đọc thêm tại [`../deep-dive-infrastructure-and-performance-testing.md`](../deep-dive-infrastructure-and-performance-testing.md).

