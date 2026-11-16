# 🏛️ Cẩm Nang Kỹ Nghệ Tối Ưu Hệ Thống: Tư Duy Vượt Qua Điểm Nghẽn & Chiến Lược Scale Toàn Diện

> **Mục tiêu tài liệu:** Cẩm nang kỹ thuật thực chiến cao cấp (Principal Engineer Handbook) trang bị tư duy và giải pháp cụ thể khi một hệ thống phân tán (đặc biệt là ứng dụng chat realtime như NomNa) chạm trần công suất. Bao quát từ tối ưu sâu Framework .NET 9, Cơ sở dữ liệu PostgreSQL, Tinh chỉnh Kernel Linux, đến Nghệ thuật Kiến trúc và Trải nghiệm Người dùng (UX).

---

## Mục Lục
1. [Triết Lý Kỹ Nghệ Hiệu Năng & Các Định Luật Bất Biến](#1-triết-lý-kỹ-nghệ-hiệu-năng--các-định-luật-bất-biến)
   - [1.1. Nguyên tắc "Đo lường - Khoan sâu - Tối ưu - Đo lại"](#11-nguyên-tắc-đo-lường---khoan-sâu---tối-ưu---đo-lại)
   - [1.2. Định luật Amdahl & Giới hạn của việc mở rộng song song](#12-định-luật-amdahl--giới-hạn-của-việc-mở-rộng-song-song)
   - [1.3. Universal Scalability Law (USL): Khi thêm máy làm hệ thống chậm đi](#13-universal-scalability-law-usl-khi-thêm-máy-làm-hệ-thống-chậm-đi)
2. [Tầng 1: Tinh Chỉnh Framework & Runtime (.NET 9 & Kestrel)](#2-tầng-1-tinh-chỉnh-framework--runtime-net-9--kestrel)
   - [2.1. `AddDbContextPool` vs `AddDbContext`: Tái sử dụng tài nguyên](#21-adddbcontextpool-vs-adddbcontext-tái-sử-dụng-tài-nguyên)
   - [2.2. Bẫy Sync-over-Async & Thảm họa ThreadPool Starvation](#22-bẫy-sync-over-async--thảm-họa-threadpool-starvation)
   - [2.3. .NET Garbage Collection (GC) Deep Dive & High-Performance C#](#23-net-garbage-collection-gc-deep-dive--high-performance-c)
   - [2.4. EF Core 9 Best Practices: No-Tracking & Compiled Queries](#24-ef-core-9-best-practices-no-tracking--compiled-queries)
3. [Tầng 2: Tối Ưu Hóa Cơ Sở Dữ Liệu (PostgreSQL 16)](#3-tầng-2-tối-ưu-hóa-cơ-sở-dữ-liệu-postgresql-16)
   - [3.1. Nghệ thuật Connection Pooling: PgBouncer vs Direct Connection](#31-nghệ-thuật-connection-pooling-pgbouncer-vs-direct-connection)
   - [3.2. Chiến lược Indexing & Phân trang Keyset Cursor O(1)](#32-chiến-lược-indexing--phân-trang-keyset-cursor-o1)
   - [3.3. Giải quyết nợ kỹ thuật: Full-Text Search GIN Index thay vì `LIKE %kw%`](#33-giải-quyết-nợ-kỹ-thuật-full-text-search-gin-index-thay-vì-like-kw)
   - [3.4. CQRS Read/Write Splitting & Table Partitioning](#34-cqrs-readwrite-splitting--table-partitioning)
4. [Tầng 3: Tinh Chỉnh Hệ Điều Hành & Mạng (Linux Kernel Tuning cho C10K/C100K)](#4-tầng-3-tinh-chỉnh-hệ-điều-hành--mạng-linux-kernel-tuning-cho-c10kc100k)
   - [4.1. Giới hạn File Descriptors (`ulimit -n`, `nofile`)](#41-giới-hạn-file-descriptors-ulimit--n-nofile)
   - [4.2. TCP Listen Backlog & SYN Queue (`somaxconn`)](#42-tcp-listen-backlog--syn-queue-somaxconn)
   - [4.3. Ephemeral Port Range & TIME_WAIT Socket Reuse](#43-ephemeral-port-range--time_wait-socket-reuse)
   - [4.4. TCP Socket Buffers & `TCP_NODELAY`](#44-tcp-socket-buffers--tcp_nodelay)
5. [Tầng 4: Tư Duy Kiến Trúc & Tối Ưu Trải Nghiệm Người Dùng (UX Mindset)](#5-tầng-4-tư-duy-kiến-trúc--tối-ưu-trải-nghiệm-người-dùng-ux-mindset)
   - [5.1. Cơ chế Chống Sập: Backpressure, Rate Limiting & Circuit Breaker](#51-cơ-chế-chống-sập-backpressure-rate-limiting--circuit-breaker)
   - [5.2. Asynchronous Decoupling & Outbox Pattern](#52-asynchronous-decoupling--outbox-pattern)
   - [5.3. Multi-Tier Caching & Chống Cache Stampede](#53-multi-tier-caching--chống-cache-stampede)
   - [5.4. UX Khi Hệ Thống Quá Tải: Optimistic UI & Graceful Degradation](#54-ux-khi-hệ-thống-quá-tải-optimistic-ui--graceful-degradation)

---

## 1. Triết Lý Kỹ Nghệ Hiệu Năng & Các Định Luật Bất Biến

### 1.1. Nguyên tắc "Đo lường - Khoan sâu - Tối ưu - Đo lại"

Sai lầm lớn nhất của các kỹ sư là **tối ưu hóa sớm dựa trên cảm tính (Premature Optimization)**:
- *"Tôi đoán là do câu query này chậm, để tôi viết lại bằng Dapper!"*
- *"Tôi đoán do server ít RAM, để tôi mua VPS to gấp đôi!"*

Quy trình kỹ nghệ chuẩn mực phải tuân theo vòng lặp khoa học:
```
           ┌──────────────────────────────────────────────┐
           │  1. ĐO LƯỜNG (k6 Benchmark / APM Tracing)   │
           └──────────────────────┬───────────────────────┘
                                  ▼
           ┌──────────────────────────────────────────────┐
           │  2. KHOAN SÂU (dotnet-trace / EXPLAIN DB)   │
           └──────────────────────┬───────────────────────┘
                                  ▼
           ┌──────────────────────────────────────────────┐
           │  3. TỐI ƯU DUY NHẤT 1 THỨ TẠI 1 THỜI ĐIỂM   │
           └──────────────────────┬───────────────────────┘
                                  ▼
           ┌──────────────────────────────────────────────┐
           │  4. ĐO LẠI & SO SÁNH "TRƯỚC / SAU"          │
           └──────────────────────────────────────────────┘
```

> **Nguyên tắc vàng:** Nếu bạn thay đổi cùng lúc 3 thứ (vừa đổi index DB, vừa đổi code C#, vừa nâng cấp RAM) rồi thấy hệ thống nhanh hơn, bạn sẽ **không bao giờ biết** sự cải thiện đó đến từ đâu, và có thể bạn đang mang vào hệ thống một lỗi tiềm ẩn mới!

---

### 1.2. Định luật Amdahl & Giới hạn của việc mở rộng song song

Định luật Amdahl chỉ ra rằng: **Mức độ tăng tốc tối đa của một hệ thống bị giới hạn bởi phần công việc phải xử lý tuần tự (không thể chạy song song).**

$$S_{\text{latency}}(s) = \frac{1}{(1 - p) + \frac{p}{s}}$$

Trong đó:
- $p$: Tỷ lệ phần trăm công việc có thể chạy song song.
- $1 - p$: Tỷ lệ công việc bắt buộc phải chạy tuần tự (ví dụ: chờ Transaction Lock DB, chờ băm mật khẩu PBKDF2).
- $s$: Số lượng vi xử lý (Cores/Nodes).

**Ví dụ thực tế trong NomNa:**
Giả sử thao tác gửi tin nhắn mất 100ms, trong đó:
- 90ms là đọc quyền, parse JSON, gửi socket (có thể chạy song song).
- **10ms là ghi tuần tự vào bảng Messages có khóa độc quyền (Exclusive Lock).** ($1 - p = 0.1$).

Dù bạn có nâng cấp server lên **1.000 CPU cores**, tốc độ xử lý tối đa của hệ thống cũng **không bao giờ tăng quá 10 lần**:
$$\lim_{s \to \infty} S = \frac{1}{0.1} = 10\times$$

> **Bài học:** Muốn hệ thống scale mạnh mẽ, trọng tâm không phải là mua thêm CPU, mà là **tìm cách cắt giảm tối đa phần logic tuần tự và tranh chấp khóa (Lock Contention)!**

---

### 1.3. Universal Scalability Law (USL): Khi thêm máy làm hệ thống chậm đi

Nhiều người nghĩ rằng: 1 node chịu được 1.000 VUs thì 10 nodes sẽ chịu được 10.000 VUs (Scale tuyến tính).
Nhưng trong thực tế, đường cong mở rộng thường có dạng hình chuông ngược (Retrograde Scalability):

```
Throughput (RPS)
   ^
   |                 ĐIỂM ĐỈNH
   |                    ┌─┐
   |                  ┌─┘ └─┐
   |                ┌─┘     └── Thêm node làm hệ thống CHẬM HƠN!
   |              ┌─┘           (Do chi phí đồng bộ dữ liệu quá lớn)
   |            ┌─┘
   |          ┌─┘
   |──────────┴─────────────────────────> Số lượng Node (Servers)
```

Theo **Universal Scalability Law (Neil Gunther)**:
$$C(N) = \frac{N}{1 + \sigma (N - 1) + \kappa N (N - 1)}$$
- $\sigma$ (Contention): Chi phí chờ đợi tài nguyên dùng chung (ví dụ: cùng ghi vào 1 database master).
- $\kappa$ (Coherency): Chi phí các node phải nói chuyện với nhau để giữ đồng bộ dữ liệu (ví dụ: Redis cluster đồng bộ cache, broadcast tin nhắn chéo giữa 10 nodes WebAPI).

Khi $\kappa > 0$, nếu bạn tiếp tục cắm thêm server, chi phí trao đổi dữ liệu xuyên node sẽ vượt qua năng lực tính toán, khiến **toàn bộ hệ thống chạy chậm hơn cả khi chỉ có 1 node!**

---

## 2. Tầng 1: Tinh Chỉnh Framework & Runtime (.NET 9 & Kestrel)

.NET 9 là một trong những web runtime nhanh nhất hành tinh (nằm trong top đầu bảng xếp hạng TechEmpower Benchmarks). Tuy nhiên, nếu dùng sai cách, bạn sẽ biến Kestrel thành một cỗ máy ngốn RAM và nghẽn luồng.

---

### 2.1. `AddDbContextPool` vs `AddDbContext`: Tái sử dụng tài nguyên

Trong file `src/NomNa.Infrastructure/DependencyInjection.cs`, hiện tại dự án đang đăng ký:
```csharp
// HIỆN TẠI: Tạo mới DbContext cho mỗi HTTP Request
services.AddDbContext<ApplicationDbContext>(options => ...);
```

#### Vấn đề:
`DbContext` là một đối tượng rất nặng. Mỗi khi được `new`, nó phải:
1. Khởi tạo đối tượng `ChangeTracker`.
2. Thiết lập ánh xạ metadata model.
3. Cấp phát hàng loạt object trong RAM.

Dưới áp lực **1.000 requests/giây**, hệ thống sẽ tạo ra và hủy **1.000 instances DbContext mỗi giây**. Điều này tạo ra áp lực khổng lồ lên .NET Garbage Collector (Gen 0 dọn dẹp liên tục), gây ra các đợt giật lag vi mô (Micro-stuttering).

#### Giải pháp tối ưu: Chuyển sang `AddDbContextPool`
```csharp
// TỐI ƯU HÓA: Tái sử dụng DbContext từ một Pool có sẵn
services.AddDbContextPool<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
    });
}, poolSize: 1024);
```
- **Cơ chế:** Khi request kết thúc, `DbContext` không bị xóa mà được gọi hàm `ResetState()` và đưa trả về Pool. Request tiếp theo chỉ việc bốc instance rảnh từ Pool ra dùng lại.
- **Hiệu quả:** Giảm **85% allocations** liên quan đến EF Core và giảm đáng kể thời gian tạm dừng của GC!

---

### 2.2. Bẫy Sync-over-Async & Thảm họa ThreadPool Starvation

Trong .NET, Kestrel xử lý hàng chục nghìn kết nối đồng thời nhờ vào mô hình **Non-blocking I/O** dựa trên **ThreadPool**.

#### Cạm bẫy chết người:
Nếu ở bất kỳ đâu trong code, bạn viết:
```csharp
// PHẢN MẪU TAI HẠI (Sync-over-Async):
var user = _userManager.FindByIdAsync(id).Result; // HOẶC .Wait() HOẶC .GetAwaiter().GetResult()
```

#### Hậu quả dây chuyền:
1. Request 1 đến: Chiếm Thread A của ThreadPool.
2. Thread A gọi `.Result` -> Thread A bị **khóa cứng (Blocked)**, ngồi rảnh rỗi chờ database trả về.
3. Database hoàn tất truy vấn, cần một Thread của ThreadPool để chạy nốt đoạn code tiếp theo.
4. Nhưng lúc này 100 requests khác cũng đồng loạt gọi `.Result`, chiếm sạch toàn bộ worker threads hiện có của ThreadPool!
5. Không còn luồng nào rảnh để hoàn tất Task ban đầu -> **Hệ thống rơi vào trạng thái DEADLOCK hoặc ThreadPool Starvation!**
6. Thuật toán của .NET ThreadPool mặc định chỉ tiêm thêm **1 đến 2 worker threads mới mỗi 500ms** khi phát hiện nghẽn luồng.
7. Kết quả: 300 requests bị kẹt cứng, latency vọt lên 30 giây (đúng như số liệu đã thấy trong k6 baseline)!

#### Quy tắc sắt đá:
- **100% Async all the way:** Mọi hàm từ Controller, MediatR Handler đến Database Repository đều phải dùng `async / await`. Tuyệt đối không bao giờ dùng `.Result` hay `.Wait()`.
- Dùng `ValueTask<T>` thay vì `Task<T>` ở những phương thức hot-path thường xuyên trả về kết quả đồng bộ (ví dụ: lấy dữ liệu từ cache hit).

---

### 2.3. .NET Garbage Collection (GC) Deep Dive & High-Performance C#

.NET quản lý bộ nhớ qua 3 thế hệ (Generations):
- **Gen 0:** Đối tượng mới sinh, sống ngắn ngày (biến tạm thời, DTO nhỏ). Dọn dẹp siêu nhanh (~0.1ms).
- **Gen 1:** Vùng đệm giữa Gen 0 và Gen 2.
- **Gen 2:** Đối tượng sống lâu (Singleton cache, DbContext metadata, SignalR connections).
- **Large Object Heap (LOH):** Mọi đối tượng có kích thước **>= 85.000 bytes** sẽ bay thẳng vào LOH. LOH không được gom nén (compacted) mặc định, dễ gây phân mảnh RAM!

#### Khi nào GC trở thành thảm họa?
Khi Gen 2 hoặc LOH bị đầy, GC buộc phải kích hoạt **Full GC (Stop-The-World)**: Toàn bộ các luồng xử lý của ứng dụng bị dừng lại hoàn toàn trong hàng trăm miligiây đến vài giây để quét toàn bộ RAM. Khi đó, toàn bộ kết nối WebSocket SignalR sẽ bị đơ!

#### Kỹ thuật lập trình Zero-Allocation trong C# cao cấp:
1. **Sử dụng `Span<T>` và `ReadOnlySpan<T>`:**
   Khi phân tích cú pháp ký tự ngăn cách `0x1E` của SignalR hoặc cắt chuỗi message, không dùng `string.Substring()` hay `string.Split()` (vì nó sẽ cấp phát string mới trên Heap). Dùng `Span<char>` để thao tác trực tiếp trên vùng nhớ gốc:
   ```csharp
   // KHÔNG CẤP PHÁT BỘ NHỚ TRÊN HEAP:
   ReadOnlySpan<char> span = rawMessage.AsSpan();
   int delimiterIndex = span.IndexOf('\x1e');
   ReadOnlySpan<char> payload = span.Slice(0, delimiterIndex);
   ```
2. **Sử dụng `ArrayPool<byte>.Shared` cho Buffer I/O:**
   Khi xử lý stream upload file hoặc frame WebSocket, không `new byte[4096]`. Mượn mảng từ Pool và trả lại sau khi dùng xong:
   ```csharp
   byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
   try {
       await stream.ReadAsync(buffer, 0, 4096);
       // Xử lý...
   } finally {
       ArrayPool<byte>.Shared.Return(buffer);
   }
   ```
3. **Cấu hình Server GC trong Docker Container:**
   Trong file `src/NomNa.WebAPI/NomNa.WebAPI.csproj` hoặc biến môi trường Docker:
   ```xml
   <PropertyGroup>
       <!-- Bật Server GC để tận dụng đa nhân CPU thay vì Workstation GC đơn luồng -->
       <ServerGarbageCollection>true</ServerGarbageCollection>
       <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
   </PropertyGroup>
   ```

---

### 2.4. EF Core 9 Best Practices: No-Tracking & Compiled Queries

#### 1. Bật `AsNoTracking()` cho 100% Query đọc tin:
Trong `GetMessagesQueryHandler.cs`, bạn chỉ cần đọc dữ liệu để trả về JSON cho client, hoàn toàn không có nhu cầu sửa đổi entity rồi gọi `SaveChangesAsync()`.
```csharp
// Giảm 50% CPU và RAM tiêu thụ bởi Change Tracker:
var messages = await _context.Messages
    .AsNoTracking()
    .Where(m => m.ChannelId == request.ChannelId)
    .OrderByDescending(m => m.CreatedAt)
    .Take(request.Limit)
    .ToListAsync(cancellationToken);
```

#### 2. Dùng Compiled Queries cho các câu truy vấn siêu nóng (Hot Path):
Mỗi lần EF Core thực thi 1 câu LINQ, nó phải dịch biểu thức Expression Tree thành chuỗi SQL (Query Compilation).
Với các API được gọi hàng nghìn lần mỗi giây (như kiểm tra quyền của user trong channel), hãy dùng **Compiled Query** để biên dịch trước câu SQL vào bộ nhớ tĩnh:

```csharp
private static readonly Func<ApplicationDbContext, Guid, Guid, Task<bool>> _checkChannelMembershipCompiled =
    EF.CompileAsyncQuery((ApplicationDbContext context, Guid channelId, Guid userId) =>
        context.ChannelMembers.Any(cm => cm.ChannelId == channelId && cm.UserId == userId));

// Gọi lại với tốc độ tương đương raw ADO.NET:
bool isMember = await _checkChannelMembershipCompiled(_context, channelId, userId);
```

---

## 3. Tầng 2: Tối Ưu Hóa Cơ Sở Dữ Liệu (PostgreSQL 16)

Hầu hết các hệ thống backend khi chết tải đều chết ở Database. Tại sao? Vì Application Server có thể scale ngang (Stateless), còn Database là nơi lưu trữ trạng thái (Stateful) và quản lý tính nhất quán của dữ liệu.

---

### 3.1. Nghệ thuật Connection Pooling: PgBouncer vs Direct Connection

#### Bản chất kiến trúc của PostgreSQL:
Khác với MySQL hay SQL Server (dùng thread), PostgreSQL sử dụng **Process-based Architecture**. Mỗi khi có một kết nối mới tới Postgres:
- Linux Kernel phải gọi hàm `fork()` để tạo ra một tiến trình OS riêng biệt (`postgres: db_user NomNa`).
- Mỗi tiến trình này tiêu tốn **từ 5MB đến 15MB RAM**.
- Khi có 1.000 kết nối đồng thời: PostgreSQL tốn ~10GB RAM chỉ để giữ kết nối!
- CPU phải liên tục thực hiện **Context Switching** giữa 1.000 tiến trình, khiến năng lực xử lý câu lệnh SQL thực tế tụt về gần số 0!

```
KẾT NỐI TRỰC TIẾP (THẢM HỌA Ở TẢI LỚN):
[300 WebAPI Instances] ────(3.000 Connections)────> [PostgreSQL: 3.000 Processes -> CRASH!]

SỬ DỤNG PGBOUNCER (TRANSACTION POOLING):
[300 WebAPI Instances] ────(3.000 Connections)────> [PgBouncer Proxy]
                                                            │
                                            (Chỉ mở cố định 50 kết nối thực)
                                                            ▼
                                                    [PostgreSQL: 50 Processes]
                                                    (CPU tập trung 100% vào Query!)
```

#### Chiến lược áp dụng:
1. **Ở mức ứng dụng (.NET Npgsql):** Cấu hình `MaxPoolSize = 100` trong Connection String.
2. **Ở mức hạ tầng khi Scale:** Đặt một container **PgBouncer** ở giữa Nginx/WebAPI và PostgreSQL, cấu hình ở chế độ `pool_mode = transaction`. Nhờ đó, 5.000 client WebAPI có thể chia sẻ chung 50 kết nối thật của Postgres một cách êm ái!

---

### 3.2. Chiến lược Indexing & Phân trang Keyset Cursor O(1)

Trong ứng dụng chat, tác vụ phổ biến nhất là: Người dùng mở app và cuộn lên để xem tin nhắn cũ.

#### Sai lầm kinh điển: Phân trang dùng `OFFSET` và `LIMIT`
```sql
-- Lấy 25 tin nhắn ở trang thứ 1.000:
SELECT * FROM "Messages" 
WHERE "ChannelId" = '01a16f00...' 
ORDER BY "CreatedAt" DESC 
OFFSET 25000 LIMIT 25;
```
- **Hành vi ngầm của PostgreSQL:** Để lấy được 25 dòng ở offset 25.000, Postgres bắt buộc phải **đọc toàn bộ 25.025 dòng** từ đĩa từ, sắp xếp chúng, sau đó... **vứt bỏ 25.000 dòng đầu tiên** và chỉ trả về 25 dòng cuối!
- **Độ phức tạp:** $O(N)$ — Càng cuộn sâu về quá khứ, query càng chậm, CPU càng tăng!

#### Giải pháp tối thượng: Keyset Pagination (Cursor-based)
Dùng mốc timestamp `CreatedAt` (hoặc cặp `CreatedAt, Id`) của tin nhắn cuối cùng đã nhận làm con trỏ (Cursor):

```sql
-- Lấy 25 tin nhắn tiếp theo nằm trước con trỏ:
SELECT * FROM "Messages"
WHERE "ChannelId" = '01a16f00...' 
  AND "CreatedAt" < '2026-10-25 14:00:00.123456+00'
ORDER BY "CreatedAt" DESC
LIMIT 25;
```

#### Kết hợp với Composite B-Tree Index:
```sql
CREATE INDEX idx_messages_channel_created_desc 
ON "Messages" ("ChannelId", "CreatedAt" DESC);
```
- **Hành vi:** Nhờ có Index này, PostgreSQL nhảy thẳng trực tiếp (B-Tree Index Seek) tới đúng vị trí của con trỏ và đọc ra đúng 25 dòng rồi dừng lại ngay lập tức!
- **Độ phức tạp:** $O(1)$ — Thời gian truy vấn luôn luôn là **< 2ms**, bất kể kênh chat có 100 tin hay 100 triệu tin!

---

### 3.3. Giải quyết nợ kỹ thuật: Full-Text Search GIN Index thay vì `LIKE %kw%`

Trong file `docs/system-requirements-and-technical-overview.md`, món nợ kỹ thuật số 5 được ghi nhận:
> *"Tìm kiếm đang dùng `LIKE '%kw%'` + `ToLower()` trong `SearchMessagesQueryHandler`. Không dùng được index -> Quét tuần tự (Full Table Scan) khi bảng lớn."*

Khi bảng `Messages` có 10 triệu dòng, một câu lệnh:
```sql
SELECT * FROM "Messages" WHERE LOWER("Content") LIKE '%hello%';
```
Sẽ ép PostgreSQL đọc tuần tự toàn bộ hàng chục Gigabytes dữ liệu từ ổ cứng (Sequential Scan). Nếu 10 người cùng bấm tìm kiếm, ổ đĩa sẽ quá tải IOPS và toàn bộ server bị tê liệt!

#### Giải pháp chuẩn: PostgreSQL Full-Text Search với GIN Index
1. Tạo cột `search_vector` dạng `tsvector` tự động cập nhật:
```sql
ALTER TABLE "Messages" ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (to_tsvector('simple', coalesce("Content", ''))) STORED;

-- Tạo Generalized Inverted Index (GIN)
CREATE INDEX idx_messages_search_gin ON "Messages" USING gin(search_vector);
```
2. Viết lại câu query trong MediatR handler:
```sql
SELECT * FROM "Messages"
WHERE "ChannelId" = @ChannelId
  AND search_vector @@ plainto_tsquery('simple', @Keyword)
ORDER BY "CreatedAt" DESC
LIMIT 50;
```
- **Kết quả:** Thời gian tìm kiếm giảm từ **15 giây (quét toàn bảng) xuống còn 4ms**!

---

### 3.4. CQRS Read/Write Splitting & Table Partitioning

Khi lưu lượng tăng cao:
- **CQRS Read/Write Splitting:**
  - 85% lưu lượng là **Đọc** (xem tin nhắn, xem danh sách bạn bè, kiểm tra quyền).
  - 15% lưu lượng là **Ghi** (gửi tin nhắn, tạo kênh).
  - Thiết lập **PostgreSQL Streaming Replication** (1 Primary DB cho ghi, 2 Read Replicas cho đọc).
  - Trong MediatR Pipeline: Nếu là `ICommand` -> điều hướng connection tới Primary; nếu là `IQuery` -> điều hướng tới Read Replica. Năng lực chịu tải của hệ thống tăng gấp 3 lần ngay lập tức!
- **Table Partitioning (Phân vùng bảng Messages):**
  - Khi bảng `Messages` vượt quá 50 triệu bản ghi, Index B-Tree sẽ phình to vượt quá dung lượng RAM (`shared_buffers`), dẫn đến việc đọc index phải tải từ đĩa từ.
  - Phân vùng bảng `Messages` theo tháng (`PARTITION BY RANGE (CreatedAt)`). Các tin nhắn cũ từ các tháng trước sẽ nằm ở partition riêng, giúp partition của tháng hiện tại luôn nhỏ gọn và nằm trọn vẹn trong RAM!

---

## 4. Tầng 3: Tinh Chỉnh Hệ Điều Hành & Mạng (Linux Kernel Tuning cho C10K/C100K)

Khi xây dựng hệ thống Chat Realtime với mục tiêu phục vụ **10.000 đến 100.000 kết nối WebSocket đồng thời (C10K/C100K)**, kẻ thù lớn nhất không phải là code C#, mà chính là **các giới hạn mặc định của Linux Kernel**.

---

### 4.1. Giới hạn File Descriptors (`ulimit -n`, `nofile`)

Trong triết lý thiết kế của Unix/Linux: **"Everything is a file" (Mọi thứ đều là một file)**. Một kết nối mạng TCP socket bản chất được hệ điều hành quản lý như một File Descriptor (FD).

- **Mặc định nguy hiểm:** Trên hầu hết các bản phân phối Linux (Ubuntu, Debian, Alpine), giới hạn số file mở tối đa của một tiến trình (`ulimit -n`) chỉ là **1.024**.
- **Điều gì xảy ra:** Khi người dùng thứ 1.020 mở kết nối WebSocket SignalR, Kestrel hoặc Nginx sẽ ném lỗi ngay lập tức:
  `System.Net.Sockets.SocketException: Too many open files`! Toàn bộ người dùng sau đó sẽ không thể kết nối được nữa.

#### Tinh chỉnh trên Host và trong Docker:
Thêm vào `/etc/security/limits.conf`:
```
* soft nofile 1048576
* hard nofile 1048576
```
Và trong file `docker-compose.yml`:
```yaml
services:
  webapi-1:
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

---

### 4.2. TCP Listen Backlog & SYN Queue (`somaxconn`)

Khi hàng trăm client kết nối tới NomNa trong một giây (Spike load), các kết nối này phải đi qua quá trình bắt tay TCP 3-way handshake (SYN -> SYN-ACK -> ACK).

Trước khi ứng dụng Kestrel kịp gọi hàm `accept()` để tiếp nhận kết nối, các socket này nằm chờ trong một hàng đợi gọi là **TCP Listen Backlog**.
- **Mặc định của Linux:** `net.core.somaxconn = 128` (hoặc 4096 trên một số distro).
- **Hậu quả:** Nếu có 500 người dùng đồng thời bấm mở app trong 1 giây, hàng đợi 128 này sẽ bị **tràn ngay tức khắc**. Linux Kernel sẽ âm thầm vứt bỏ (drop) các gói tin SYN tiếp theo, khiến client bị lỗi `Connection Timed Out` hoặc `Connection Refused`!

#### Tinh chỉnh trong `/etc/sysctl.conf`:
```ini
# Tăng kích thước hàng đợi kết nối đang chờ Kestrel accept
net.core.somaxconn = 65535

# Tăng độ sâu hàng đợi cho các gói tin TCP SYN
net.ipv4.tcp_max_syn_backlog = 32768
```

---

### 4.3. Ephemeral Port Range & TIME_WAIT Socket Reuse

Khi Nginx đóng vai trò Reverse Proxy nhận traffic từ bên ngoài và chuyển tiếp vào `webapi-1:8080`, Nginx phải mở một kết nối TCP nội bộ mới.

- **Dải cổng tạm thời (Ephemeral Ports):** Mặc định Linux chỉ cho phép khoảng 28.000 cổng (32768 - 60999).
- **Trạng thái TIME_WAIT:** Khi đóng kết nối TCP, cổng đó bị khóa trong 60 giây để đảm bảo không có gói tin đi lạc nào của phiên cũ gây nhiễu phiên mới.
- Dưới tải cao, toàn bộ 28.000 cổng sẽ bị kẹt ở trạng thái `TIME_WAIT`, dẫn đến lỗi Nginx không thể kết nối được tới backend WebAPI: `Cannot assign requested address`.

#### Tinh chỉnh cứu mạng:
```ini
# Mở rộng dải cổng từ 1024 đến 65535 (~64.000 cổng khả dụng)
net.ipv4.ip_local_port_range = 1024 65535

# Cho phép Linux Kernel tái sử dụng các socket TIME_WAIT an toàn
net.ipv4.tcp_tw_reuse = 1

# Giảm thời gian chờ đóng kết nối FIN từ 60 giây xuống 15 giây
net.ipv4.tcp_fin_timeout = 15
```

---

### 4.4. TCP Socket Buffers & `TCP_NODELAY`

Mỗi kết nối TCP socket duy trì 2 bộ đệm trong RAM của Kernel: Bộ đệm đọc (`rmem`) và Bộ đệm ghi (`wmem`).
- Nếu buffer quá lớn: 50.000 kết nối x 512KB buffer = **25 GB RAM** (Sập máy chủ vì thiếu RAM!).
- Với ứng dụng Chat Realtime, mỗi tin nhắn text chỉ nặng vài trăm bytes. Chúng ta cần buffer nhỏ gọn nhưng linh hoạt:

```ini
# Tối ưu bộ đệm TCP (min, default, max)
net.ipv4.tcp_rmem = 4096 87380 4194304
net.ipv4.tcp_wmem = 4096 65536 4194304
```

#### Vô hiệu hóa Nagle's Algorithm (`TCP_NODELAY`):
Thuật toán Nagle được Linux phát minh nhằm gom các gói tin nhỏ lại trước khi gửi đi để tiết kiệm băng thông mạng. Nhưng trong ứng dụng chat, điều này gây ra độ trễ nhân tạo (Artificial Delay) từ **40ms đến 200ms**!
Kestrel và Nginx cần đảm bảo bật `tcp_nodelay on;` để mọi tin nhắn gõ ra được đẩy ngay lập tức qua dây mạng.

---

## 5. Tầng 4: Tư Duy Kiến Trúc & Tối Ưu Trải Nghiệm Người Dùng (UX Mindset)

Một kỹ sư giỏi không chỉ biết tối ưu code chạy nhanh hơn 2ms, mà còn biết **bảo vệ hệ thống không bị sập khi tải vượt quá khả năng chịu đựng** và **đánh lừa tâm lý thị giác để người dùng cảm thấy ứng dụng chạy nhanh như chớp**.

---

### 5.1. Cơ chế Chống Sập: Backpressure, Rate Limiting & Circuit Breaker

Khi một chiếc cầu chỉ chịu được tải trọng 10 tấn, bạn có 2 lựa chọn:
1. Cho 50 tấn xe ùa lên cùng lúc -> Cầu sập, tất cả mọi người cùng rơi xuống sông!
2. Đặt barie chắn ở đầu cầu, chỉ cho đúng 10 tấn xe đi qua; những xe còn lại phải đứng xếp hàng chờ bên ngoài -> Cầu an toàn, lưu thông ổn định.

```
                      CƠ CHẾ CHỐNG SẬP (RATE LIMITING & BACKPRESSURE)
                                              
[10.000 Requests Ùa Vào] ──> [ BARIE: Token Bucket Rate Limiter ]
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
           [ 1.000 Req Hợp Lệ ]             [ 9.000 Req Vượt Ngưỡng ]
                     │                                 │
                     ▼                                 ▼
           [ Kestrel WebAPI & DB ]          [ HTTP 429 Too Many Requests ]
           (Xử lý mượt mà, P95 < 50ms!)     (Trả về ngay trong 0.2ms!)
```

#### Các kỹ thuật triển khai:
1. **Rate Limiting Middleware (.NET 9):**
   - Đặt giới hạn: Mỗi IP chỉ được gọi API `POST /messages` tối đa **5 lần/giây**.
   - Nếu spam quá giới hạn, middleware chặn ngay từ cửa ngõ và trả về HTTP `429 Too Many Requests` kèm header `Retry-After: 2`. Kestrel không tốn 1 chu kỳ CPU nào để chạy MediatR hay query DB!
2. **Circuit Breaker (Ngắt mạch tự động với Polly):**
   - Giả sử tính năng upload ảnh đại diện lên AWS S3 gặp sự cố và bị treo mạng (Timeout 30s).
   - Nếu không có Circuit Breaker, 500 người dùng upload ảnh sẽ chiếm sạch 500 threads của WebAPI, làm sập luôn cả tính năng chat text!
   - Circuit Breaker giám sát: Nếu phát hiện 5 request liên tiếp tới S3 bị lỗi/timeout -> **Ngắt mạch ngay lập tức (Open Circuit)**. Trong 30 giây tiếp theo, mọi request upload ảnh sẽ bị từ chối ngay trong 1ms thay vì phải đợi timeout 30s, bảo toàn 100% tài nguyên cho luồng chat!

---

### 5.2. Asynchronous Decoupling & Outbox Pattern

Khi người dùng gửi 1 tin nhắn văn bản, hệ thống phải làm hàng loạt việc:
1. Kiểm tra quyền hạn người dùng.
2. Lưu tin nhắn vào PostgreSQL.
3. Broadcast tin nhắn qua WebSocket SignalR.
4. Quét chuỗi tìm link URL, gọi HTTP crawl metadata (Link Preview Unfurl).
5. Gửi thông báo Push Notification đến điện thoại của những người offline.
6. Bắn Webhook đến bot tích hợp bên thứ ba.

#### Phản mẫu tồi tệ: Xử lý tuần tự trong Request Thread
Nếu bạn làm cả 6 bước trên bên trong `SendMessageCommandHandler.cs`, thời gian phản hồi của API sẽ là:
$$T = 10\text{ms (DB)} + 5\text{ms (WS)} + 1.500\text{ms (Link Crawl)} + 300\text{ms (Firebase Push)} + 500\text{ms (Webhook)} = 2.315 \text{ ms!}$$

#### Giải pháp chuẩn: Tách rời bất đồng bộ (Asynchronous Decoupling)
Luồng HTTP chỉ làm duy nhất 2 việc quan trọng nhất: **Lưu DB và Broadcast SignalR**, sau đó trả về `200 OK` cho client ngay lập tức (**Độ trễ < 20ms**)!
Tất cả các việc nặng còn lại (Link Preview, Push Notification, Webhook) được đẩy vào một hàng đợi ngầm (**In-memory Channel** hoặc **RabbitMQ / Redis Streams**) để các Background Worker xử lý sau.

---

### 5.3. Multi-Tier Caching & Chống Cache Stampede

```
                   MÔ HÌNH PHÂN TẦNG BỘ NHỚ ĐỆM (MULTI-TIER CACHE)

[Client Request] ──> [L1: In-Memory MemoryCache] (~0.01ms - Cực nhanh, trong RAM cục bộ)
                               │ (Cache Miss)
                               ▼
                     [L2: Redis Distributed Cache] (~1ms - Chia sẻ xuyên suốt cụm server)
                               │ (Cache Miss)
                               ▼
                     [PostgreSQL Database] (~15ms - Đọc đĩa từ)
```

#### Hiểm họa Cache Stampede (Thundering Herd Problem):
Giả sử thông tin phân quyền của một Server chat lớn có 100.000 thành viên được lưu trong Cache với TTL = 10 phút.
Đúng vào thời điểm 10 phút 00 giây: Key cache này hết hạn (Expire).
Ngay tại tích tắc đó, **1.000 requests đồng thời ùa vào** và đều thấy Cache Miss. Cả 1.000 requests cùng lúc lao thẳng xuống PostgreSQL để chạy câu query nặng -> **PostgreSQL chết sập ngay lập tức!**

#### Giải pháp: Khóa phân tán hoặc SingleFlight (SemaphoreSlim)
Khi Cache Miss xảy ra, chỉ cho phép **duy nhất 1 request đầu tiên** được phép query Database để nạp lại Cache. 999 requests còn lại phải đứng chờ request đầu tiên hoàn tất và đọc dữ liệu mới từ Cache:

```csharp
private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory)
{
    if (_cache.TryGetValue(key, out T value)) return value;

    var semaphore = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
    await semaphore.WaitAsync();
    try {
        // Double-check locking
        if (_cache.TryGetValue(key, out value)) return value;
        
        value = await factory();
        _cache.Set(key, value, TimeSpan.FromMinutes(10));
        return value;
    } finally {
        semaphore.Release();
    }
}
```

---

### 5.4. UX Khi Hệ Thống Quá Tải: Optimistic UI & Graceful Degradation

Hiệu năng trong mắt người dùng (Perceived Performance) quan trọng hơn nhiều so với con số miligiây đo trên server.

#### 1. Optimistic UI (Giao diện Lạc quan):
Tại sao khi bạn chat trên Discord hay Messenger, bạn bấm "Gửi" là tin nhắn bay ngay lên khung chat tức thì mà không hề có độ trễ?
- **Bí mật:** Ứng dụng Frontend **không hề đợi Server trả về 200 OK** mới hiển thị tin nhắn!
- **Cơ chế triển khai:**
  1. Khi người dùng bấm Enter: React Client sinh ra một `tempId` (UUID v4), nhét ngay tin nhắn vào Zustand store kèm trạng thái `status: 'sending'`. Tin nhắn xuất hiện trên màn hình trong **0ms**!
  2. Background ngầm gửi HTTP `POST /messages` lên backend kèm `clientMessageId = tempId`.
  3. Khi server trả về thành công: Client cập nhật `status: 'sent'` và thay `tempId` bằng `id` thật của DB.
  4. Nếu rớt mạng hoặc server quá tải sau 5 giây: Client đổi `status: 'failed'` và hiển thị dấu chấm than màu đỏ kèm nút **"Bấm để gửi lại"**.

```
TRUYỀN THỐNG (Người dùng cảm thấy chậm chạp):
User Bấm Gửi ──[ Chờ Server nghĩ 300ms... ]──> Tin nhắn mới hiện lên màn hình

OPTIMISTIC UI (Người dùng cảm thấy nhanh như chớp):
User Bấm Gửi ──> HIỆN NGAY LẬP TỨC (0ms)! ──> (Ngầm gửi server ở hậu cảnh)
```

#### 2. Graceful Degradation (Suy thoái có kiểm soát):
Khi hệ thống phát hiện CPU vượt ngưỡng **85%** hoặc latency P95 tăng vọt:
Thay vì để toàn bộ hệ thống sập và người dùng không thể làm gì, hãy **chủ động tắt bớt các tính năng thứ yếu** để dồn 100% tài nguyên bảo vệ tính năng cốt lõi:

| Mức Độ Tải | Trạng Thái Hệ Thống | Hành Động Suy Thoái Có Kiểm Soát |
| :--- | :--- | :--- |
| **Bình thường (CPU < 60%)** | Xanh (Healthy) | Hoạt động 100% tính năng: Chat text, voice, typing indicator, link preview, cập nhật presence online mỗi 3s. |
| **Tải cao (CPU 60% - 85%)** | Vàng (Degraded) | - Tạm ngừng tính năng Link Preview crawler.<br>- Giảm tần suất cập nhật Presence online từ 3s xuống 30s. |
| **Quá tải nghiêm trọng (CPU > 85%)** | Đỏ (Critical) | - **Tắt hoàn toàn Typing Indicator** ("Người dùng đang gõ...").<br>- Tắt broadcast Presence.<br>- **Dành toàn bộ CPU còn lại để phục vụ gửi và nhận tin nhắn văn bản!** |

> **Lời kết:** Một hệ sinh thái công nghệ đỉnh cao là sự kết hợp hài hòa giữa: Một runtime tối ưu đến từng byte bộ nhớ (.NET 9), một cơ sở dữ liệu được tổ chức index khoa học (PostgreSQL), một hệ điều hành được mở rộng giới hạn (Linux Kernel), và một tư duy kiến trúc luôn lấy trải nghiệm con người làm trung tâm.
