# 📨 Chuyên Khảo Toàn Diện Về Hệ Thống Tin Nhắn (Message): Kiến Trúc, Câu Lệnh Truy Vấn, Nợ Kỹ Thuật & Kịch Bản Kiểm Thử Thực Chiến

> **Mục tiêu tài liệu:** Bóc tách 100% "nội tạng" của tính năng Message trong mã nguồn dự án **NomNa** (.NET 9, PostgreSQL 16, SignalR, React 19). Phân tích chi tiết đường đi của dữ liệu, các phụ thuộc, các câu lệnh SQL thực tế sinh ra bởi EF Core, chỉ rõ các điểm nghẽn tiềm ẩn, và thiết lập lộ trình kiểm thử k6 chuyên sâu dành cho **"Tuần 1: Chinh phục Core Messages"**.
> **Vị trí tài liệu:** `docs/features/message-system-deep-dive-and-testing-plan.md`

---

## Mục Lục
1. [Tổng Quan Tính Năng Message Trong NomNa](#1-tổng-quan-tính-năng-message-trong-nomna)
2. [Bản Đồ Kiến Trúc Phân Tầng Của Message (Layered Architecture)](#2-bản-đồ-kiến-trúc-phân-tầng-của-message-layered-architecture)
   - [2.1. Domain Layer (Entities & Quan hệ bảng)](#21-domain-layer-entities--quan-hệ-bảng)
   - [2.2. Application Layer (CQRS Commands & Queries)](#22-application-layer-cqrs-commands--queries)
   - [2.3. Infrastructure Layer (EF Core Mapping & Caching)](#23-infrastructure-layer-ef-core-mapping--caching)
   - [2.4. WebAPI & Realtime Layer (Controllers & SignalR ChatHub)](#24-webapi--realtime-layer-controllers--signalr-chathub)
3. [Mổ Xẻ Chi Tiết Các Luồng Xử Lý & Câu Lệnh SQL Thực Tế](#3-mổ-xẻ-chi-tiết-các-luồng-xử-lý--câu-lệnh-sql-thực-tế)
   - [3.1. Luồng Gửi Tin Nhắn (`SendMessageCommand`)](#31-luồng-gửi-tin-nhắn-sendmessagecommand)
   - [3.2. Luồng Đọc Tin Nhắn Phân Trang (`GetMessagesQuery`)](#32-luồng-đọc-tin-nhắn-phân-trang-getmessagesquery)
   - [3.3. Luồng Nhảy Đến Tin Nhắn Ghim / Quanh Tin Nhắn (`GetMessagesAroundQuery`)](#33-luồng-nhảy-đến-tin-nhắn-ghim--quanh-tin-nhắn-getmessagesaroundquery)
   - [3.4. Luồng Thả Cảm Xúc (`ToggleReactionCommand`)](#34-luồng-thả-cảm-xúc-togglereactioncommand)
   - [3.5. Luồng Tìm Kiếm Tin Nhắn (`SearchMessagesQuery`)](#35-luồng-tìm-kiếm-tin-nhắn-searchmessagesquery)
4. [Bảng Đánh Giá Điểm Mạnh & Nợ Kỹ Thuật (Technical Debts)](#4-bảng-đánh-giá-điểm-mạnh--nợ-kỹ-thuật-technical-debts)
5. [Lộ Trình Kiểm Thử Thực Chiến k6 Cho Core Messages (Testing Matrix)](#5-lộ-trình-kiểm-thử-thực-chiến-k6-cho-core-messages-testing-matrix)
   - [Kịch bản 1: Pure Read Throughput (Đo trần đọc phân trang với 100K - 1M tin)](#kịch-bản-1-pure-read-throughput-đo-trần-đọc-phân-trang-với-100k---1m-tin)
   - [Kịch bản 2: Pure Write Concurrency & Lock Contention (Đo trần ghi đồng thời)](#kịch-bản-2-pure-write-concurrency--lock-contention-đo-trần-ghi-đồng-thời)
   - [Kịch bản 3: Realistic Mixed Traffic (75% Đọc, 20% Gửi, 5% Reaction)](#kịch-bản-3-realistic-mixed-traffic-75-đọc-20-gửi-5-reaction)
   - [Kịch bản 4: SignalR Fanout Broadcasting Latency (1 Sender $\rightarrow$ 1.000 Receivers)](#kịch-bản-4-signalr-fanout-broadcasting-latency-1-sender-rightarrow-1000-receivers)
   - [Kịch bản 5: Search Stress Test (Full Table Scan vs GIN Index)](#kịch-bản-5-search-stress-test-full-table-scan-vs-gin-index)
6. [Kế Hoạch Bàn Luận & Tối Ưu Hóa Từng Nấc (Discussion & Action Steps)](#6-kế-hoạch-bàn-luận--tối-ưu-hóa-từng-nấc-discussion--action-steps)

---

## 1. Tổng Quan Tính Năng Message Trong NomNa

Trong NomNa, **Message** là trung tâm của mọi hoạt động giao tiếp. Hệ thống hỗ trợ đầy đủ các tính năng hiện đại tương đương Discord / Slack:
* **Gửi tin nhắn văn bản** (hỗ trợ độ dài lên tới 4.000 ký tự).
* **Đính kèm đa phương tiện (Attachments):** Lưu trữ dạng JSON trong cột `Attachments` (URL, FileName, FileSize, ContentType, Type: image/file).
* **Trích dẫn trả lời (Quote Reply):** Trỏ tới `ReplyToMessageId` và hiển thị quote nhỏ của tin nhắn gốc.
* **Thả cảm xúc Emoji (Reactions):** Nhiều người dùng có thể thả cùng một loại emoji vào 1 tin nhắn.
* **Ghim tin nhắn (Pinned Messages):** Ghim các tin nhắn quan trọng trong kênh vào bảng riêng.
* **Chỉnh sửa & Xóa mềm (Edit & Soft Delete):** Sửa nội dung gắn cờ `IsEdited`, xóa tin nhắn cập nhật timestamp `DeletedAt`.
* **Phân trang Keyset Cursor:** Cuộn 2 chiều (load tin cũ khi cuộn lên, load tin mới khi cuộn xuống).
* **Nhảy đến tin nhắn (Jump to Message):** Tải 25 tin trước + tin mục tiêu + 25 tin sau.
* **Phân tích Mention (@all, @channel, @here, @username):** Tự động bóc tách regex và sinh thông báo (`notifications`).

---

## 2. Bản Đồ Kiến Trúc Phân Tầng Của Message (Layered Architecture)

Tính năng Message tuân thủ chặt chẽ nguyên tắc **Clean Architecture**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 1. DOMAIN LAYER: Entity Message, MessageReaction, ChannelPinnedMessage │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    ▲
 ┌──────────────────────────────────┴─────────────────────────────────────┐
 │ 2. APPLICATION LAYER: CQRS Commands, Queries, DTOs, FluentValidators   │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    ▲
 ┌──────────────────────────────────┴─────────────────────────────────────┐
 │ 3. INFRASTRUCTURE LAYER: EF Core Mapping, PostgreSQL, IMemoryCache     │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    ▲
 ┌──────────────────────────────────┴─────────────────────────────────────┐
 │ 4. WEBAPI & REALTIME LAYER: ChannelsController, MessagesController,   │
 │                             SignalR ChatHub                            │
 └────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1. Domain Layer (Entities & Quan hệ bảng)

Mã nguồn tại: [src/NomNa.Domain/Entities/Messages/Message.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Domain/Entities/Messages/Message.cs)

```csharp
public class Message : BaseEntity
{
    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public string Content { get; set; } = string.Empty; // Max 4000 ký tự
    public Guid? ReplyToMessageId { get; set; }
    public Message? ReplyToMessage { get; set; }

    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public DateTime? DeletedAt { get; set; } // Soft-delete marker

    public List<MessageAttachmentItem> Attachments { get; set; } = new();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}
```

* **Quy tắc thiết kế:**
  * Kế thừa `BaseEntity` (có `Id: Guid`, `CreatedAt: DateTime`, `UpdatedAt: DateTime?`).
  * Sử dụng **Soft-delete** (`DeletedAt != null`): Tin nhắn khi bị xóa không biến mất vật lý trên đĩa để bảo toàn tính toàn vẹn của các quote reply trỏ tới nó.

---

### 2.2. Application Layer (CQRS Commands & Queries)

Tuân thủ quy tắc MediatR phân tách rạch ròi thành các thư mục độc lập:

#### Nhóm Ghi (Commands):
* `SendMessageCommand`: Gửi tin nhắn mới, cập nhật `LastMessageAt` của Channel, tạo Notifications nếu có tag/DM.
* `EditMessageCommand`: Sửa nội dung tin nhắn của chính mình.
* `DeleteMessageCommand`: Đánh dấu `DeletedAt = UtcNow`.
* `ToggleReactionCommand`: Thêm/bớt emoji reaction.
* `PinMessageCommand` & `UnpinMessageCommand`: Thao tác ghim tin nhắn.

#### Nhóm Đọc (Queries):
* `GetMessagesQuery`: Lấy danh sách tin nhắn theo con trỏ `Before` (tin cũ) hoặc `After` (tin mới).
* `GetMessagesAroundQuery`: Lấy tin nhắn quanh 1 ID cụ thể (phục vụ Jump-to-message).
* `GetPinnedMessagesQuery`: Lấy danh sách tin nhắn được ghim trong kênh.
* `SearchMessagesQuery`: Tìm kiếm tin nhắn theo từ khóa, thời gian, người gửi.

---

### 2.3. Infrastructure Layer (EF Core Mapping & Caching)

Cấu hình Fluent API tại [ApplicationDbContext.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Infrastructure/Persistence/ApplicationDbContext.cs#L157-L187):

* **Bảng lưu trữ:** `messages`.
* **Index hiện có:**
  1. `IX_messages_SenderId`: Index trên cột người gửi.
  2. `IX_messages_ReplyToMessageId`: Index khóa ngoại reply.
  3. `idx_messages_channel_root_created`: **Filtered Composite Index**:
     ```sql
     CREATE INDEX idx_messages_channel_root_created 
     ON messages ("ChannelId", "CreatedAt") 
     WHERE "DeletedAt" IS NULL;
     ```
* **Lưu trữ Attachments:** Sử dụng tính năng `OwnsMany(..., a => a.ToJson())` của EF Core 9 để lưu mảng đối tượng đính kèm trực tiếp dưới dạng cột `jsonb` trong PostgreSQL.
* **Bộ nhớ đệm (Caching):**
  * `IUserProfileCache`: Cache In-Memory thông tin `DisplayName`, `AvatarUrl` của User để khi gửi tin nhắn **không cần query lại bảng Users**.
  * `IPinnedMessageCache`: Cache danh sách pinned messages theo channel.

---

### 2.4. WebAPI & Realtime Layer (Controllers & SignalR ChatHub)

NomNa cung cấp **2 cổng giao tiếp song song** cho tin nhắn:

1. **Cổng REST API (HTTP Controllers):**
   * `POST /api/channels/{channelId}/messages` $\rightarrow$ Gửi tin nhắn.
   * `GET /api/channels/{channelId}/messages` $\rightarrow$ Lấy 25 tin nhắn.
   * `PUT /api/messages/{messageId}` $\rightarrow$ Sửa tin nhắn.
   * `DELETE /api/messages/{messageId}` $\rightarrow$ Xóa tin nhắn.
   * `POST /api/messages/{messageId}/reactions` $\rightarrow$ Thả cảm xúc.
2. **Cổng Realtime WebSocket (SignalR ChatHub):**
   * Client kết nối vào `/hubs/chat`, gọi phương thức RPC `JoinChannel(channelId)` để gia nhập nhóm SignalR.
   * Client có thể gửi tin nhắn trực tiếp qua RPC: `connection.invoke('SendMessage', channelId, content, ...)`.
   * Khi có tin nhắn mới, Hub broadcast sự kiện realtime:
     ```csharp
     await Clients.Group(channelId.ToString()).SendAsync("ReceiveMessage", messageDto);
     ```

---

## 3. Mổ Xẻ Chi Tiết Các Luồng Xử Lý & Câu Lệnh SQL Thực Tế

Hãy cùng "soi kính hiển vi" vào từng luồng xử lý để xem dưới tầng PostgreSQL thực sự xảy ra những câu lệnh SQL nào:

---

### 3.1. Luồng Gửi Tin Nhắn (`SendMessageCommand`)

Khi client gọi API gửi tin nhắn, [SendMessageCommandHandler.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Application/Features/Messages/Commands/SendMessage/SendMessageCommandHandler.cs) thực hiện chuỗi thao tác sau:

```
[Client] ──(POST /messages)──> [SendMessageCommandHandler]
                                        │
           (1. Query Channel)           ├──> SELECT FROM channels WHERE Id = @id
           (2. Query Permissions)       ├──> SELECT EXISTS FROM channel_members/server_members
           (3. Query Reply Message)     ├──> SELECT FROM messages WHERE Id = @replyId (nếu có)
           (4. In-Memory User Profile)  ├──> Đọc RAM Cache (0 DB queries)
           (5. Save Message & Update)   ├──> INSERT INTO messages (...) + UPDATE channels ...
           (6. Mentions / Notifications)├──> INSERT INTO notifications (...)
                                        ▼
                            [Return 200 OK + MessageDto]
```

#### Các câu lệnh SQL thực tế sinh ra:
```sql
-- 1. Tìm kênh chat
SELECT c."Id", c."IsPrivate", c."ServerId", c."Type", c."CreatedById", ...
FROM channels AS c
WHERE c."Id" = '01a16f00-d847-7434-8f3c-7c21edb3ecf9' LIMIT 1;

-- 2. Kiểm tra quyền thành viên
SELECT EXISTS (
    SELECT 1 FROM server_members AS sm
    WHERE sm."ServerId" = '...' AND sm."UserId" = '...'
);

-- 3. (Nếu có reply) Lấy tin nhắn gốc kèm thông tin người gửi
SELECT m."Id", m."Content", m."DeletedAt", m."SenderId", u."DisplayName", u."AvatarUrl"
FROM messages AS m
LEFT JOIN users AS u ON m."SenderId" = u."Id"
WHERE m."Id" = @replyToId AND m."ChannelId" = @channelId LIMIT 1;

-- 4. Lưu tin nhắn mới và cập nhật trạng thái kênh
BEGIN;
INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "ReplyToMessageId", "IsEdited", "CreatedAt", "Attachments")
VALUES ('...', '...', '...', 'Nội dung tin nhắn...', NULL, false, NOW(), '[]');

UPDATE channels 
SET "LastMessageAt" = NOW(), "LastMessageSenderId" = '...', "LastMessageContent" = 'Nội dung...'
WHERE "Id" = '01a16f00-d847-7434-8f3c-7c21edb3ecf9';
COMMIT;
```

> **Điểm nghẽn tiềm ẩn:** Một thao tác gửi tin nhắn đơn giản tạo ra **từ 3 đến 4 round-trips mạng riêng rẽ** xuống PostgreSQL. Khi có 300 VUs cùng gửi tin, thời gian chờ kết nối DB cộng dồn lại khiến P95 tăng vọt!

---

### 3.2. Luồng Đọc Tin Nhắn Phân Trang (`GetMessagesQuery`)

Mã nguồn tại: [GetMessagesQueryHandler.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Application/Features/Messages/Queries/GetMessages/GetMessagesQueryHandler.cs)

Đây là endpoint có tần suất gọi cao nhất hệ thống.

```sql
-- 1. Query lấy 26 tin nhắn (limit 25 + 1 tin dự phòng để kiểm tra hasOlder)
SELECT m."Id", m."ChannelId", m."SenderId", u."DisplayName", u."UserName", u."AvatarUrl",
       m."Content", m."IsEdited", m."CreatedAt", m."Attachments",
       r."Id" AS "ReplyId", r."SenderId" AS "ReplySenderId", ru."DisplayName" AS "ReplySenderName"
FROM messages AS m
INNER JOIN users AS u ON m."SenderId" = u."Id"
LEFT JOIN messages AS r ON m."ReplyToMessageId" = r."Id"
LEFT JOIN users AS ru ON r."SenderId" = ru."Id"
WHERE m."ChannelId" = '01a16f00-d847-7434-8f3c-7c21edb3ecf9' 
  AND m."DeletedAt" IS NULL
  AND m."CreatedAt" < '2026-10-28 14:00:00+00' -- Con trỏ Before
ORDER BY m."CreatedAt" DESC
LIMIT 26;

-- 2. Query batch lấy toàn bộ reactions của 25 tin nhắn trên (Tránh N+1)
SELECT r."Id", r."MessageId", r."UserId", r."Emoji", r."CreatedAt"
FROM message_reactions AS r
WHERE r."MessageId" IN ('id1', 'id2', 'id3', ... 'id25');
```

> **Điểm sáng kiến trúc:**
> * Handler sử dụng **`AsNoTracking()`** $\rightarrow$ Tiết kiệm 50% CPU/RAM do EF Core không cần theo dõi trạng thái đối tượng.
> * Lấy reactions bằng **1 câu lệnh gộp duy nhất (`WHERE MessageId IN (...)`)** $\rightarrow$ **Triệt tiêu hoàn toàn lỗi N+1 Query kinh điển!**

---

### 3.3. Luồng Nhảy Đến Tin Nhắn Ghim / Quanh Tin Nhắn (`GetMessagesAroundQuery`)

Mã nguồn tại: [GetMessagesAroundQueryHandler.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Application/Features/Messages/Queries/GetMessagesAround/GetMessagesAroundQueryHandler.cs)

Khi người dùng bấm vào một tin nhắn được ghim, frontend cần nhảy thẳng tới vị trí đó trong lịch sử:
1. Query 1: Lấy timestamp `CreatedAt` của tin nhắn mục tiêu (`targetMessage`).
2. Query 2: Lấy **25 tin nhắn cũ hơn** (`CreatedAt <= targetCreatedAt ORDER BY CreatedAt DESC LIMIT 26`).
3. Query 3: Lấy **25 tin nhắn mới hơn** (`CreatedAt > targetCreatedAt ORDER BY CreatedAt ASC LIMIT 25`).
4. Ghép 2 danh sách lại thành 1 mảng 50 tin liên tục, gửi về cho frontend với 2 cờ `hasOlder` và `hasNewer`.

---

### 3.4. Luồng Thả Cảm Xúc (`ToggleReactionCommand`)

Mã nguồn tại: [ToggleReactionCommandHandler.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Application/Features/Messages/Commands/ToggleReaction/ToggleReactionCommandHandler.cs)

* Kiểm tra xem cặp `(MessageId, UserId, Emoji)` đã tồn tại chưa:
  * Nếu đã có: Xóa bỏ bản ghi (`DELETE`).
  * Nếu chưa có: Thêm bản ghi mới (`INSERT`).
* Phát tán sự kiện SignalR `ReceiveReactionUpdated` tới toàn bộ thành viên trong kênh.

---

### 3.5. Luồng Tìm Kiếm Tin Nhắn (`SearchMessagesQuery`)

Mã nguồn tại: [SearchMessagesQueryHandler.cs](file:///home/vanmuzic/Projects/NomNaReal/src/NomNa.Application/Features/Messages/Queries/SearchMessages/SearchMessagesQueryHandler.cs#L123-L127)

Hiện tại câu lệnh SQL sinh ra là:
```sql
SELECT ... FROM messages AS m
WHERE m."ChannelId" IN (...) 
  AND m."DeletedAt" IS NULL
  AND LOWER(m."Content") LIKE '%keyword%'
ORDER BY m."CreatedAt" DESC
LIMIT 30;
```

> ⚠️ **Cảnh báo điểm gãy:** Câu lệnh `LIKE '%keyword%'` bắt buộc PostgreSQL phải đọc toàn bộ bảng (Sequential Scan). Không có B-Tree index nào có thể hỗ trợ ký tự `%` ở đầu từ khóa!

---

## 4. Bảng Đánh Giá Điểm Mạnh & Nợ Kỹ Thuật (Technical Debts)

Dưới đây là bảng tổng kết khách quan dựa trên việc phân tích mã nguồn thực tế:

| Hạng Mục | Hiện Trạng Trong Mã Nguồn | Đánh Giá | Hậu Quả & Hướng Tối Ưu |
| :--- | :--- | :---: | :--- |
| **Phân trang lịch sử** | Keyset Cursor dựa trên `CreatedAt` | ✅ Tốt | Đạt $O(1)$. Cần bổ sung thêm `Id` (Cursor kép `(CreatedAt, Id)`) để chống sót tin khi có 2 tin cùng micro-giây. |
| **Chống N+1 khi đọc** | Gộp Reactions bằng `IN (...)`, User qua JOIN | ✅ Rất tốt | Không sinh ra 25 queries lẻ tẻ. |
| **Bộ nhớ đệm Profile** | Dùng `IUserProfileCache` In-Memory | ✅ Tốt | Gửi tin không phải query lại bảng Users. Cần chuyển sang Redis khi chạy đa node. |
| **DbContext Lifecycle** | Dùng `AddDbContext` (chưa dùng Pool) | 🚧 Nợ kỹ thuật | Mỗi request tạo mới 1 DbContext, gây áp lực GC Gen 0. Cần chuyển sang `AddDbContextPool`. |
| **Round-trips gửi tin** | 3-4 truy vấn tuần tự trong `SendMessage` | 🚧 Nợ kỹ thuật | Giữ connection trong pool lâu. Cần gộp truy vấn kiểm tra quyền và channel thành 1 query. |
| **Tìm kiếm nội dung** | `LOWER(Content) LIKE '%kw%'` | ❌ Rủi ro cao | Quét tuần tự đĩa từ khi bảng lớn. Cần thay bằng PostgreSQL Full-Text Search + GIN Index. |
| **Chống lặp tin khi retry** | Chưa có `IdempotencyKey` | ❌ Thiếu sót | Nếu client rớt mạng và bấm gửi lại, DB sẽ tạo 2 tin nhắn trùng lặp. |
| **Broadcast SignalR** | Gọi query phụ trong Hub khi là DM | 🚧 Nợ kỹ thuật | `ChatHub.SendMessage` lại tự tạo Scope query lại `ChannelMembers`. Nên dispatch qua Notification layer. |

---

## 5. Lộ Trình Kiểm Thử Thực Chiến k6 Cho Core Messages (Testing Matrix)

Đây là giáo trình thực nghiệm 5 bài kiểm thử trọng tâm cho **Tuần 1: Chinh phục Core Messages**:

```
                              MA TRẬN 5 BÀI TEST CORE MESSAGES
 ┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
 │ 1. Pure Read Throughput  │ 2. Pure Write Stress     │ 3. Realistic Mixed       │
 │ Đo trần đọc phân trang   │ 100 VUs liên tục gửi tin │ 75% Đọc, 20% Gửi,        │
 │ trên DB 100K - 1M dòng   │ Đo lock tranh chấp DB    │ 5% Thả cảm xúc           │
 ├──────────────────────────┼──────────────────────────┼──────────────────────────┤
 │ 4. SignalR Fanout C1K    │ 5. Search Message Stress │                          │
 │ 1 người gửi tin,         │ 50 VUs liên tục gõ tìm   │                          │
 │ 1.000 client nhận frame  │ Đo độ trễ Full Table Scan│                          │
 └──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

### Kịch bản 1: Pure Read Throughput (Đo trần đọc phân trang với 100K - 1M tin)

* **Mục tiêu:** Kiểm tra trần công suất đọc (Read Capacity) của API `GET /api/channels/{id}/messages?limit=25`.
* **Điều kiện tiên quyết:** Bơm **100.000 tin nhắn** vào DB bằng công cụ [scripts/seed_large_dataset.py](file:///home/vanmuzic/Projects/NomNaReal/scripts/seed_large_dataset.py).
* **Thiết lập k6:**
  * 150 VUs liên tục cuộn đọc tin nhắn cũ bằng con trỏ `Before`.
  * Không có thao tác ghi hay đăng nhập.
* **Chỉ số theo dõi:**
  * Throughput (RPS) tối đa của 1 vCPU là bao nhiêu?
  * Độ trễ `nomna_read_messages_duration_ms` (Kỳ vọng P95 < 50ms).
  * Chạy lệnh `EXPLAIN ANALYZE` trong PostgreSQL để xem DB sử dụng `Index Scan` trên `idx_messages_channel_root_created` hay quét toàn bảng.

---

### Kịch bản 2: Pure Write Concurrency & Lock Contention (Đo trần ghi đồng thời)

* **Mục tiêu:** Kiểm tra xem PostgreSQL và Kestrel chịu được bao nhiêu tin nhắn gửi vào cùng 1 giây trước khi bị nghẽn connection pool.
* **Thiết lập k6:**
  * 100 VUs liên tục gọi `POST /api/channels/{id}/messages` với think-time cực ngắn (0.2s - 0.5s).
* **Hiện tượng quan sát:**
  * Có xảy ra hiện tượng **Database Lock Contention** khi nhiều request cùng cố gắng cập nhật dòng `channels.LastMessageAt` của cùng 1 kênh không?
  * Số lượng kết nối PostgreSQL tiêu thụ (`SELECT count(*) FROM pg_stat_activity;`).
  * Tỷ lệ lỗi (Error rate) khi dồn tải cao.

---

### Kịch bản 3: Realistic Mixed Traffic (75% Đọc, 20% Gửi, 5% Reaction)

* **Mục tiêu:** Mô phỏng chân thực nhất một ngày hoạt động cao điểm của cộng đồng NomNa.
* **Thiết lập k6:**
  * Chạy file [scripts/k6/scenarios/01_realistic_chat.js](file:///home/vanmuzic/Projects/NomNaReal/scripts/k6/scenarios/01_realistic_chat.js) vừa được xây dựng.
  * Tải: Tăng dần từ 0 $\rightarrow$ 50 $\rightarrow$ 150 $\rightarrow$ 300 VUs.
  * Phân phối hành vi có trọng số: 75% Browse đọc tin, 20% Send message, 5% React emoji.
  * Sử dụng Token Pool pre-authenticated (không băm mật khẩu trong loop).
* **Kỳ vọng nghiệm thu:**
  * `http_req_duration`: P95 < 300ms, P99 < 800ms.
  * Tỷ lệ lỗi: 0.00%.

---

### Kịch bản 4: SignalR Fanout Broadcasting Latency (1 Sender $\rightarrow$ 1.000 Receivers)

* **Mục tiêu:** Đo độ trễ phát tán tin nhắn thời gian thực (Realtime Fanout Latency).
* **Thiết lập k6:**
  * Sử dụng kịch bản WebSocket `02_signalr_realtime.js`.
  * Duy trì **1.000 kết nối WebSocket đồng thời** cùng join vào 1 channel group.
  * 1 VU độc lập gửi tin nhắn qua REST API hoặc Hub RPC.
  * 1.000 client nhận frame `ReceiveMessage`, lấy `Date.now() - msg.createdAt` để tính toán độ trễ lan truyền.
* **Kỳ vọng nghiệm thu:**
  * P95 Fanout Latency < 100ms.
  * Số lượng kết nối bị rớt (Connection drops) < 5 kết nối.

---

### Kịch bản 5: Search Stress Test (Full Table Scan vs GIN Index)

* **Mục tiêu:** Thấy tận mắt sự sụp đổ của câu lệnh `LIKE '%kw%'` trên dữ liệu lớn.
* **Thiết lập k6:**
  * 30 VUs liên tục gọi `GET /api/messages/search?keyword=xxx` trên database 100.000 dòng.
* **Hiện tượng dự kiến:** CPU của container `bench_postgres` sẽ lập tức vọt lên **100%** và ổ đĩa bị nghẽn IOPS do phải quét tuần tự toàn bộ bảng.
* **Giải pháp kiểm chứng:** Tạo index GIN với `to_tsvector` và viết lại query $\rightarrow$ Đo lại để thấy CPU tụt về 5% và latency giảm từ 8 giây xuống 10ms!

---

## 6. Kế Hoạch Bàn Luận & Tối Ưu Hóa Từng Nấc (Discussion & Action Steps)

Để việc học tập và tối ưu đạt hiệu quả cao nhất theo đúng tinh thần "việc gì ra việc đó", dưới đây là các bước chúng ta sẽ cùng phối hợp thực hiện:

### Bước 1: Nạp Dữ Liệu Lớn Làm Chuẩn (Baseline Setup)
```bash
# Nạp 100.000 tin nhắn vào cơ sở dữ liệu benchmark
python3 scripts/seed_large_dataset.py --messages 100000 | docker exec -i bench_postgres psql -U db_user -d NomNa
```

### Bước 2: Chạy Đo Baseline Thực Tế Với Kịch Bản Mới
```bash
# Chạy kịch bản 01_realistic_chat.js để ghi nhận mốc số liệu gốc
./scripts/k6/run-bench.sh realistic
```

### Bước 3: Áp Dụng Lần Lượt Từng Điểm Tối Ưu & Đo Lại
1. **Tối ưu 1 (WebAPI):** Đổi `AddDbContext` $\rightarrow$ `AddDbContextPool` trong `DependencyInjection.cs` $\rightarrow$ Đo lại.
2. **Tối ưu 2 (MediatR):** Gộp các round-trips kiểm tra quyền trong `SendMessageCommandHandler.cs` thành 1 query duy nhất $\rightarrow$ Đo lại.
3. **Tối ưu 3 (Database):** Tinh chỉnh Index và chuyển `SearchMessages` sang GIN Full-Text Search $\rightarrow$ Đo lại.

Mỗi bước tối ưu xong, chúng ta sẽ cùng đối chiếu bảng số liệu k6 để tận mắt chứng kiến hệ thống NomNa tiến hóa từng ngày!
