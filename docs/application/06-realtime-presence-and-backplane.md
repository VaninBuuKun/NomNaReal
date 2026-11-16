# 🌐 Chuyên Đề 06: Mở Rộng Trạng Thái Hiện Diện & SignalR Redis Backplane (Presence & Backplane)

> **Mục tiêu:** Hiểu rõ tại sao `Clients.All` là "quả bom nổ chậm" gây nghẽn băng thông và lộ quyền riêng tư, cách NomNa thu hẹp phạm vi phát tán (Presence Scoping) theo mô hình Discord, và cơ chế SignalR Redis Backplane để scale-out nhiều máy chủ.

---

## 💡 1. Tư Tưởng Cốt Lõi (The Mental Model)

Trong ứng dụng chat thời gian thực quy mô lớn:
* **Cạm bẫy $O(N^2)$ của `Clients.All`:**  
  Nếu mỗi khi người dùng kết nối hoặc ngắt kết nối mà server lại gọi `Clients.All.SendAsync("UserStatusChanged")`:  
  Giả sử có 1,000 người dùng kết nối lại sau sự cố mạng, server phải bắn ra $1,000 \times 1,000 = 1,000,000$ gói tin WebSocket! CPU máy chủ và băng thông mạng sẽ lập tức bị nghẽn (Broadcast Storm).
* **Lỗ hổng quyền riêng tư (Privacy Leak):**  
  Người dùng $A$ chỉ tham gia Server Âm Nhạc, người dùng $B$ chỉ tham gia Server Game. Hai người hoàn toàn xa lạ và không kết bạn. $B$ **không có quyền** được nhận thông báo mỗi khi $A$ online hay offline.
* **Tôn trọng chế độ Ẩn danh (Invisible Mode):**  
  Nếu người dùng chọn "Tàng hình" (`UserStatusPreference.Invisible`), dù họ đang online chat bình thường thì server **tuyệt đối không được phát thông báo Online** cho người khác.

---

## 🎯 2. Mô Hình Phân Vùng Hiện Diện (Presence Scoping Model)

Thay vì phát tán cho toàn thế giới, thông báo trạng thái của User $U$ chỉ được gửi tới đúng 2 nhóm đối tượng liên quan:

$$\text{TargetPeers} = \text{Members}(\text{MutualServers}(U)) \cup \text{Friends}(U)$$

```mermaid
flowchart TD
    User([User U Kết nối / Ngắt kết nối / Đổi trạng thái]) --> ScopeCheck{User có đặt Invisible?}
    ScopeCheck -- Có --> NoBroadcast[Không phát thông báo ra ngoài\nGiữ nguyên trạng thái offline]
    ScopeCheck -- Không --> TargetSelection[Xác định phạm vi thông báo]
    
    TargetSelection --> S1[Nhóm Server chung:\nClients.Groups(server_1, server_2...)]
    TargetSelection --> S2[Bạn bè trực tiếp:\nClients.Users(friend_1, friend_2...)]
    
    S1 & S2 --> SafeBroadcast([Phát tán chính xác & Khử trùng lặp\n0% Lộ riêng tư & Không gây bão O(N^2)])
```

### ⚡ Các điểm tối ưu then chốt:
1. **Server Grouping:** Khi client kết nối, connection tự động tham gia các nhóm SignalR `server_{serverId}` mà user là thành viên. Khi user đổi trạng thái, server chỉ cần gọi `Clients.Groups(serverGroupNames)` — SignalR tự động gửi cho từng client **đúng 1 lần duy nhất** dù họ có chung 3 hay 4 server.
2. **Dynamic Server Subscriptions:** Cung cấp 2 RPC endpoint `JoinServer(serverId)` và `LeaveServer(serverId)` để client cập nhật nhóm realtime khi tham gia server mới mà không cần ngắt kết nối WebSocket.

---

## 🔄 3. Bộ Phân Giải Trạng Thái (Status Preference Resolution)

Hệ thống kết hợp giữa **kết nối vật lý (Redis Connection Lease)** và **nguyện vọng hiển thị (`UserStatusPreference`)**:

```csharp
// 🎯 Logic chuẩn Discord trong UserPresenceResolver.cs
public static string Resolve(bool isOnlineInRedis, UserStatusPreference preference)
{
    if (!isOnlineInRedis)
        return "offline";

    return preference switch
    {
        UserStatusPreference.DoNotDisturb => "dnd",      // Chấm đỏ
        UserStatusPreference.Idle         => "away",     // Chấm vàng
        UserStatusPreference.Invisible    => "offline",  // Tàng hình: Chấm xám
        _                                 => "online"    // Chấm xanh
    };
}
```

---

## 🏗️ 4. SignalR Redis Backplane (Horizontal Scalability)

### Bài toán khi mở rộng nhiều Server:
Khi hệ thống có 10,000 người dùng, ta phải chạy 2 hoặc nhiều instance WebAPI đằng sau Nginx:
* Alice kết nối tới **Server 1**.
* Bob kết nối tới **Server 2**.
* Nếu không có Backplane, khi Alice gửi tin nhắn vào `#general`, Server 1 chỉ biết các kết nối trên RAM của nó $\to$ **Bob trên Server 2 sẽ không bao giờ nhận được tin nhắn!**

### Giải pháp Redis Backplane:
Gói `Microsoft.AspNetCore.SignalR.StackExchangeRedis` biến Redis thành trạm trung chuyển Pub/Sub:
* Server 1 phát tin nhắn $\to$ Redis Pub/Sub topic `nomna_signalr` $\to$ Server 2 nhận được và đẩy tới Bob qua WebSocket.
* Cấu hình trong `DependencyInjection.cs`:

```csharp
// 🎯 Cấu hình Redis Backplane cho SignalR
var signalRBuilder = services.AddSignalR();
var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6380";

if (!string.IsNullOrWhiteSpace(redisConn))
{
    signalRBuilder.AddStackExchangeRedis(redisConn, options =>
    {
        options.Configuration.AbortOnConnectFail = false;
        options.Configuration.ConnectTimeout = 5000;
        options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("nomna_signalr");
    });
}
```
