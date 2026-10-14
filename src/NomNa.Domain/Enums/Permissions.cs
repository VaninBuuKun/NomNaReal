namespace NomNa.Domain.Enums;

/// <summary>
/// Bitmask 64-bit đại diện cho toàn bộ quyền hạn trong Server và Channel (chuẩn Discord).
/// Dùng [Flags] cho phép gộp quyền (|), loại bỏ quyền (& ~), và kiểm tra quyền (&).
/// </summary>
[Flags]
public enum Permissions : long
{
    None = 0L,

    // ==========================================
    // 1. General Server Permissions
    // ==========================================
    Administrator          = 1L << 0,  // Bypass toàn bộ check quyền
    ManageServer           = 1L << 1,  // Đổi tên server, icon, cài đặt
    ManageRoles            = 1L << 2,  // Tạo, sửa, xóa, gán role thấp hơn
    ManageChannels         = 1L << 3,  // Tạo, sửa, xóa channel & category
    KickMembers            = 1L << 4,  // Đuổi thành viên
    BanMembers             = 1L << 5,  // Cấm thành viên
    CreateInvite           = 1L << 6,  // Tạo link mời
    ChangeNickname         = 1L << 7,  // Tự đổi nickname bản thân
    ManageNicknames        = 1L << 8,  // Đổi nickname người khác

    // ==========================================
    // 2. Membership & Channel View
    // ==========================================
    ViewChannel            = 1L << 9,  // Xem được kênh (đọc tin hoặc nghe voice)

    // ==========================================
    // 3. Text Channel Permissions
    // ==========================================
    SendMessages           = 1L << 10, // Gửi tin nhắn
    SendMessagesInThreads  = 1L << 11, // Trả lời trong thread
    CreatePublicThreads    = 1L << 12, // Tạo thread công khai
    CreatePrivateThreads   = 1L << 13, // Tạo thread riêng tư
    EmbedLinks             = 1L << 14, // Link hiển thị rich preview
    AttachFiles            = 1L << 15, // Upload file / ảnh
    AddReactions           = 1L << 16, // Thả emoji reaction
    UseExternalEmojis      = 1L << 17, // Dùng emoji server khác
    MentionEveryone        = 1L << 18, // Tag @everyone / @here
    ManageMessages         = 1L << 19, // Xóa hoặc pin tin nhắn người khác
    ManageThreads          = 1L << 20, // Xóa, archive thread
    ReadMessageHistory     = 1L << 21, // Đọc lịch sử tin nhắn cũ

    // ==========================================
    // 4. Voice Channel Permissions
    // ==========================================
    Connect                = 1L << 22, // Kết nối vào kênh voice
    Speak                  = 1L << 23, // Nói trong voice
    MuteMembers            = 1L << 24, // Tắt mic người khác
    DeafenMembers          = 1L << 25, // Tắt tai nghe người khác
    MoveMembers            = 1L << 26, // Chuyển người khác sang kênh voice khác

    // ==========================================
    // Presets thông dụng
    // ==========================================
    All = ~0L,


    /// <summary>
    /// Quyền mặc định thường cấp cho Role @everyone khi mới tạo Server.
    /// </summary>
    Default = ViewChannel 
            | SendMessages 
            | SendMessagesInThreads 
            | EmbedLinks 
            | AttachFiles 
            | ReadMessageHistory 
            | AddReactions 
            | Connect 
            | Speak 
            | CreateInvite 
            | ChangeNickname
}
