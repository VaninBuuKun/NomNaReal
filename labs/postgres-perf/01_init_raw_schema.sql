-- ==============================================================================
-- NomNa PostgreSQL Performance Lab — Raw Schema (Unindexed Baseline)
-- Mục tiêu: Tạo bảng dữ liệu thô phục vụ học tập, đo đạc EXPLAIN ANALYZE
-- TUYỆT ĐỐI CHƯA TẠO BẤT KỲ SECONDARY INDEX NÀO (Chỉ giữ PK để định danh).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Users (Mẫu 10 users đại diện)
CREATE TABLE IF NOT EXISTS users (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "DisplayName" VARCHAR(100) NOT NULL,
    "UserName" VARCHAR(100),
    "Email" VARCHAR(256),
    "AvatarUrl" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng Servers
CREATE TABLE IF NOT EXISTS servers (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "OwnerId" UUID NOT NULL REFERENCES users("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng Channels
CREATE TABLE IF NOT EXISTS channels (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ServerId" UUID REFERENCES servers("Id") ON DELETE CASCADE,
    "Name" VARCHAR(100) NOT NULL,
    "Type" INT NOT NULL DEFAULT 0, -- 0: Text, 1: Voice, 2: DM
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bảng Messages (BẢNG TRỌNG TÂM ĐỂ TRA TẤN HIỆU NĂNG)
-- Chú ý: Cố tình KHÔNG tạo index trên ("ChannelId", "CreatedAt"), KHÔNG index SenderId, KHÔNG index Content!
CREATE TABLE IF NOT EXISTS messages (
    "Id" UUID PRIMARY KEY,
    "ChannelId" UUID NOT NULL REFERENCES channels("Id") ON DELETE CASCADE,
    "SenderId" UUID NOT NULL REFERENCES users("Id") ON DELETE CASCADE,
    "Content" TEXT NOT NULL,
    "ReplyToMessageId" UUID,
    "IsEdited" BOOLEAN NOT NULL DEFAULT FALSE,
    "EditedAt" TIMESTAMPTZ,
    "DeletedAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL,
    "UpdatedAt" TIMESTAMPTZ NOT NULL
);

-- Seed sẵn các Users & Channels cơ bản cố định
INSERT INTO users ("Id", "DisplayName", "UserName", "Email") VALUES
    ('e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9', 'Alex Rivers', 'alex', 'alex@nomna.local'),
    ('0b01c44d-8fe5-41d8-aed8-b16881305212', 'Minh Dev', 'minh', 'minh@nomna.local'),
    ('9c05b2dc-8147-48c2-92c7-5891cb586840', 'Van Nguyen', 'van', 'van@nomna.local'),
    ('cdd69e15-714f-44a1-8f27-27802116de6f', 'Kushina Uzumaki', 'kushina', 'kushina@nomna.local'),
    ('8314bf99-163f-4b69-ab79-6e42e7bedd97', 'Lan Huong QA', 'lanhuong', 'lanhuong@nomna.local'),
    ('a60cfe73-8be9-4985-ba8d-063ac8b930ec', 'Shizuka PM', 'shizuka', 'shizuka@nomna.local'),
    ('f4167276-4e39-4b5d-97bd-3275558ebe9c', 'Tech Lead John', 'john', 'john@nomna.local'),
    ('11111111-1111-1111-1111-111111111111', 'Sarah Connor', 'sarah', 'sarah@nomna.local'),
    ('22222222-2222-2222-2222-222222222222', 'Bruce Wayne', 'bruce', 'bruce@nomna.local'),
    ('33333333-3333-3333-3333-333333333333', 'Clark Kent', 'clark', 'clark@nomna.local')
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO servers ("Id", "Name", "Description", "OwnerId") VALUES
    ('01a13b13-d4a3-7a7f-a963-4a3d996ae25c', 'NomNa Lab Server', 'Lab server for testing PostgreSQL optimization', 'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9')
ON CONFLICT ("Id") DO NOTHING;

-- 2 Channels chính: 1 kênh cực đông (85% tin nhắn) và 1 kênh phụ (15% tin nhắn)
INSERT INTO channels ("Id", "ServerId", "Name", "Type") VALUES
    ('01a16f00-d847-7434-8f3c-7c21edb3ecf9', '01a13b13-d4a3-7a7f-a963-4a3d996ae25c', 'general-lounge', 0),
    ('01a16f00-d847-7434-8f3c-7c21edb3ecfa', '01a13b13-d4a3-7a7f-a963-4a3d996ae25c', 'random-chat', 0)
ON CONFLICT ("Id") DO NOTHING;

