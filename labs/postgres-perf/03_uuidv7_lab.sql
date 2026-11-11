-- ==============================================================================
-- NomNa PostgreSQL Lab — Bảng ms2 sử dụng UUIDv7 (Time-Ordered UUID RFC 9562)
-- Mục tiêu: So sánh trực tiếp tốc độ INSERT, độ phân mảnh B-Tree Index (Bloat),
-- dung lượng Index và hiệu quả bộ nhớ đệm giữa UUIDv4 (bảng messages) và UUIDv7 (bảng ms2).
-- ==============================================================================

-- 1. Cài đặt extension pgstattuple để soi độ phân mảnh (fragmentation / leaf density) bên trong B-Tree Index
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- 2. Hàm sinh UUIDv7 chuẩn RFC 9562 (48-bit Unix Timestamp ms + 4-bit version 7 + 2-bit variant + 74-bit random)
-- Cho phép truyền vào mốc thời gian p_timestamp để sinh dữ liệu lịch sử tăng dần chuẩn xác!
CREATE OR REPLACE FUNCTION uuid_generate_v7(p_timestamp TIMESTAMPTZ DEFAULT clock_timestamp())
RETURNS UUID
LANGUAGE sql
PARALLEL SAFE
AS $$
    SELECT encode(
        set_bit(
            set_bit(
                overlay(
                    uuid_send(gen_random_uuid())
                    PLACING substring(int8send(floor(extract(epoch FROM p_timestamp) * 1000)::bigint) FROM 3)
                    FROM 1 FOR 6
                ),
                52, 1
            ),
            53, 1
        ),
        'hex'
    )::uuid;
$$;

-- 3. Tạo bảng ms2 có cấu trúc giống hệt bảng messages nhưng dùng cho UUIDv7
CREATE TABLE IF NOT EXISTS ms2 (
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

-- 4. Stored Procedure sinh dữ liệu nối tiếp (Incremental) cho bảng ms2 với UUIDv7
CREATE OR REPLACE PROCEDURE seed_ms2_uuidv7(p_count INT DEFAULT 1000000)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_max_time TIMESTAMPTZ;
    v_batch_size INT := 50000;
    v_batches INT;
    v_current_batch INT;
    v_time_step INTERVAL := INTERVAL '2.5 seconds';
    v_total_before BIGINT;
    v_total_after BIGINT;
    v_duration INTERVAL;
    v_t0 TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*), MAX("CreatedAt") INTO v_total_before, v_max_time FROM ms2;
    
    IF v_max_time IS NOT NULL THEN
        v_start_time := v_max_time + INTERVAL '2 seconds';
        RAISE NOTICE '==> [ms2 UUIDv7 - INCREMENTAL MODE] Đã có % tin nhắn. Bắt đầu sinh tiếp nối từ %', v_total_before, v_start_time;
    ELSE
        v_start_time := NOW() - INTERVAL '90 days';
        RAISE NOTICE '==> [ms2 UUIDv7 - FRESH SEED MODE] Bảng rỗng. Bắt đầu sinh từ 90 ngày trước: %', v_start_time;
    END IF;

    v_batches := CEIL(p_count::NUMERIC / v_batch_size);
    v_t0 := clock_timestamp();

    FOR v_current_batch IN 1..v_batches LOOP
        INSERT INTO ms2 ("Id", "ChannelId", "SenderId", "Content", "ReplyToMessageId", "IsEdited", "EditedAt", "DeletedAt", "CreatedAt", "UpdatedAt")
        SELECT
            -- Sinh UUIDv7 tăng dần tuần tự theo đúng mốc thời gian của tin nhắn!
            uuid_generate_v7(v_start_time + (((v_current_batch - 1) * v_batch_size + s) * v_time_step)),
            CASE WHEN random() < 0.85 
                 THEN '01a16f00-d847-7434-8f3c-7c21edb3ecf9'::UUID 
                 ELSE '01a16f00-d847-7434-8f3c-7c21edb3ecfa'::UUID 
            END,
            (ARRAY[
                'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9'::UUID,
                'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9'::UUID,
                'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9'::UUID,
                'e94fae4e-b2f8-4d7b-b60a-8fc50df4f8f9'::UUID,
                '0b01c44d-8fe5-41d8-aed8-b16881305212'::UUID,
                '0b01c44d-8fe5-41d8-aed8-b16881305212'::UUID,
                '9c05b2dc-8147-48c2-92c7-5891cb586840'::UUID,
                'cdd69e15-714f-44a1-8f27-27802116de6f'::UUID,
                '8314bf99-163f-4b69-ab79-6e42e7bedd97'::UUID,
                'a60cfe73-8be9-4985-ba8d-063ac8b930ec'::UUID,
                'f4167276-4e39-4b5d-97bd-3275558ebe9c'::UUID,
                '11111111-1111-1111-1111-111111111111'::UUID,
                '22222222-2222-2222-2222-222222222222'::UUID,
                '33333333-3333-3333-3333-333333333333'::UUID
            ])[floor(random() * 14 + 1)::INT],
            (ARRAY[
                'Xin chào cả nhà, hôm nay hệ thống chạy mượt quá!',
                'Mọi người kiểm tra giúp em câu query EXPLAIN ANALYZE với, đang bị Seq Scan.',
                'Bật Index B-Tree cái là thời gian query giảm từ 500ms xuống còn 1ms liền.',
                'Có ai test thử tính năng Keyset Pagination trên DB 1 triệu dòng chưa?',
                'PostgreSQL 16 MVCC đỉnh thật, cơ chế HOT update giúp giảm bloat rõ rệt.',
                'K6 benchmark vừa test qua 300 VUs, P95 ổn định dưới 150ms rồi nha.',
                'Chiều nay 3h họp review sprint tối ưu hóa cơ sở dữ liệu nhé.',
                'Anh em nhớ cẩn thận với câu lệnh LIKE %keyword% trên bảng triệu dòng nhé, dễ chết CPU lắm.',
                'Vừa deploy bản vá lỗi N+1 query lên server rồi nha mọi người.',
                'Thử chạy VACUUM ANALYZE lại xem plan của query có đổi từ Seq Scan sang Index Scan không?',
                'Quá chuẩn luôn bạn ơi! 🔥',
                'Đồng ý với quan điểm này nha 👍',
                'Tuyệt vời!',
                'Let''s gooo!',
                'Check lại giúp mình đoạn code này với nhé.',
                'Index B-Tree trên (ChannelId, CreatedAt) là chuẩn bài cho ứng dụng chat.',
                'Dùng Hash Aggregate cho câu lệnh GROUP BY nhanh hơn rõ ràng.',
                'Tin nhắn này là test case đặc biệt chứa từ khóa debug_perf_target.',
                'Server chạy êm ru, CPU chỉ 15% thôi.',
                'Ai làm tách cà phê chiều không anh em ơi ☕?'
            ])[floor(random() * 20 + 1)::INT],
            NULL,
            FALSE,
            NULL,
            NULL,
            v_start_time + (((v_current_batch - 1) * v_batch_size + s) * v_time_step),
            v_start_time + (((v_current_batch - 1) * v_batch_size + s) * v_time_step)
        FROM generate_series(1, LEAST(v_batch_size, p_count - (v_current_batch - 1) * v_batch_size)) AS s;

        COMMIT;
        RAISE NOTICE '    -> [ms2 UUIDv7] Đã nạp % / % tin nhắn...', LEAST(v_current_batch * v_batch_size, p_count), p_count;
    END LOOP;

    v_duration := clock_timestamp() - v_t0;

    RAISE NOTICE '==> Chạy ANALYZE ms2 để cập nhật thống kê cho Query Planner...';
    ANALYZE ms2;

    SELECT COUNT(*) INTO v_total_after FROM ms2;
    RAISE NOTICE '=============================================================';
    RAISE NOTICE '✅ [ms2 UUIDv7] HOÀN TẤT TRONG: %', v_duration;
    RAISE NOTICE '📊 Tổng số tin nhắn trong bảng ms2 hiện tại: % dòng', v_total_after;
    RAISE NOTICE '=============================================================';
END;
$$;

