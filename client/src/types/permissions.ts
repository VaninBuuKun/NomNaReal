/**
 * 64-bit Bitmask permissions mirroring NomNa.Domain.Enums.Permissions.
 * Uses BigInt (1n << xn) to ensure 64-bit integer precision in JavaScript.
 */
export const Permissions = {
  None: 0n,

  // General Server
  Administrator: 1n << 0n,
  ManageServer: 1n << 1n,
  ManageRoles: 1n << 2n,
  ManageChannels: 1n << 3n,
  KickMembers: 1n << 4n,
  BanMembers: 1n << 5n,
  CreateInvite: 1n << 6n,
  ChangeNickname: 1n << 7n,
  ManageNicknames: 1n << 8n,

  // Channel & View
  ViewChannel: 1n << 9n,

  // Text Channel
  SendMessages: 1n << 10n,
  SendMessagesInThreads: 1n << 11n,
  CreatePublicThreads: 1n << 12n,
  CreatePrivateThreads: 1n << 13n,
  EmbedLinks: 1n << 14n,
  AttachFiles: 1n << 15n,
  AddReactions: 1n << 16n,
  UseExternalEmojis: 1n << 17n,
  MentionEveryone: 1n << 18n,
  ManageMessages: 1n << 19n,
  ManageThreads: 1n << 20n,
  ReadMessageHistory: 1n << 21n,

  // Voice Channel
  Connect: 1n << 22n,
  Speak: 1n << 23n,
  MuteMembers: 1n << 24n,
  DeafenMembers: 1n << 25n,
  MoveMembers: 1n << 26n,

  // Presets
  All: ~0n,
  Default:
    (1n << 9n) | // ViewChannel
    (1n << 10n) | // SendMessages
    (1n << 11n) | // SendMessagesInThreads
    (1n << 14n) | // EmbedLinks
    (1n << 15n) | // AttachFiles
    (1n << 16n) | // AddReactions
    (1n << 21n) | // ReadMessageHistory
    (1n << 22n) | // Connect
    (1n << 23n) | // Speak
    (1n << 6n) | // CreateInvite
    (1n << 7n), // ChangeNickname
} as const;

export type PermissionKey = keyof typeof Permissions;

export interface PermissionDefinition {
  key: PermissionKey;
  flag: bigint;
  name: string;
  description: string;
  category: "General" | "Membership" | "Text" | "Voice";
  dangerous?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // General Server
  {
    key: "Administrator",
    flag: Permissions.Administrator,
    name: "Quản trị viên (Administrator)",
    description: "Cấp toàn bộ quyền tối cao và bỏ qua mọi giới hạn phân quyền trên toàn server. Đây là quyền nguy hiểm.",
    category: "General",
    dangerous: true,
  },
  {
    key: "ManageServer",
    flag: Permissions.ManageServer,
    name: "Quản lý Server",
    description: "Cho phép thay đổi tên server, biểu tượng (icon) và các cài đặt chung.",
    category: "General",
  },
  {
    key: "ManageRoles",
    flag: Permissions.ManageRoles,
    name: "Quản lý Vai trò (Roles)",
    description: "Cho phép tạo, chỉnh sửa, xóa và gán các role có thứ bậc thấp hơn.",
    category: "General",
    dangerous: true,
  },
  {
    key: "ManageChannels",
    flag: Permissions.ManageChannels,
    name: "Quản lý Kênh",
    description: "Cho phép tạo mới, đổi tên, chỉnh sửa hoặc xóa kênh.",
    category: "General",
  },

  // Membership
  {
    key: "KickMembers",
    flag: Permissions.KickMembers,
    name: "Đuổi thành viên",
    description: "Cho phép đuổi thành viên có role thấp hơn ra khỏi server.",
    category: "Membership",
  },
  {
    key: "BanMembers",
    flag: Permissions.BanMembers,
    name: "Cấm thành viên",
    description: "Cho phép cấm vĩnh viễn thành viên có role thấp hơn vào lại server.",
    category: "Membership",
    dangerous: true,
  },
  {
    key: "CreateInvite",
    flag: Permissions.CreateInvite,
    name: "Tạo liên kết mời",
    description: "Cho phép tạo link mời bạn bè tham gia server.",
    category: "Membership",
  },
  {
    key: "ChangeNickname",
    flag: Permissions.ChangeNickname,
    name: "Đổi biệt danh cá nhân",
    description: "Cho phép tự đổi biệt danh của chính mình trong server này.",
    category: "Membership",
  },
  {
    key: "ManageNicknames",
    flag: Permissions.ManageNicknames,
    name: "Quản lý biệt danh",
    description: "Cho phép đổi biệt danh của các thành viên khác.",
    category: "Membership",
  },

  // View Channel
  {
    key: "ViewChannel",
    flag: Permissions.ViewChannel,
    name: "Xem kênh",
    description: "Cho phép đọc tin nhắn trong kênh văn bản hoặc nhìn thấy kênh thoại.",
    category: "Text",
  },

  // Text Channel
  {
    key: "SendMessages",
    flag: Permissions.SendMessages,
    name: "Gửi tin nhắn",
    description: "Cho phép gửi tin nhắn trong kênh văn bản.",
    category: "Text",
  },
  {
    key: "AttachFiles",
    flag: Permissions.AttachFiles,
    name: "Đính kèm tệp & hình ảnh",
    description: "Cho phép tải file, hình ảnh hoặc video lên kênh chat.",
    category: "Text",
  },
  {
    key: "EmbedLinks",
    flag: Permissions.EmbedLinks,
    name: "Chèn liên kết",
    description: "Cho phép hiển thị thẻ xem trước (rich preview) khi chia sẻ liên kết web.",
    category: "Text",
  },
  {
    key: "AddReactions",
    flag: Permissions.AddReactions,
    name: "Thả biểu cảm (Reaction)",
    description: "Cho phép thêm biểu cảm emoji mới vào tin nhắn.",
    category: "Text",
  },
  {
    key: "MentionEveryone",
    flag: Permissions.MentionEveryone,
    name: "Nhắc đến @everyone & @here",
    description: "Cho phép tag thông báo tới toàn bộ thành viên trong server.",
    category: "Text",
  },
  {
    key: "ManageMessages",
    flag: Permissions.ManageMessages,
    name: "Quản lý tin nhắn",
    description: "Cho phép xóa tin nhắn của người khác hoặc ghim tin nhắn quan trọng.",
    category: "Text",
  },
  {
    key: "ReadMessageHistory",
    flag: Permissions.ReadMessageHistory,
    name: "Đọc lịch sử tin nhắn",
    description: "Cho phép xem các tin nhắn đã gửi trước đó trong kênh.",
    category: "Text",
  },

  // Voice
  {
    key: "Connect",
    flag: Permissions.Connect,
    name: "Kết nối kênh thoại",
    description: "Cho phép tham gia vào phòng chat thoại.",
    category: "Voice",
  },
  {
    key: "Speak",
    flag: Permissions.Speak,
    name: "Phát biểu thoại",
    description: "Cho phép bật mic nói chuyện trong kênh thoại.",
    category: "Voice",
  },
  {
    key: "MuteMembers",
    flag: Permissions.MuteMembers,
    name: "Tắt mic người khác",
    description: "Cho phép tắt mic của thành viên khác trong phòng thoại.",
    category: "Voice",
  },
  {
    key: "DeafenMembers",
    flag: Permissions.DeafenMembers,
    name: "Tắt tai nghe người khác",
    description: "Cho phép tắt tai nghe của thành viên khác trong phòng thoại.",
    category: "Voice",
  },
  {
    key: "MoveMembers",
    flag: Permissions.MoveMembers,
    name: "Di chuyển thành viên",
    description: "Cho phép di chuyển thành viên từ phòng thoại này sang phòng thoại khác.",
    category: "Voice",
  },
];

/**
 * Checks if a permissions bitmask satisfies a required permission.
 * Automatically checks for Administrator bypass.
 */
export function hasPermission(
  current: bigint | number | string,
  required: bigint
): boolean {
  try {
    const currentBig = typeof current === "bigint" ? current : BigInt(current);
    if ((currentBig & Permissions.Administrator) === Permissions.Administrator) {
      return true;
    }
    return (currentBig & required) === required;
  } catch {
    return false;
  }
}

/**
 * Checks if a permissions bitmask contains any of the requested permissions.
 */
export function hasAnyPermission(
  current: bigint | number | string,
  required: bigint
): boolean {
  try {
    const currentBig = typeof current === "bigint" ? current : BigInt(current);
    if ((currentBig & Permissions.Administrator) === Permissions.Administrator) {
      return true;
    }
    return (currentBig & required) !== 0n;
  } catch {
    return false;
  }
}

export const PERMISSION_CATEGORIES = [
  "General",
  "Membership",
  "Text",
  "Voice",
] as const;

export function addPermission(
  current: bigint | number | string,
  flag: bigint
): bigint {
  try {
    const currentBig = typeof current === "bigint" ? current : BigInt(current);
    return currentBig | flag;
  } catch {
    return flag;
  }
}

export function removePermission(
  current: bigint | number | string,
  flag: bigint
): bigint {
  try {
    const currentBig = typeof current === "bigint" ? current : BigInt(current);
    return currentBig & ~flag;
  } catch {
    return 0n;
  }
}
