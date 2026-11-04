#!/usr/bin/env python3
"""
NomNa High-Volume Data Seeding Engine
====================================
Generates realistic, high-volume datasets (10,000 to 1,000,000+ messages)
for benchmarking PostgreSQL query performance, index efficacy, and k6 load tests.

Usage:
  python3 scripts/seed_large_dataset.py --messages 100000 --output scripts/large_seed.sql
  # Or directly pipe into Docker Postgres container:
  python3 scripts/seed_large_dataset.py --messages 100000 | docker exec -i bench_postgres psql -U db_user -d NomNa
"""

import sys
import uuid
import random
import argparse
from datetime import datetime, timedelta, timezone

SAMPLE_USERS = [
    {"id": "e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9", "name": "Alex Rivers", "username": "alex"},
    {"id": "0b01c44d-8fe5-41d8-aed8-b16881305212", "name": "Minh Dev", "username": "minh"},
    {"id": "9c05b2dc-8147-48c2-92c7-5891cb586840", "name": "Van Nguyen", "username": "van"},
    {"id": "cdd69e15-714f-44a1-8f27-27802116de6f", "name": "Kushina Uzumaki", "username": "kushina"},
    {"id": "8314bf99-163f-4b69-ab79-6e42e7bedd97", "name": "Lan Huong QA", "username": "lanhuong"},
    {"id": "a60cfe73-8be9-4985-ba8d-063ac8b930ec", "name": "Shizuka PM", "username": "shizuka"},
    {"id": "f4167276-4e39-4b5d-97bd-3275558ebe9c", "name": "Tech Lead John", "username": "john"},
    {"id": "11111111-1111-1111-1111-111111111111", "name": "Sarah Connor", "username": "sarah"},
    {"id": "22222222-2222-2222-2222-222222222222", "name": "Bruce Wayne", "username": "bruce"},
    {"id": "33333333-3333-3333-3333-333333333333", "name": "Clark Kent", "username": "clark"},
]

CHAT_TEMPLATES = [
    "Xin chào cả nhà, hôm nay deploy release v2.0 nhé!",
    "Mọi người kiểm tra lại PR giúp em với, đã fix N+1 query rồi ạ.",
    "SignalR WebSocket kết nối mượt quá anh em ơi 🚀",
    "Có ai test thử tính năng Keyset Pagination trên DB 1 triệu dòng chưa?",
    "Index B-Tree (ChannelId, CreatedAt) giúp query giảm từ 500ms xuống còn 2ms đó.",
    "K6 benchmark vừa chạy qua 300 VUs, P95 ổn định dưới 150ms rồi nha.",
    "Chiều nay 3h họp retrospective sprint nhé cả team.",
    "Ủng hộ cà phê sáng cho dev nào vừa thức đêm fix bug!",
    "Bật AddDbContextPool trong .NET 9 giảm allocation đến 80% luôn.",
    "Có ai bị lỗi timeout 504 khi tải 100k messages không?",
    "Nhớ dùng AsNoTracking() cho tất cả các query đọc nhé mọi người.",
    "Review giúp em PR tối ưu hóa SignalR fanout với Redis backplane với.",
    "Quá đỉnh luôn bạn ơi! 🔥",
    "Chuẩn rồi đấy, merge vào main luôn đi.",
    "Đồng ý với quan điểm này nha 👍",
    "Tuyệt vời!",
    "Let's gooo!",
    "Check lại giúp mình case này với nhé.",
    "Có vấn đề gì về permission không bạn?",
    "Hôm nay server chạy êm ru, CPU chỉ 15%."
]

def generate_bulk_sql(total_messages=100000, batch_size=2000, output_file=None):
    out = open(output_file, "w", encoding="utf-8") if output_file else sys.stdout

    out.write("-- ==========================================================\n")
    out.write(f"-- NomNa Bulk Seed Generator: {total_messages:,} Messages\n")
    out.write(f"-- Generated At: {datetime.now(timezone.utc).isoformat()}\n")
    out.write("-- ==========================================================\n\n")
    out.write("SET statement_timeout = 0;\n")
    out.write("BEGIN;\n\n")

    out.write("-- 1. Ensure Target Channels and Default Server Exist\n")
    out.write("""
DO $$
DECLARE
    v_server_id uuid;
    v_user_id uuid;
BEGIN
    SELECT "Id" INTO v_server_id FROM servers LIMIT 1;
    IF v_server_id IS NULL THEN
        SELECT "Id" INTO v_user_id FROM users LIMIT 1;
        IF v_user_id IS NULL THEN
            v_user_id := 'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9';
        END IF;
        
        v_server_id := '01a13b13-d4a3-7a7f-a963-4a3d996ae25c';
        INSERT INTO servers ("Id", "Name", "Description", "OwnerId", "CreatedAt")
        VALUES (v_server_id, 'NomNa Benchmark Server', 'Dedicated Server for High-Volume Benchmarks', v_user_id, NOW())
        ON CONFLICT ("Id") DO NOTHING;
    END IF;

    -- Ensure benchmark channel exists
    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "CreatedAt")
    VALUES ('01a16f00-d847-7434-8f3c-7c21edb3ecf9', v_server_id, 'benchmark-general', 0, NOW())
    ON CONFLICT ("Id") DO NOTHING;

    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "CreatedAt")
    VALUES ('01a16f00-d847-7434-8f3c-7c21edb3ecfa', v_server_id, 'benchmark-high-traffic', 0, NOW())
    ON CONFLICT ("Id") DO NOTHING;
END $$;
\n""")

    target_channel_id = "01a16f00-d847-7434-8f3c-7c21edb3ecf9"
    secondary_channel_id = "01a16f00-d847-7434-8f3c-7c21edb3ecfa"

    out.write("-- 2. Bulk Inserting Messages with Batching\n")
    
    base_time = datetime.now(timezone.utc) - timedelta(days=90)
    current_time = base_time
    time_step = timedelta(seconds=max(1, int((90 * 86400) / total_messages)))

    recent_msg_ids = []
    batch_rows = []

    for i in range(1, total_messages + 1):
        msg_id = str(uuid.uuid4())
        sender = random.choice(SAMPLE_USERS)
        content = random.choice(CHAT_TEMPLATES)
        
        # 85% traffic into main channel, 15% into secondary channel
        channel_id = target_channel_id if random.random() < 0.85 else secondary_channel_id

        # 15% reply probability
        reply_to = "NULL"
        if len(recent_msg_ids) > 10 and random.random() < 0.15:
            reply_to = f"'{random.choice(recent_msg_ids[-20:])}'"

        current_time += time_step
        time_str = current_time.isoformat()
        clean_content = content.replace("'", "''")

        batch_rows.append(
            f"('{msg_id}', '{channel_id}', '{sender['id']}', '{clean_content}', {reply_to}, false, NULL, NULL, '{time_str}', '{time_str}')"
        )
        recent_msg_ids.append(msg_id)
        if len(recent_msg_ids) > 50:
            recent_msg_ids.pop(0)

        if len(batch_rows) >= batch_size:
            out.write('INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "ReplyToMessageId", "IsEdited", "EditedAt", "DeletedAt", "CreatedAt", "UpdatedAt") VALUES\n')
            out.write(",\n".join(batch_rows))
            out.write(";\n\n")
            batch_rows.clear()
            if i % 20000 == 0:
                out.write(f"-- Progress: {i:,} / {total_messages:,} messages generated...\n")

    if batch_rows:
        out.write('INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "ReplyToMessageId", "IsEdited", "EditedAt", "DeletedAt", "CreatedAt", "UpdatedAt") VALUES\n')
        out.write(",\n".join(batch_rows))
        out.write(";\n\n")

    out.write("-- 3. Refreshing PostgreSQL Table Statistics\n")
    out.write("ANALYZE messages;\n")
    out.write("COMMIT;\n")

    if output_file:
        out.close()
        print(f"Successfully generated {total_messages:,} messages into: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NomNa High-Volume Message Seeder")
    parser.add_argument("--messages", type=int, default=100000, help="Total number of messages to generate (default: 100,000)")
    parser.add_argument("--batch-size", type=int, default=2000, help="SQL Batch Insert size (default: 2,000)")
    parser.add_argument("--output", type=str, default=None, help="Output SQL file path (prints to stdout if omitted)")
    args = parser.parse_args()

    generate_bulk_sql(total_messages=args.messages, batch_size=args.batch_size, output_file=args.output)
