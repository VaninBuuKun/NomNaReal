import uuid
import random
from datetime import datetime, timedelta, timezone

USERS = [
    {"id": "e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9", "name": "Obito HiHi", "style": "admin"},
    {"id": "cdd69e15-714f-44a1-8f27-27802116de6f", "name": "Kushina Uzumaki", "style": "friendly"},
    {"id": "f4167276-4e39-4b5d-97bd-3275558ebe9c", "name": "Alex Rivers", "style": "tech"},
    {"id": "0b01c44d-8fe5-41d8-aed8-b16881305212", "name": "Minh Dev", "style": "backend"},
    {"id": "9c05b2dc-8147-48c2-92c7-5891cb586840", "name": "Van Nguyen", "style": "frontend"},
    {"id": "8314bf99-163f-4b69-ab79-6e42e7bedd97", "name": "Lan Hương", "style": "qa"},
    {"id": "a60cfe73-8be9-4985-ba8d-063ac8b930ec", "name": "Shizuka", "style": "product"},
]

CHANNEL_ID = "01a13b13-d4a3-7be8-b4cf-ba9b60bc32ea"
SERVER_ID = "01a13b13-d4a3-7a7f-a963-4a3d996ae25c"

TOPICS = [
    # Topic 1: Init server & onboarding
    [
        ("admin", "Chào mừng anh em đã đến với server mới NomNa Real! 🎉"),
        ("product", "Server nhìn xịn quá anh Obito ơi, kênh text kênh voice đầy đủ luôn rồi!"),
        ("backend", "Chào mọi người nhé, backend .NET 9 đã deploy lên VPS test rồi nha."),
        ("frontend", "Vite + React 18 mượt mà ghê. Em vừa setup xong TanStack Query v5."),
        ("qa", "Đội QA đã sẵn sàng test tải và test realtime chat SignalR."),
        ("tech", "Let's rock! SignalR hub connect ổn định qua wss chứ @Minh Dev?"),
        ("backend", "Chuẩn luôn @Alex, có reconnect tự động với Redis backplane nhé!"),
        ("friendly", "Cố lên cả nhà ơi, dự án này release là đi ăn lẩu ăn mừng nha 🍲"),
        ("admin", "Nhất trí luôn chị Kushina ơi haha!"),
    ],
    # Topic 2: Database & Architecture
    [
        ("backend", "Mọi người chú ý là database migration PostgreSQL đã chạy hết rồi nha."),
        ("tech", "Có index trên (ChannelId, CreatedAt) cho bảng messages chưa ông?"),
        ("backend", "Có rồi, composite index idx_messages_channel_root_created cực kì tối ưu luôn."),
        ("frontend", "Frontend sẽ query cursor-based pagination với timestamp Before/After."),
        ("tech", "Chuẩn bài cursor pagination, tránh được offset-limit chậm chạp khi data lên hàng triệu rows."),
        ("qa", "Nếu user đang scroll lên thì fetch previous cursor, scroll xuống thì realtime push đúng ko?"),
        ("frontend", "Đúng rồi chị @Lan Hương, kết hợp TanStack Query infinite query rất nuột."),
    ],
    # Topic 3: Reply Message & Quotes
    [
        ("product", "Về tính năng Reply tin nhắn, mình thống nhất là bỏ Message Thread riêng đúng ko team?"),
        ("admin", "Đúng rồi Shizuka, thread tin nhắn trong chat app thông thường ít người dùng mà UX rối rắm lắm."),
        ("frontend", "Chuyển sang Discord-style reply: bấm reply thì hiện quote nhỏ trên đầu tin nhắn mới."),
        ("tech", "Cách đó clean hơn hẳn, vừa dễ đọc vừa liền mạch hội thoại."),
        ("friendly", "Em cũng thích kiểu reply này hơn, bấm vào quote thì cuộn nhảy đến tin nhắn gốc nữa."),
        ("backend", "Backend chỉ cần thêm cột ReplyToMessageId nullable là xong, rất nhẹ nhàng."),
        ("qa", "Test case: nếu tin nhắn gốc bị xóa thì quote hiển thị thế nào ạ?"),
        ("backend", "Sẽ hiển thị 'Tin nhắn đã bị xóa' với style mờ mờ nghiêng nghiêng nha."),
        ("frontend", "Đã xử lý case đó trên UI rồi nhé chị Lan Hương!"),
    ],
    # Topic 4: Pinned Messages & Jumping
    [
        ("admin", "Mình ghim tin nhắn quy định chung của server lên nhé anh em."),
        ("product", "Ghim xong user bấm vào pin list trên header xem được danh sách tin ghim."),
        ("frontend", "Đặc biệt là khi bấm vào tin ghim, app sẽ nhảy thẳng đến vị trí tin nhắn đó trong kênh!"),
        ("tech", "Để làm được jump to message mà tin nhắn đó chưa có trong cache frontend thì làm sao?"),
        ("backend", "Mình vừa viết endpoint GET /api/channels/{id}/messages/around?messageId=xxx&limit=50"),
        ("tech", "Ồ thông minh đấy! Lấy 25 tin trước + tin target + 25 tin sau đúng ko?"),
        ("backend", "Chính xác, kèm cờ hasOlder và hasNewer để frontend load 2 chiều (bi-directional infinite scroll)!"),
        ("frontend", "Đỉnh chóp! Em sẽ gắn hook useMessagesAround vào là xong."),
    ],
    # Topic 5: Performance & N+1 fix
    [
        ("tech", "Hôm nay review lại code thấy GetChannelsQueryHandler bị N+1 query permissions."),
        ("backend", "Đúng rồi, mỗi channel trong server lại gọi GetChannelPermissionsAsync một lần."),
        ("admin", "Đã optimize gộp thành GetChannelsPermissionsAsync batch query 1 lần duy nhất rồi nhé!"),
        ("qa", "Kiểm tra thấy query count giảm từ N+1 xuống còn 2 queries, response time từ 180ms xuống 12ms 🚀"),
        ("frontend", "Xác nhận channel list render cái rẹt, không còn giật lag nữa."),
        ("friendly", "Team mình optimize đỉnh thật sự ❤️"),
    ],
    # Topic 6: Casual chat, lunch, coffee
    [
        ("friendly", "Trưa nay ăn gì mọi người ơi? Cơm tấm hay bún bò?"),
        ("frontend", "Vote bún bò giò heo ngõ 12 nhé chị!"),
        ("backend", "+1 bún bò nhiều ớt!"),
        ("admin", "Cho em 1 suất bún bò gân với ạ."),
        ("tech", "Order cà phê nữa nha ae, nay thức cày code phê quá ☕"),
        ("product", "Em đặt chung quán Highlands gần công ty nhé, ai uống gì nhắn em."),
        ("qa", "Cho chị 1 trà sen vàng size L nha Shizuka."),
        ("friendly", "Chị 1 freeze trà xanh nữa nhé."),
    ],
    # Topic 7: Scale testing & virtual scrolling
    [
        ("qa", "Đang chuẩn bị test tải 400 tin nhắn xem giao diện chat scroll mượt không."),
        ("frontend", "DOM render 400 messages nếu dùng virtual list hoặc windowing thì 60fps ngon lành."),
        ("tech", "Test cả trường hợp mạng lag 3G mô phỏng throttling xem spinner hiện thế nào nha."),
        ("backend", "Backend PostgreSQL đánh index B-Tree chuẩn rồi, load 50 messages dưới 5ms."),
        ("admin", "Tuyệt vời, sẵn sàng cho giai đoạn demo với khách hàng rồi!"),
    ]
]

SHORT_CHATTERS = [
    "Ủng hộ luôn!",
    "Oke nha bro 👍",
    "Tuyệt vời!",
    "Chuẩn rồi đấy.",
    "Hợp lý quá nè.",
    "Đang test thử đây.",
    "Mọi người check lại giúp em nhé.",
    "Deploy thành công rồi ae!",
    "Quá đã 🔥",
    "Giao diện nhìn mướt mắt ghê.",
    "Cái này chạy mượt thật sự.",
    "Đồng ý kiến với bác.",
    "Chuẩn không cần chỉnh luôn haha.",
    "Code sạch đẹp, clean architecture chuẩn chỉ.",
    "Chờ chút em push commit mới lên git nhé.",
    "Đã rebase main xong xuôi.",
    "Ready for QA test!",
    "Bắt đầu test đây cả nhà.",
    "Pass hết 39 unit tests rồi nè.",
    "Tối nay làm trận game giải trí chứ ae? 🎮",
    "Oke set kèo 9h tối nha!",
]

REACTIONS = ["👍", "🔥", "🚀", "❤️", "🎉", "😂", "👀", "💯"]

def generate_sql():
    random.seed(42)
    start_time = datetime(2026, 10, 14, 8, 30, 0, tzinfo=timezone.utc)
    current_time = start_time
    
    messages = []
    message_ids = []
    
    # We will generate ~360 messages
    target_count = 360
    
    topic_idx = 0
    sub_idx = 0
    current_topic = TOPICS[0]
    
    for i in range(target_count):
        # Time increment: 15s to 8 minutes
        delta_seconds = random.choice([
            random.randint(15, 60),      # burst chatting
            random.randint(60, 240),     # continuous chat
            random.randint(300, 900),    # gaps between discussions
        ])
        current_time += timedelta(seconds=delta_seconds)
        
        msg_id = str(uuid.uuid4())
        
        # Decide content & sender
        if random.random() < 0.65:
            # Pick from topic
            style, text = current_topic[sub_idx]
            sub_idx += 1
            if sub_idx >= len(current_topic):
                sub_idx = 0
                topic_idx = (topic_idx + 1) % len(TOPICS)
                current_topic = TOPICS[topic_idx]
            # Match sender with style or random user
            matching_users = [u for u in USERS if u["style"] == style]
            sender = matching_users[0] if matching_users else random.choice(USERS)
        else:
            # Short chat or natural commentary
            sender = random.choice(USERS)
            text = random.choice(SHORT_CHATTERS)
            
        # Reply logic: ~25% of messages reply to an earlier message within the last 15 messages
        reply_to_id = None
        if i >= 4 and random.random() < 0.25:
            lookback = random.randint(1, min(15, len(message_ids)))
            reply_to_id = message_ids[-lookback]
            
        is_edited = random.random() < 0.05
        edited_at = (current_time + timedelta(minutes=1)).isoformat() if is_edited else "NULL"
        
        messages.append({
            "id": msg_id,
            "sender_id": sender["id"],
            "sender_name": sender["name"],
            "content": text.replace("'", "''"),
            "reply_to": reply_to_id,
            "is_edited": is_edited,
            "edited_at": edited_at,
            "created_at": current_time.isoformat()
        })
        message_ids.append(msg_id)

    # Let's write the SQL
    lines = []
    lines.append("-- Seeding 360 messages for Channel 'general' in Server 'nom-na'")
    lines.append("BEGIN;")
    lines.append("")
    
    # Insert messages in batches
    lines.append("-- 1. Insert Messages")
    for m in messages:
        reply_val = f"'{m['reply_to']}'" if m['reply_to'] else "NULL"
        edited_at_val = f"'{m['edited_at']}'" if m['is_edited'] else "NULL"
        lines.append(
            f"INSERT INTO messages (\"Id\", \"ChannelId\", \"SenderId\", \"Content\", \"ReplyToMessageId\", \"IsEdited\", \"EditedAt\", \"CreatedAt\") "
            f"VALUES ('{m['id']}', '{CHANNEL_ID}', '{m['sender_id']}', '{m['content']}', {reply_val}, {str(m['is_edited']).lower()}, {edited_at_val}, '{m['created_at']}');"
        )
        
    lines.append("")
    lines.append("-- 2. Pin 2 important messages to test Jump-To-Pinned-Message")
    # Message #50 and Message #220
    pinned_msg_1 = messages[45]["id"]
    pinned_msg_2 = messages[210]["id"]
    lines.append(
        f"INSERT INTO channel_pinned_messages (\"Id\", \"ChannelId\", \"MessageId\", \"PinnedById\", \"PinnedAt\", \"OrderIndex\", \"CreatedAt\") "
        f"VALUES (gen_random_uuid(), '{CHANNEL_ID}', '{pinned_msg_1}', '{USERS[0]['id']}', NOW(), 1, NOW()) "
        f"ON CONFLICT (\"ChannelId\", \"MessageId\") DO NOTHING;"
    )
    lines.append(
        f"INSERT INTO channel_pinned_messages (\"Id\", \"ChannelId\", \"MessageId\", \"PinnedById\", \"PinnedAt\", \"OrderIndex\", \"CreatedAt\") "
        f"VALUES (gen_random_uuid(), '{CHANNEL_ID}', '{pinned_msg_2}', '{USERS[0]['id']}', NOW(), 2, NOW()) "
        f"ON CONFLICT (\"ChannelId\", \"MessageId\") DO NOTHING;"
    )
    
    lines.append("")
    lines.append("-- 3. Insert reactions on diverse messages")
    # Add ~50 reactions across messages
    reaction_count = 0
    sampled_indices = sorted(random.sample(range(len(messages)), 50))
    for idx in sampled_indices:
        m = messages[idx]
        react_users = random.sample(USERS, random.randint(1, 3))
        for ru in react_users:
            emoji = random.choice(REACTIONS)
            react_id = str(uuid.uuid4())
            lines.append(
                f"INSERT INTO message_reactions (\"Id\", \"MessageId\", \"UserId\", \"Emoji\", \"CreatedAt\") "
                f"VALUES ('{react_id}', '{m['id']}', '{ru['id']}', '{emoji}', '{m['created_at']}') "
                f"ON CONFLICT (\"MessageId\", \"UserId\", \"Emoji\") DO NOTHING;"
            )
            reaction_count += 1
            
    lines.append("")
    lines.append("COMMIT;")
    
    with open("/home/vanmuzic/Projects/NomNaReal/scripts/seed_channel_messages.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
        
    print(f"Generated {len(messages)} messages, 2 pinned messages, {reaction_count} reactions to /home/vanmuzic/Projects/NomNaReal/scripts/seed_channel_messages.sql")

if __name__ == "__main__":
    generate_sql()
