# 📊 Thực Chiến k6 Trong Dự Án NomNa & Cẩm Nang Đọc - Giải Mã Các Chỉ Số

> **Mục tiêu tài liệu:** Hướng dẫn chi tiết cách vận hành k6 trong dự án NomNa, hiểu tường tận kiến trúc k6, cách chạy các kịch bản test hiện có, giải mã từng thông số trong file kết quả JSON, và phân tích bài học đắt giá từ dữ liệu đo tải thực tế `baseline_http_1792863834.json`.

---

## Mục Lục
1. [k6 Là Gì? Vì Sao k6 Là Chuẩn Mực Mới Cho Chat Realtime?](#1-k6-là-gì-vì-sao-k6-là-chuẩn-mực-mới-cho-chat-realtime)
2. [k6 Đã Giúp Ích Gì Cho Dự Án NomNa?](#2-k6-đã-giúp-ích-gì-cho-dự-án-nomna)
3. [Cấu Trúc Bộ Công Cụ Benchmark Trong NomNa](#3-cấu-trúc-bộ-công-cụ-benchmark-trong-nomna)
4. [Hướng Dẫn Từng Bước Cách Chạy k6 Trong Project](#4-hướng-dẫn-từng-bước-cách-chạy-k6-trong-project)
   - [4.1. Chạy kịch bản HTTP REST API](#41-chạy-kịch-bản-http-rest-api)
   - [4.2. Chạy kịch bản SignalR WebSocket Realtime](#42-chạy-kịch-bản-signalr-websocket-realtime)
   - [4.3. Dọn dẹp môi trường sau khi test](#43-dọn-dẹp-môi-trường-sau-khi-test)
5. [Từ Điển Giải Mã Mọi Thông Số Trong Báo Cáo k6](#5-từ-điển-giải-mã-mọi-thông-số-trong-báo-cáo-k6)
   - [5.1. Nhóm chỉ số mạng & HTTP (Network & Protocol Metrics)](#51-nhóm-chỉ-số-mạng--http-network--protocol-metrics)
   - [5.2. Nhóm chỉ số thực thi (Execution Metrics)](#52-nhóm-chỉ-số-thực-thi-execution-metrics)
   - [5.3. Nhóm chỉ số tùy biến riêng của NomNa (Custom Business Metrics)](#53-nhóm-chỉ-số-tùy-biến-riêng-của-nomna-custom-business-metrics)
6. [Mổ Xẻ Thực Chiến: Case Study `baseline_http_1792863834.json`](#6-mổ-xẻ-thực-chiến-case-study-baseline_http_1792863834json)
   - [6.1. Dữ liệu đo đạc thực tế](#61-dữ-liệu-đo-đạc-thực-tế)
   - [6.2. Tại sao Latency vọt lên 31.3 giây? (Cú lừa Login trong vòng lặp)](#62-tại-sao-latency-vọt-lên-313-giây-cú-lừa-login-trong-vòng-lặp)
   - [6.3. Giải pháp khắc phục kịch bản k6](#63-giải-pháp-khắc-phục-kịch-bản-k6)

---

## 1. k6 Là Gì? Vì Sao k6 Là Chuẩn Mực Mới Cho Chat Realtime?

**Grafana k6** là công cụ kiểm thử tải mã nguồn mở hiện đại nhất hiện nay dành cho Developer và SRE. k6 được viết bằng ngôn ngữ **Go (Golang)** và cho phép lập trình viên viết kịch bản kiểm thử bằng **JavaScript (ES6)**.

### So sánh k6 với các công cụ truyền thống (JMeter, Locust):

| Tiêu Chí | Apache JMeter | Locust (Python) | Grafana k6 (Go) |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ kịch bản** | GUI kéo thả XML phức tạp | Python | JavaScript (ES6 tiêu chuẩn) |
| **Mô hình luồng (Thread Model)** | 1 Virtual User = 1 OS Thread (Nặng nề) | Python Greenlets (Bị giới hạn bởi GIL) | **Go Goroutines** (Cực nhẹ, non-blocking I/O) |
| **Bộ nhớ (RAM footprint) cho 10.000 VUs** | ~10 GB - 16 GB (Dễ tràn JVM Heap) | ~2 GB - 4 GB (Phải cluster nhiều worker) | **~500 MB - 1 GB** (Chạy mượt trên 1 máy đơn) |
| **Hỗ trợ WebSocket / SignalR** | Plugin cồng kềnh, khó kiểm soát frame | Phải cài thêm thư viện gevent-websocket | **Native WebSocket module (`k6/ws`)**, cực kỳ mượt |
| **Tích hợp CI/CD & Code-as-Test** | Khó nhúng vào Git, conflict file JMX | Tốt | **Hoàn hảo** (chạy docker nhẹ, exit code tự fail build) |

```
MÔ HÌNH BỘ NHỚ: JMeter vs k6

JMeter:   [VU 1 (OS Thread: 1MB)] [VU 2 (OS Thread: 1MB)] ... 10.000 VUs = ~10.000 MB RAM
k6:       [VU 1 (Goroutine: ~2KB)] [VU 2 (Goroutine: ~2KB)] ... 10.000 VUs = ~250 MB RAM
```

Với ứng dụng như **NomNa**, nơi mà hệ sinh thái vừa có **HTTP REST API** (đăng nhập, tải lịch sử tin nhắn, đổi avatar) vừa có **WebSocket kết nối dài hạn (SignalR)**, k6 là công cụ lý tưởng duy nhất có thể giả lập hàng nghìn client giữ kết nối WebSocket liên tục trong khi vẫn gửi API HTTP song song.

---

## 2. k6 Đã Giúp Ích Gì Cho Dự Án NomNa?

Trước khi đưa k6 vào dự án, NomNa chỉ có 41 unit tests trong xUnit. Các bài test này chỉ chứng minh logic code chạy đúng với 1 request đơn lẻ.

Khi tích hợp k6 vào `scripts/k6/`, k6 đã mang lại 4 giá trị mang tính bước ngoặt:

1. **Thiết lập môi trường Benchmark cô lập (Deterministic Isolated Environment):**
   - Không đo bừa trên máy dev (nơi CPU/RAM bị chi phối bởi trình duyệt, IDE, Docker linh tinh).
   - `docker-compose.bench.yml` cố định cứng: WebAPI = 1 vCPU / 512MB RAM, PostgreSQL = 1 vCPU / 512MB RAM. Mọi kết quả đo đạc đều có thể tái lập 100% trên bất kỳ máy nào.
2. **Khám phá ngay điểm nghẽn CPU ở mức 300 VUs:**
   - Khi chạy kịch bản `01_http_message_load.js`, k6 đã đẩy CPU của node WebAPI lên **~102%** trong khi PostgreSQL chỉ tốn **2.8% CPU**.
   - Điều này cung cấp bằng chứng thép: **Hệ thống hiện tại không nghẽn ở Database, mà nghẽn ở xử lý tính toán trong WebAPI!**
3. **Phát hiện cạm bẫy thiết kế kịch bản test (Anti-pattern discovery):**
   - k6 giúp nhận ra rằng việc gọi `POST /api/auth/login` trong mỗi lần lặp của VU đã ép thuật toán băm mật khẩu PBKDF2 của ASP.NET Core Identity chạy 10.000 vòng HMAC-SHA256 liên tục, thiêu rụi toàn bộ 1 vCPU của server.
4. **Kiểm thử giao thức SignalR thô ở tầng byte (Low-level Frame Testing):**
   - File `02_signalr_realtime.js` chứng minh khả năng bắt tay SignalR Protocol v1, gửi nhận bản tin JSON phân tách bằng ký tự Record Separator `0x1E` và tính toán được độ trễ lan truyền tin nhắn (Fanout Latency).

---

## 3. Cấu Trúc Bộ Công Cụ Benchmark Trong NomNa

Bộ công cụ k6 của NomNa được tổ chức độc lập trong thư mục `scripts/k6/`:

```
scripts/k6/
├── docker-compose.bench.yml   # Khởi tạo cụm môi trường đo tải độc lập (Postgres, WebAPI, Nginx, k6)
├── nginx.conf                 # Cấu hình Reverse Proxy & WebSocket Upstream cho benchmark
├── run-bench.sh               # Script tự động hóa toàn bộ quy trình: Dựng cụm -> Chờ Healthy -> Chạy k6
├── scenarios/
│   ├── 01_http_message_load.js   # Kịch bản tải HTTP: Login -> Lấy 25 tin nhắn -> Gửi tin nhắn mới
│   └── 02_signalr_realtime.js    # Kịch bản Realtime: WebSocket Connect -> Handshake 0x1E -> JoinChannel -> Đo Ping/Pong & Latency
└── results/
    ├── .gitkeep
    └── baseline_http_1792863834.json  # File kết quả JSON thô được k6 xuất tự động
```

### Kiến trúc mạng trong Docker Compose Bench:
```
                      nomna_bench_net (Bridge Network)
 ┌───────────────────────────────────────────────────────────────────────┐
 │                                                                       │
 │   ┌──────────────┐          ┌──────────────┐      ┌───────────────┐   │
 │   │  bench_k6    │ ───────> │ bench_nginx  │ ───> │ bench_webapi  │   │
 │   │ (k6 Client)  │          │ (Port 5050)  │      │  (1 vCPU/512M)│   │
 │   └──────────────┘          └──────────────┘      └───────┬───────┘   │
 │                                                           │           │
 │                                                           ▼           │
 │                                                   ┌───────────────┐   │
 │                                                   │bench_postgres │   │
 │                                                   │  (1 vCPU/512M)│   │
 │                                                   └───────────────┘   │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## 4. Hướng Dẫn Từng Bước Cách Chạy k6 Trong Project

Toàn bộ quy trình đã được đóng gói tự động vào shell script `run-bench.sh`. Bạn không cần cài đặt Go hay k6 trên máy host — k6 chạy hoàn toàn trong Docker.

### 4.1. Chạy kịch bản HTTP REST API

Kịch bản này mô phỏng người dùng lướt kênh chat: đọc lịch sử 25 tin nhắn gần nhất và gõ gửi tin nhắn mới.

Mở terminal tại thư mục gốc của dự án (`/home/vanmuzic/Projects/NomNaReal`):

```bash
# Cấp quyền thực thi nếu chưa có
chmod +x scripts/k6/run-bench.sh

# Chạy kịch bản HTTP
./scripts/k6/run-bench.sh http
```

#### Quá trình script tự động thực hiện:
1. Đọc file `docker-compose.bench.yml`, khởi động `bench_postgres`, `bench_webapi_1`, và `bench_nginx`.
2. Vòng lặp `until curl -s http://localhost:5050/health` sẽ thăm dò endpoint `/health` của WebAPI qua Nginx mỗi 2 giây cho đến khi cụm sẵn sàng (Status 200).
3. Khởi tạo container `bench_k6`, nạp kịch bản `scenarios/01_http_message_load.js`.
4. k6 bắt đầu thực thi theo 4 giai đoạn cấu hình (Stages):
   - **0s -> 15s:** Tăng dần từ 0 lên 50 VUs (Warm-up).
   - **15s -> 45s:** Tăng lên 150 VUs (Steady load).
   - **45s -> 65s:** Đẩy đỉnh lên 300 VUs (Peak load).
   - **65s -> 75s:** Giảm dần về 0 VUs (Ramp down).
5. Khi kết thúc, toàn bộ chỉ số tóm tắt được xuất thành file JSON trong `scripts/k6/results/baseline_http_<timestamp>.json`.

---

### 4.2. Chạy kịch bản SignalR WebSocket Realtime

Kịch bản này mô phỏng hàng trăm client mở kết nối WebSocket đồng thời vào Hub `/hubs/chat`, gửi bắt tay giao thức SignalR, tham gia nhóm kênh (Channel Group), và đo lường thời gian nhận tin nhắn broadcast:

```bash
# Chạy kịch bản SignalR WebSocket
./scripts/k6/run-bench.sh ws
# hoặc
./scripts/k6/run-bench.sh signalr
```

#### Các ngưỡng đánh giá (Thresholds) trong kịch bản WebSocket:
- `nomna_signalr_connection_errors: ['count<20']`: Toàn bài test không được có quá 20 kết nối bị rớt/lỗi.
- `nomna_signalr_message_latency_ms: ['p(95)<250']`: 95% tin nhắn realtime phát tán đến client phải dưới 250ms.

---

### 4.3. Dọn dẹp môi trường sau khi test

Sau khi chạy xong, các container benchmark vẫn có thể đang chạy ngầm để phục vụ kiểm tra log. Để tắt và giải phóng toàn bộ tài nguyên:

```bash
docker compose -f scripts/k6/docker-compose.bench.yml down -v
```
*(Cờ `-v` giúp xóa sạch volume database tạm của benchmark, đảm bảo lần chạy sau luôn có dữ liệu seed sạch sẽ).*

---

## 5. Từ Điển Giải Mã Mọi Thông Số Trong Báo Cáo k6

Khi k6 chạy xong, nó sẽ in ra một bảng tóm tắt trên terminal và lưu vào file JSON. Dưới đây là giải nghĩa chi tiết từng chỉ số:

```
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: /scripts/01_http_message_load.js
     output: -

  scenarios: (100.00%) 1 scenario, 300 max VUs, 1m15s max duration (incl. graceful stop):
           * default: Up to 300 looping VUs for 1m15s over 4 stages (gracefulRampDown: 30s)
```

---

### 5.1. Nhóm chỉ số mạng & HTTP (Network & Protocol Metrics)

| Tên Chỉ Số | Đơn Vị | Ý Nghĩa Kỹ Thuật & Cách Giải Thích | Dấu Hiệu Bất Thường |
| :--- | :---: | :--- | :--- |
| **`http_req_duration`** | ms | **Tổng thời gian hoàn tất 1 HTTP Request** (từ byte đầu gửi đi đến byte cuối nhận về). | Nếu `p(95) > 300ms`, hệ thống không đạt SLA phản hồi nhanh. |
| **`http_req_waiting`** | ms | **Time To First Byte (TTFB)**. Thời gian máy chủ xử lý logic C#, chạy MediatR pipeline, query EF Core và nhả ra byte đầu tiên. | **Nếu chỉ số này chiếm 90% của duration -> Điểm nghẽn nằm ở Server code hoặc Database!** |
| **`http_req_connecting`** | ms | Thời gian thiết lập kết nối TCP socket 3-way handshake giữa k6 và Nginx. | Nếu tăng đột biến (> 100ms) -> Hàng đợi TCP SYN backlog (`somaxconn`) bị tràn. |
| **`http_req_tls_handshaking`**| ms | Thời gian bắt tay mã hóa TLS/SSL. Trong môi trường nội bộ benchmark (HTTP) thì giá trị này bằng 0. | Nếu chạy qua HTTPS mà chỉ số này cao -> CPU bị quá tải do mã hóa RSA/ECDSA. |
| **`http_req_blocked`** | ms | Thời gian request phải chờ trong hàng đợi của k6 client trước khi có TCP connection socket rảnh để gửi. | Nếu cao -> k6 client bị giới hạn số lượng kết nối tối đa trên 1 host. |
| **`http_req_sending`** | ms | Thời gian đẩy dữ liệu từ client lên mạng (Upload data). | Nếu cao -> Payload gửi đi quá lớn hoặc băng thông upload bị bóp. |
| **`http_req_receiving`** | ms | Thời gian tải body response từ mạng về client (Download data). | Nếu cao -> Server trả về JSON quá khổng lồ, thiếu phân trang. |
| **`http_req_failed`** | % | Tỷ lệ request trả về mã lỗi HTTP không mong muốn (4xx, 5xx). | Tiêu chuẩn production phải là **0.00%**. |
| **`http_reqs`** | req/s | **Throughput thực tế (RPS)** mà hệ thống xử lý được trong suốt bài test. | Nếu VUs tăng mà RPS chững lại hoặc tụt -> Hệ thống đã chạm trần công suất. |

---

### 5.2. Nhóm chỉ số thực thi (Execution Metrics)

| Tên Chỉ Số | Ý Nghĩa Kỹ Thuật |
| :--- | :--- |
| **`vus`** | Số lượng Virtual Users đang thực sự chạy tác vụ tại thời điểm cuối cùng của bài test. |
| **`vus_max`** | Số lượng Virtual Users tối đa được cấp phát trong bộ nhớ (ví dụ: 300 VUs). |
| **`iterations`** | Tổng số vòng lặp hàm `default()` đã thực hiện thành công bởi tất cả các VUs. |
| **`iteration_duration`** | Thời gian hoàn thành 1 vòng lặp trọn vẹn (bao gồm thời gian gọi tất cả các API trong hàm `default` cộng với các lệnh `sleep`). |
| **`data_sent`** | Tổng dung lượng dữ liệu (bytes) k6 đã bắn lên server. |
| **`data_received`** | Tổng dung lượng dữ liệu (bytes) server đã trả về cho k6. |
| **`checks`** | Tỷ lệ phần trăm các câu lệnh kiểm tra logic (`check(res, {...})`) thỏa mãn điều kiện (Pass). |

---

### 5.3. Nhóm chỉ số tùy biến riêng của NomNa (Custom Business Metrics)

Trong các kịch bản của NomNa, kỹ sư đã định nghĩa các custom metric để đo lường chính xác từng nghiệp vụ chat:

```javascript
// Trích xuất từ scenarios/01_http_message_load.js
const messageReadTrend = new Trend('nomna_get_messages_duration_ms');
const messageSendTrend = new Trend('nomna_send_message_duration_ms');
const successfulOps = new Counter('nomna_successful_ops');
const failureRate = new Rate('nomna_failure_rate');
```

- **`nomna_get_messages_duration_ms`:** Đo riêng độ trễ của API tải 25 tin nhắn cũ (`GET /api/channels/{id}/messages?limit=25`). Giúp tách biệt hiệu năng đọc (Read path) ra khỏi hiệu năng ghi.
- **`nomna_send_message_duration_ms`:** Đo riêng độ trễ của API gửi tin nhắn mới (`POST /api/channels/{id}/messages`). Giúp đo lường chi phí ghi vào DB, kiểm tra quyền hạn và kích hoạt MediatR.
- **`nomna_signalr_message_latency_ms`:** Độ trễ từ thời điểm tin nhắn được tạo ra (`createdAt`) đến thời điểm client WebSocket khác nhận được frame qua SignalR Hub.

---

## 6. Mổ Xẻ Thực Chiến: Case Study `baseline_http_1792863834.json`

Trong thư mục `scripts/k6/results/` của dự án có lưu trữ một file kết quả thực tế: `baseline_http_1792863834.json`. Đây là tài liệu vô giá phản ánh chính xác tình trạng hệ thống NomNa dưới áp lực 300 VUs.

### 6.1. Dữ liệu đo đạc thực tế

Hãy cùng nhìn vào các con số được trích xuất từ file kết quả này:

```json
"metrics": {
    "http_req_duration": {
        "min": 3.78,
        "med": 3049.38,
        "avg": 8617.44,
        "p(90)": 24253.03,
        "p(95)": 31324.91,
        "max": 37224.91
    },
    "nomna_send_message_duration_ms": {
        "min": 4.0,
        "med": 2599.0,
        "avg": 8337.38,
        "p(90)": 32172.8,
        "p(95)": 33854.85,
        "max": 34739.0
    },
    "checks": {
        "passes": 1347,
        "fails": 47,
        "value": 0.9662
    },
    "http_req_failed": {
        "passes": 47,
        "fails": 1349,
        "value": 0.0336
    }
}
```

Và kết quả kiểm tra từng API:
- `Setup Login Successful (200)`: 1/1 Pass (100%)
- `Login 200`: 464 Passes / 1 Fail
- `GET /messages status 200`: 464 Passes / 0 Fail (100% OK!)
- `POST /messages status 200`: **418 Passes / 46 Fails (Thất bại 46 lần!)**

---

### 6.2. Tại sao Latency vọt lên 31.3 giây? (Cú lừa Login trong vòng lặp)

Hãy nhìn vào con số P95: **`p(95) = 31.324 ms` (Hơn 31 giây!)**.
Tại sao một API chat đơn giản lại mất tới 31 giây để xử lý? Có phải do PostgreSQL bị treo không?

**Câu trả lời là: KHÔNG!** Theo số liệu giám sát của Docker:
- PostgreSQL CPU chỉ dùng **2.8%**. RAM chỉ tốn **80 MiB**.
- WebAPI CPU chạm trần: **102% (Bão hòa hoàn toàn 1 vCPU được cấp phát)**.

#### Thủ phạm nằm ở đâu?
Hãy mở file `scripts/k6/scenarios/01_http_message_load.js` dòng 73-88:

```javascript
export default function (data) {
  // 1. Authenticate virtual user TRONG MỖI VÒNG LẶP!
  const userIndex = (__VU % 3) + 1;
  const userEmail = userIndex === 1 ? 'alex@nomna.local' : ...;

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ emailOrUsername: userEmail, password: 'Password123!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  ...
}
```

Mỗi khi 1 VU thực hiện 1 thao tác đọc/ghi tin nhắn, nó lại **gọi API Login một lần**.
Bên trong backend .NET (`NomNa.Infrastructure` & ASP.NET Core Identity):
- Khi đăng nhập, Identity gọi `PasswordHasher.VerifyHashedPassword()`.
- Thuật toán bảo mật PBKDF2 mặc định thực hiện **10.000 vòng lặp HMAC-SHA256**.
- Thuật toán băm mật khẩu được thiết kế có chủ đích là **cực kỳ nặng CPU** để chống tấn công bẻ khóa Brute-force!
- Với 300 VUs gửi request liên tục, server WebAPI bị ép phải băm mật khẩu hàng nghìn lần mỗi giây!

```
           300 VUs ĐỒNG THỜI GỬI REQUEST LOGIN
                          │
                          ▼
             [ Kestrel ThreadPool .NET 9 ]
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
 [Thread 1: PBKDF2]                 [Thread 2: PBKDF2]
 (HMAC-SHA256 x 10.000)             (HMAC-SHA256 x 10.000)
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
            🔥 CPU 100% TOÀN BỘ 1 vCPU 🔥
                          │
   Tất cả request POST /messages và GET /messages
   bị nghẽn hàng đợi (Request Queue) suốt 31 giây!
```

Hậu quả: 1 vCPU bị thiêu đốt 100% chỉ để băm mật khẩu. Các luồng xử lý gửi tin nhắn (`POST /messages`) không được cấp phát CPU, bị ngâm trong hàng đợi Kestrel cho đến khi chạm ngưỡng timeout của HTTP client (`~35 giây`) và bị Nginx ngắt kết nối -> **Dẫn đến 46 lỗi thất bại!**

---

### 6.3. Giải pháp khắc phục kịch bản k6

Trong thực tế, **người dùng chỉ đăng nhập 1 lần duy nhất** khi mở app, sau đó lưu JWT Token vào bộ nhớ để gửi và đọc tin nhắn trong nhiều giờ!

#### Nguyên tắc sửa đổi kịch bản kiểm thử:
1. Chuyển toàn bộ logic đăng nhập vào hàm `setup()` hoặc tiền xử lý trước khi test.
2. Tạo trước một mảng Token Pool (ví dụ: 10 tài khoản test với 10 JWT Tokens).
3. Trong hàm `default(data)`, các VUs chỉ việc lấy Token có sẵn và gắn vào HTTP Header `Authorization: Bearer <token>` để đo thuần túy hiệu năng của Chat.

```javascript
// Kịch bản tối ưu chuẩn kỹ nghệ:
export function setup() {
  console.log("Đăng nhập trước để lấy Token Pool...");
  const tokens = [];
  const testUsers = ['alex@nomna.local', 'minh@nomna.local', 'van@nomna.local'];
  
  for (const email of testUsers) {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      emailOrUsername: email,
      password: 'Password123!'
    }), { headers: { 'Content-Type': 'application/json' } });
    
    tokens.push(res.json().token); // Lưu token sẵn
  }
  return { tokens, channelId: '...' };
}

export default function (data) {
  // Lấy token sẵn có trong memory, KHÔNG gọi API login nữa!
  const token = data.tokens[__VU % data.tokens.length];
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Bây giờ 100% CPU của WebAPI sẽ phục vụ cho việc đo đọc và ghi tin nhắn!
  http.get(`${BASE_URL}/api/channels/${data.channelId}/messages?limit=25`, { headers: authHeaders });
  http.post(`${BASE_URL}/api/channels/${data.channelId}/messages`, JSON.stringify({ content: "Hello" }), { headers: authHeaders });
}
```

> **Kết luận:** Đây chính là giá trị thực chiến lớn nhất của Performance Testing. Nếu không đo đạc và mổ xẻ JSON kết quả, lập trình viên sẽ tưởng nhầm rằng database hoặc ORM EF Core bị chậm, và đi tối ưu sai chỗ!
