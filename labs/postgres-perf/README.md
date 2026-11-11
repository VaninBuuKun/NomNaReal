# 🧪 NomNa — PostgreSQL Performance Playground (Sổ Tay Thực Hành)

Môi trường này được thiết kế để bạn tự tay "soi" từng byte dữ liệu và từng phép toán mà PostgreSQL thực hiện khi bảng có **từ 1.000.000 đến 10.000.000+ dòng**.

---

## 🚀 1. Khởi Động Lab & Nạp Dữ Liệu

Container Postgres Lab độc lập đang chạy trên Port **`5436`** (Container name: `nomna_postgres_lab`).

### Cách 1: Nạp dữ liệu qua lệnh shell (Khuyên dùng - Zero Dependency!)
Không cần cài Python, không cần pip:
```bash
# Nạp 1.000.000 tin nhắn (Mất đúng ~16 giây!):
./labs/postgres-perf/seed.sh 1000000

# Hoặc muốn nạp thêm 2.000.000 tin nhắn nữa:
./labs/postgres-perf/seed.sh 2000000
```
> 💡 **Tính năng Incremental:** Mỗi lần bạn chạy lại lệnh trên, nó sẽ tự động nhận diện mốc thời gian cũ và **cộng dồn thêm data mới** (thành 2M, 3M, 5M, 10M...) mà không bao giờ bị trùng lặp khóa chính hay lỗi timeline!

### Cách 2: Mở terminal psql để bắt đầu query ngay lập tức
```bash
./labs/postgres-perf/connect-lab.sh
```

---

## 🎯 2. Các Bài Thực Hành Mẫu (Hands-On Labs)

> [!IMPORTANT]
> Luôn sử dụng cú pháp đầy đủ: `EXPLAIN (ANALYZE, BUFFERS)` để xem chi tiết:
> - **Execution Time:** Thời gian thực thi thực tế (ms).
> - **Buffers shared hit:** Số trang 8KB đọc từ RAM (Cache).
> - **Buffers shared read:** Số trang 8KB phải đọc từ ổ cứng (Disk I/O).

---

### 🧪 Bài Lab 1: Phân Trang Lấy 50 Tin Nhắn Mới Nhất (Keyset Pagination)

Trong kênh `#general-lounge` (`ChannelId = '01a16f00-d847-7434-8f3c-7c21edb3ecf9'`):

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "Id", "SenderId", "Content", "CreatedAt"
FROM messages
WHERE "ChannelId" = '01a16f00-d847-7434-8f3c-7c21edb3ecf9'
ORDER BY "CreatedAt" DESC
LIMIT 50;
```

#### 🔍 Những gì bạn sẽ quan sát được khi CHƯA có Index:
- **`Seq Scan on messages`**: Postgres phải đọc hết toàn bộ 1 triệu dòng từ đĩa vào RAM!
- **`Sort Method: top-N heapsort`**: Postgres phải sắp xếp trên bộ nhớ RAM `work_mem`.
- **`Execution Time`**: Mất từ **150ms – 400ms**!

#### 🛠️ Tự tay chữa lành: Tạo Composite Index B-Tree
```sql
CREATE INDEX idx_messages_channel_created ON messages ("ChannelId", "CreatedAt" DESC);
```
Sau đó chạy lại câu lệnh `EXPLAIN (ANALYZE, BUFFERS)` ở trên:
- **Kỳ diệu:** `Seq Scan` biến mất, thay bằng **`Index Scan`**!
- `Execution Time` tụt thẳng từ **~300ms xuống còn 0.2ms – 0.5ms** (nhanh gấp gần 1.000 lần)!
- `Buffers shared hit`: Chỉ tốn đúng vài blocks 8KB thay vì đọc cả bảng!

---

### 🧪 Bài Lab 2: Nỗi Đau Tìm Kiếm Chuỗi `LIKE '%keyword%'`

Thử tìm tất cả tin nhắn có chứa từ `"lỗi"`:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)
FROM messages
WHERE "Content" LIKE '%lỗi%';
```

#### 🔍 Quan sát:
- Kể cả bạn đã tạo B-Tree Index ở Lab 1, Postgres **vẫn buộc phải chạy `Seq Scan`** vì ký tự `%` đứng ở đầu chuỗi khiến B-Tree vô dụng!
- Đếm số `shared hit / read` buffers khổng lồ và CPU container nhảy lên 100%.

#### 🛠️ Tự tay tối ưu: Trigram GIN Index
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_messages_content_trgm ON messages USING GIN ("Content" gin_trgm_ops);
```
Chạy lại câu lệnh search trên và quan sát kế hoạch chuyển sang **`Bitmap Index Scan on idx_messages_content_trgm`**!

---

### 🧪 Bài Lab 3: Thống Kê & Aggregation (GROUP BY)

Đếm xem mỗi user đã gửi bao nhiêu tin nhắn:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "SenderId", COUNT(*) as total_msgs
FROM messages
GROUP BY "SenderId"
ORDER BY total_msgs DESC;
```

#### 🔍 Quan sát:
- Soi thuật toán: `HashAggregate` vs `GroupAggregate`.
- Kiểm tra xem bộ nhớ `work_mem` của Postgres có đủ chứa Hash Table không hay bị tràn ra đĩa (`Disk Spilling`).

---

### 🧪 Bài Lab 4: Kiểm Tra Dung Lượng & Sức Chứa Của Bảng

```sql
-- 1. Xem dung lượng thực tế của bảng messages trên đĩa:
SELECT pg_size_pretty(pg_total_relation_size('messages'));

-- 2. Xem dung lượng riêng của từng Index:
SELECT c.relname AS index_name,
       pg_size_pretty(pg_relation_size(c.oid)) AS index_size
FROM pg_class c
JOIN pg_index i ON i.indexrelid = c.oid
WHERE i.indrelid = 'messages'::regclass;

-- 3. Xem ước tính số dòng trong PostgreSQL Statistics Catalog:
SELECT reltuples::bigint AS estimated_row_count FROM pg_class WHERE relname = 'messages';
```

---

### 🧪 Bài Lab 5: Đối Đầu Trực Tiếp `UUIDv4` (Bảng `messages`) vs `UUIDv7` (Bảng `ms2`) & Vũ Khí Bí Mật BRIN Index

#### Bước 1: Nạp dữ liệu vào bảng `ms2` (Sử dụng Time-Ordered `UUIDv7`)
```bash
# Mỗi lần chạy sẽ cộng dồn thêm 1.000.000 tin nhắn dùng UUIDv7 vào bảng ms2:
./labs/postgres-perf/seed-ms2.sh 1000000
```

#### Bước 2: Soi độ phân mảnh (Fragmentation / Leaf Density) giữa `UUIDv4` và `UUIDv7`
```sql
SELECT 
    'messages_pkey (UUIDv4)' AS index_type,
    (SELECT COUNT(*) FROM messages) AS rows,
    pg_size_pretty(pg_relation_size('messages_pkey')) AS total_size,
    round(avg_leaf_density::numeric, 2) AS leaf_fill_percent,
    round((100 - avg_leaf_density)::numeric, 2) AS wasted_space_percent,
    leaf_pages
FROM pgstatindex('messages_pkey')
UNION ALL
SELECT 
    'ms2_pkey (UUIDv7)' AS index_type,
    (SELECT COUNT(*) FROM ms2) AS rows,
    pg_size_pretty(pg_relation_size('ms2_pkey')) AS total_size,
    round(avg_leaf_density::numeric, 2) AS leaf_fill_percent,
    round((100 - avg_leaf_density)::numeric, 2) AS wasted_space_percent,
    leaf_pages
FROM pgstatindex('ms2_pkey');
```
- **`UUIDv4` (`messages_pkey`)**: Tỷ lệ lấp đầy (`leaf_fill_percent`) chỉ đạt **`~68%`**, lãng phí **`~31%`** dung lượng do hiện tượng tách trang ngẫu nhiên (Page Splits)!
- **`UUIDv7` (`ms2_pkey`)**: Tỷ lệ lấp đầy đạt trần tối đa **`90.03%`**, tiết kiệm gần **25% RAM & Đĩa**!

#### Bước 3: Thử nghiệm BRIN Index (Nhỏ hơn B-Tree 1.000 lần!) trên bảng `ms2`
Vì bảng `ms2` có cả `Id (UUIDv7)` và `CreatedAt` tăng dần tuần tự theo đúng thứ tự ghi vật lý trên đĩa, bạn có thể tạo **BRIN Index**:
```sql
CREATE INDEX idx_ms2_created_brin ON ms2 USING BRIN ("CreatedAt");

-- Kiểm tra kích thước của BRIN Index (chỉ ~24 KB - 48 KB cho cả triệu dòng!):
SELECT pg_size_pretty(pg_relation_size('idx_ms2_created_brin'));
```

---

## 🧹 Dọn Dẹp Khi Xong Lab
```bash
docker compose -f labs/postgres-perf/docker-compose.lab.yml down -v
```
*(Cờ `-v` sẽ xóa sạch dữ liệu lab để bạn có thể bắt đầu lại từ đầu bất cứ lúc nào).*

