# 🛡️ Chuyên Đề 02: Động Cơ Phân Quyền Bitmask 64-bit & Xóa Cache Tức Thì (Permission Engine & Invalidation)

> **Mục tiêu:** Hiểu rõ cách NomNa tính toán quyền hạn thành viên theo thuật toán phân cấp chuẩn Discord (xử lý ở mức CPU nanoseconds) và cơ chế xóa cache tức thì không để lọt quyền khi Admin thay đổi role.

---

## 💡 1. Tư Tưởng Cốt Lõi (The Mental Model)

Hệ thống phân quyền của ứng dụng chat nhiều kênh như Discord/Slack rất phức tạp:
* Mỗi server có nhiều **Role** (Admin, Moderator, Member, VIP...), mỗi Role có danh sách quyền riêng.
* Mỗi **Channel** có thể ghi đè (Overwrite): Cho phép (`Allow`) hoặc Cấm (`Deny`) một Role hoặc một Người dùng cụ thể.
* **Bài toán hiệu năng:** Mỗi hành động (Gửi tin nhắn, Xem kênh, Xóa tin, Kick thành viên...) đều phải kiểm tra quyền. Nếu mỗi lần kiểm tra đều query DB nối nhiều bảng (`Servers`, `Roles`, `ChannelPermissionOverwrites`, `MemberRoles`), Database sẽ sập ngay lập tức.

### Giải pháp của NomNa:
1. **Bitmask 64-bit (`ulong`):** Mọi quyền được biểu diễn bằng 1 bit nhị phân duy nhất (`1 << 0`, `1 << 1`, ... `1 << 30`). Gom quyền là phép `OR (|)`, kiểm tra quyền là phép `AND (&)`. CPU xử lý chỉ mất **1 chu kỳ xung nhịp (~1 nanosecond)**.
2. **Cache-Aside (`IMemoryCache`) 2 phút:** Lưu kết quả bitmask quyền của `(ServerId, UserId)` và `(ChannelId, UserId)` vào RAM.
3. **Cơ chế Hủy Cache Đổi Mới (`CancellationChangeToken`):** Dùng Dictionary Token tĩnh toàn cục để khi Admin sửa role hay overwrite, toàn bộ cache liên quan bị tiêu hủy ngay lập tức mà không cần chờ hết 2 phút.

---

## 🌳 2. Thứ Tự Phân Giải Quyền 7 Bước (Discord-Grade Hierarchy)

Mọi phép tính trong [`PermissionCalculator.cs`](../../src/NomNa.Domain/Services/PermissionCalculator.cs) là một Pure Function không phụ thuộc bên ngoài:

```mermaid
flowchart TD
    Start([Bắt đầu kiểm tra Channel]) --> Step1{User là Owner Server?}
    Step1 -- Đúng --> FullPerms[Trả về Permissions.All]
    Step1 -- Sai --> Step2[Gộp Base Server Perms:\n@everyone | MemberRoles]
    
    Step2 --> Step3{Có quyền Administrator?}
    Step3 -- Đúng --> FullPerms
    Step3 -- Sai --> Step4[Áp dụng Overwrite @everyone:\n& ~Deny rồi | Allow]
    
    Step4 --> Step5[Gộp Overwrites của các Role:\n& ~AllRolesDeny rồi | AllRolesAllow\nAllow thắng Deny giữa các role ngang hàng]
    Step5 --> Step6[Áp dụng Overwrite đích danh Member:\n& ~MemberDeny rồi | MemberAllow\nƯu tiên cá nhân cao nhất]
    
    Step6 --> Step7{Có quyền ViewChannel?}
    Step7 -- Không --> ZeroPerms[Trả về Permissions.None]
    Step7 -- Có --> Done([Trả về Bitmask Quyền Hạn Hợp Lệ])
```

### 🎯 Quy tắc vàng cần nhớ:
* **Chủ server (`OwnerId`)** và **`Administrator`** là bất tử: Không một Channel Overwrite nào có thể cấm được họ.
* **Allow thắng Deny giữa các Role ngang hàng**: Nếu bạn có Role "Học Viên" bị Deny `SendMessages`, nhưng có thêm Role "Trợ Giảng" được Allow `SendMessages`, bạn **VẪN ĐƯỢC PHÉP** gửi tin nhắn.
* **Ghi đè cá nhân (`Member Overwrite`) là tối cao**: Nếu Admin chỉ định đích danh User của bạn bị Deny `SendMessages`, quyền này đè bẹp tất cả các Role bạn đang có.
* **Không xem được thì không làm được gì (`Implicit ViewChannel`)**: Nếu bitmask cuối cùng thiếu cờ `ViewChannel`, mọi quyền khác bị thu hồi về `Permissions.None`.

---

## ⚡ 3. Cơ Chế Xóa Cache Tức Thì (Instant Cache Invalidation)

### 💣 Cạm bẫy cũ: Token nằm trong Scoped Service
* `PermissionService` được đăng ký trong DI container là `AddScoped` (mỗi HTTP request / SignalR invocation là một instance mới).
* Nếu đặt `ConcurrentDictionary<Guid, CancellationTokenSource>` ở cấp instance, thì instance A (khi Admin sửa Role) và instance B (khi Member gửi tin nhắn) sẽ **sở hữu 2 từ điển hoàn toàn khác nhau**. Gọi `InvalidateServer()` ở instance A sẽ **không có tác dụng gì** đối với cache của instance B!

### 🛠️ Giải pháp: Static Concurrent Token Registry
Biến từ điển token thành `static readonly` dùng chung cho toàn bộ tiến trình ứng dụng:

```csharp
// 🎯 Code then chốt trong PermissionService.cs
private static readonly ConcurrentDictionary<Guid, CancellationTokenSource> _serverTokens = new();
private static readonly ConcurrentDictionary<Guid, CancellationTokenSource> _channelTokens = new();
private static readonly ConcurrentDictionary<(Guid ServerId, Guid UserId), CancellationTokenSource> _userTokens = new();

// Khi lưu Cache: Gắn liên kết với CancellationToken
var srvCts = _serverTokens.GetOrAdd(serverId, _ => new CancellationTokenSource());
options.AddExpirationToken(new CancellationChangeToken(srvCts.Token));

// Khi Admin sửa quyền Server: Kích hoạt hủy token -> IMemoryCache tự trục xuất ngay lập tức
public void InvalidateServer(Guid serverId)
{
    if (_serverTokens.TryRemove(serverId, out var cts))
    {
        cts.Cancel();
        cts.Dispose();
    }
}
```

---

## 📌 4. Bảng Tra Cứu Nhanh Bitwise
| Thao tác | Cú pháp C# | Mục đích thực tế |
| :--- | :--- | :--- |
| **Gộp quyền** | `perms \|= role.Permissions` | Cộng thêm quyền mới vào danh sách hiện có |
| **Tước quyền** | `perms &= ~denyPermissions` | Xóa bỏ các bit quyền bị cấm |
| **Kiểm tra quyền** | `(perms & req) == req` | Kiểm tra xem user có đủ quyền yêu cầu không |
| **Kiểm tra 1 trong nhiều** | `(perms & reqs) != 0` | Kiểm tra xem user có ít nhất 1 quyền trong nhóm |

