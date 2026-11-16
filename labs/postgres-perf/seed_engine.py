#!/usr/bin/env python3
"""
NomNa High-Speed Incremental Seeding Engine
===========================================
- Sinh 1.000.000 đến 10.000.000+ tin nhắn bằng PostgreSQL COPY protocol (50.000 - 100.000 msg/s).
- Hỗ trợ INCREMENTAL: Mỗi lần chạy tự động nhận diện mốc thời gian cũ để cộng dồn thêm data.
- Phân phối thực tế (Pareto 80/20, tiếng Việt, tiếng Anh, reply threads).

Sử dụng:
  # Sinh 1 triệu dòng và nạp thẳng vào container:
  python3 labs/postgres-perf/seed_engine.py --messages 1000000

  # Lần sau chạy tiếp để cộng dồn thêm 1 triệu dòng nữa:
  python3 labs/postgres-perf/seed_engine.py --messages 1000000
"""

import sys
import io
import uuid
import random
import time
import argparse
from datetime import datetime, timedelta, timezone

SAMPLE_USERS = [
    "e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9", # Alex (Super active)
    "0b01c44d-8fe5-41d8-aed8-b16881305212", # Minh Dev (Active)
    "9c05b2dc-8147-48c2-92c7-5891cb586840", # Van Nguyen (Active)
    "cdd69e15-714f-44a1-8f27-27802116de6f", # Kushina
    "8314bf99-163f-4b69-ab79-6e42e7bedd97", # Lan Huong
    "a60cfe73-8be9-4985-ba8d-063ac8b930ec", # Shizuka
    "f4167276-4e39-4b5d-97bd-3275558ebe9c", # John
    "11111111-1111-1111-1111-111111111111", # Sarah
    "22222222-2222-2222-2222-222222222222", # Bruce
    "33333333-3333-3333-3333-333333333333", # Clark
]

# Trọng số gửi tin (Pareto 80/20: Top 3 user gửi ~75% tin nhắn)
USER_WEIGHTS = [40, 20, 15, 5, 5, 4, 4, 3, 2, 2]

CHAT_TEMPLATES = [
    "Xin chào cả nhà, hôm nay hệ thống chạy mượt quá!",
    "Mọi người kiểm tra giúp em câu query EXPLAIN ANALYZE với, đang bị Seq Scan.",
    "Bật Index B-Tree cái là thời gian query giảm từ 500ms xuống còn 1ms liền.",
    "Có ai test thử tính năng Keyset Pagination trên DB 1 triệu dòng chưa?",
    "PostgreSQL 16 MVCC đỉnh thật, cơ chế HOT update giúp giảm bloat rõ rệt.",
    "K6 benchmark vừa test qua 300 VUs, P95 ổn định dưới 150ms rồi nha.",
    "Chiều nay 3h họp review sprint tối ưu hóa cơ sở dữ liệu nhé.",
    "Anh em nhớ cẩn thận với câu lệnh LIKE %keyword% trên bảng triệu dòng nhé, dễ chết CPU lắm.",
    "Vừa deploy bản vá lỗi N+1 query lên server rồi nha mọi người.",
    "Thử chạy VACUUM ANALYZE lại xem plan của query có đổi từ Seq Scan sang Index Scan không?",
    "Quá chuẩn luôn bạn ơi! 🔥",
    "Đồng ý với quan điểm này nha 👍",
    "Tuyệt vời!",
    "Let's gooo!",
    "Check lại giúp mình đoạn code này với nhé.",
    "Index B-Tree trên (ChannelId, CreatedAt) là chuẩn bài cho ứng dụng chat.",
    "Dùng Hash Aggregate cho câu lệnh GROUP BY nhanh hơn rõ ràng.",
    "Tin nhắn này là test case đặc biệt chứa từ khóa debug_perf_target.",
    "Server chạy êm ru, CPU chỉ 15% thôi.",
    "Ai làm tách cà phê chiều không anh em ơi ☕?"
]

CHANNELS = [
    "01a16f00-d847-7434-8f3c-7c21edb3ecf9", # 85% traffic (General Lounge)
    "01a16f00-d847-7434-8f3c-7c21edb3ecfa", # 15% traffic (Random Chat)
]

def generate_csv_stream(start_time, total_messages, chunk_size=50000):
    """
    Sinh các khối TSV/CSV trong RAM dạng Generator để stream thẳng vào PostgreSQL COPY
    """
    current_time = start_time
    # Giãn cách mỗi tin nhắn trung bình 2 - 5 giây
    time_step = timedelta(milliseconds=2500)
    
    recent_msg_ids = []
    
    generated = 0
    while generated < total_messages:
        buffer = io.StringIO()
        current_chunk = min(chunk_size, total_messages - generated)
        
        for _ in range(current_chunk):
            msg_id = str(uuid.uuid4())
            sender_id = random.choices(SAMPLE_USERS, weights=USER_WEIGHTS, k=1)[0]
            channel_id = CHANNELS[0] if random.random() < 0.85 else CHANNELS[1]
            content = random.choice(CHAT_TEMPLATES)
            
            # 15% cơ hội là tin nhắn trả lời (Reply)
            reply_to = ""
            if len(recent_msg_ids) > 10 and random.random() < 0.15:
                reply_to = random.choice(recent_msg_ids[-20:])
                
            current_time += time_step
            time_str = current_time.strftime("%Y-%m-%d %H:%M:%S.%f%z")
            
            # Format: Id, ChannelId, SenderId, Content, ReplyToMessageId, IsEdited, EditedAt, DeletedAt, CreatedAt, UpdatedAt
            # Tab-delimited (TSV) cho COPY
            clean_content = content.replace("\t", " ").replace("\n", " ")
            row = f"{msg_id}\t{channel_id}\t{sender_id}\t{clean_content}\t{reply_to}\tf\t\\N\t\\N\t{time_str}\t{time_str}\n"
            buffer.write(row)
            
            recent_msg_ids.append(msg_id)
            if len(recent_msg_ids) > 100:
                recent_msg_ids.pop(0)
                
        generated += current_chunk
        buffer.seek(0)
        yield buffer, generated, current_time

def main():
    parser = argparse.ArgumentParser(description="NomNa High-Speed Incremental PostgreSQL Seeder")
    parser.add_argument("--messages", type=int, default=1000000, help="Số lượng tin nhắn cần sinh (Mặc định: 1.000.000)")
    parser.add_argument("--host", type=str, default="localhost", help="Postgres Host (Mặc định: localhost)")
    parser.add_argument("--port", type=int, default=5433, help="Postgres Port (Mặc định: 5433)")
    parser.add_argument("--db", type=str, default="NomNaLab", help="Database Name (Mặc định: NomNaLab)")
    parser.add_argument("--user", type=str, default="lab_user", help="User (Mặc định: lab_user)")
    parser.add_argument("--password", type=str, default="lab_password", help="Password (Mặc định: lab_password)")
    args = parser.parse_args()

    try:
        import psycopg2
    except ImportError:
        print("[-] Lỗi: Cần thư viện psycopg2 để stream dữ liệu siêu tốc.")
        print("    Vui lòng cài đặt: pip install psycopg2-binary")
        sys.exit(1)

    print("=============================================================")
    print(f"🚀 NomNa High-Speed Incremental Seeder: {args.messages:,} Messages")
    print(f"🎯 Target: {args.user}@{args.host}:{args.port}/{args.db}")
    print("=============================================================")

    try:
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            dbname=args.db,
            user=args.user,
            password=args.password
        )
        conn.autocommit = False
    except Exception as e:
        print(f"[-] Không thể kết nối tới PostgreSQL: {e}")
        print("    Hãy chắc chắn container nomna_postgres_lab đang chạy (docker compose -f labs/postgres-perf/docker-compose.lab.yml up -d)!")
        sys.exit(1)

    cursor = conn.cursor()

    # 1. Kiểm tra số lượng bản ghi hiện có & Watermark thời gian
    cursor.execute('SELECT COUNT(*), MAX("CreatedAt") FROM messages;')
    existing_count, max_created_at = cursor.fetchone()
    
    print(f"[*] Trạng thái hiện tại trong DB:")
    print(f"    - Tổng tin nhắn hiện có : {existing_count:,}")
    
    if max_created_at:
        start_time = max_created_at + timedelta(seconds=2)
        print(f"    - Tin nhắn gần nhất lúc  : {max_created_at}")
        print(f"    - [INCREMENTAL MODE] Sẽ sinh tiếp nối từ: {start_time}")
    else:
        start_time = datetime.now(timezone.utc) - timedelta(days=90)
        print(f"    - [FRESH SEED MODE] Bảng rỗng. Bắt đầu sinh từ 90 ngày trước: {start_time}")

    print("\n[*] Bắt đầu nạp dữ liệu bằng PostgreSQL COPY protocol...")
    start_bench = time.time()
    
    copy_sql = """
    COPY messages ("Id", "ChannelId", "SenderId", "Content", "ReplyToMessageId", "IsEdited", "EditedAt", "DeletedAt", "CreatedAt", "UpdatedAt")
    FROM STDIN WITH (FORMAT text, NULL '\\N');
    """

    for buffer, progress, last_time in generate_csv_stream(start_time, args.messages):
        t0 = time.time()
        cursor.copy_expert(copy_sql, buffer)
        elapsed = time.time() - t0
        speed = int(buffer.tell() / (elapsed if elapsed > 0 else 0.001) / 1024)
        print(f"    -> Đã nạp {progress:,} / {args.messages:,} tin nhắn... ({speed} KB/s)")

    print("[*] Đang Commit transaction xuống đĩa...")
    conn.commit()

    print("[*] Chạy ANALYZE messages để cập nhật thống kê cho Query Planner...")
    cursor.execute("ANALYZE messages;")
    conn.commit()

    total_time = time.time() - start_bench
    rps = int(args.messages / total_time)

    cursor.execute('SELECT COUNT(*) FROM messages;')
    total_count = cursor.fetchone()[0]

    cursor.execute("SELECT pg_size_pretty(pg_total_relation_size('messages'));")
    table_size = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    print("\n=============================================================")
    print(f"✅ HOÀN TẤT TRONG: {total_time:.2f} giây! (Tốc độ: {rps:,} msg/s)")
    print(f"📊 Tổng số tin nhắn trong DB hiện tại : {total_count:,} dòng")
    print(f"💾 Dung lượng bảng messages trên đĩa  : {table_size}")
    print("=============================================================")
    print("👉 Bây giờ bạn có thể gõ ./labs/postgres-perf/connect-lab.sh để bắt đầu query!")

if __name__ == "__main__":
    main()

