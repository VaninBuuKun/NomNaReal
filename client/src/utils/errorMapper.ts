/**
 * Human-friendly error resolution dictionary for NomNa.
 * Translates backend domain error codes (RFC 7807) into natural Vietnamese messages
 * without technical jargon or raw HTTP status codes.
 */

export interface FriendlyError {
  title: string;
  description: string;
}

const ERROR_CODE_TRANSLATIONS: Record<string, { title: string; description: string }> = {
  // Permission & Access Control
  'Permission.Forbidden': {
    title: 'Không đủ quyền hạn',
    description: 'Bạn không có quyền thực hiện thao tác này trong kênh hoặc máy chủ.',
  },
  'Server.Forbidden': {
    title: 'Không có quyền truy cập',
    description: 'Bạn không phải là thành viên hoặc không có quyền truy cập máy chủ này.',
  },
  'Channel.Forbidden': {
    title: 'Không có quyền truy cập kênh',
    description: 'Bạn không có quyền xem hoặc thao tác trong kênh này.',
  },
  'Friendship.Forbidden': {
    title: 'Không thể thực hiện',
    description: 'Bạn không có quyền thực hiện thao tác này với người dùng.',
  },

  // Roles & Hierarchy
  'Role.HierarchyError': {
    title: 'Thứ bậc vai trò không hợp lệ',
    description: 'Bạn không thể thao tác trên vai trò có cấp bậc bằng hoặc cao hơn vai trò cao nhất của bạn.',
  },
  'Role.NotFound': {
    title: 'Không tìm thấy vai trò',
    description: 'Vai trò này không tồn tại hoặc đã bị xóa khỏi máy chủ.',
  },
  'Role.CannotDeleteDefault': {
    title: 'Vai trò mặc định',
    description: 'Không thể xóa vai trò mặc định của hệ thống.',
  },

  // Servers & Channels
  'Server.NotFound': {
    title: 'Không tìm thấy máy chủ',
    description: 'Máy chủ này không tồn tại hoặc đã bị xóa.',
  },
  'Channel.NotFound': {
    title: 'Kênh không tồn tại',
    description: 'Kênh trò chuyện này không tồn tại hoặc đã bị xóa.',
  },
  'Member.NotFound': {
    title: 'Không tìm thấy thành viên',
    description: 'Thành viên này không còn tham gia trong máy chủ.',
  },

  // Messages & Pins
  'Message.NotFound': {
    title: 'Tin nhắn không tồn tại',
    description: 'Tin nhắn này đã bị xóa hoặc không còn khả dụng.',
  },
  'Message.AlreadyPinned': {
    title: 'Tin nhắn đã được ghim',
    description: 'Tin nhắn này đã nằm trong danh sách ghim của kênh.',
  },
  'Message.PinLimitReached': {
    title: 'Đã đạt giới hạn ghim',
    description: 'Kênh này đã đạt số lượng tin nhắn ghim tối đa (50 tin nhắn).',
  },

  // Friends & Social
  'Friendship.NotFound': {
    title: 'Không tìm thấy',
    description: 'Không tìm thấy thông tin bạn bè hoặc lời mời kết bạn.',
  },
  'Friendship.AlreadyAccepted': {
    title: 'Đã là bạn bè',
    description: 'Hai bạn đã chấp nhận kết bạn trước đó.',
  },
  'Friendship.AlreadyFriends': {
    title: 'Đã là bạn bè',
    description: 'Hai bạn đã là bạn bè của nhau rồi.',
  },
  'Friendship.AlreadyPending': {
    title: 'Lời mời đang chờ',
    description: 'Bạn đã gửi lời mời kết bạn cho người này rồi.',
  },
  'Friendship.Self': {
    title: 'Không hợp lệ',
    description: 'Bạn không thể kết bạn với chính mình.',
  },
  'Friendship.Blocked': {
    title: 'Không thể kết bạn',
    description: 'Không thể gửi lời mời do thiết lập chặn hoặc quyền riêng tư.',
  },

  // Authentication & Rate Limits
  'Auth.Unauthorized': {
    title: 'Phiên đăng nhập hết hạn',
    description: 'Vui lòng đăng nhập lại để tiếp tục sử dụng.',
  },
  'RateLimit.Exceeded': {
    title: 'Thao tác quá nhanh',
    description: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau vài giây.',
  },
};

/**
 * Resolves an Axios error or generic Error into a polished, user-friendly title and description.
 * Ensures NO status codes (e.g. 403, 500) or raw code tokens appear in the user UI.
 */
export function resolveApiError(error: any): FriendlyError {
  const data = error?.response?.data;
  const status = error?.response?.status;

  // 1. Match against known domain error code
  const rawCode = data?.title || data?.code || data?.errorCode;
  if (typeof rawCode === 'string' && ERROR_CODE_TRANSLATIONS[rawCode]) {
    const translation = ERROR_CODE_TRANSLATIONS[rawCode];
    const customDetail = data?.detail;
    // Only use backend detail if it's already written in Vietnamese (contains accented characters)
    const isVietnamese = customDetail && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(customDetail);

    return {
      title: translation.title,
      description: isVietnamese ? customDetail : translation.description,
    };
  }

  // 2. HTTP Status Code fallbacks without status numbers in user-facing title
  if (status === 403) {
    return {
      title: 'Không đủ quyền hạn',
      description: 'Bạn không có quyền thực hiện thao tác này trong kênh hoặc máy chủ.',
    };
  }

  if (status === 404) {
    return {
      title: 'Không tìm thấy dữ liệu',
      description: 'Dữ liệu bạn đang thao tác không tồn tại hoặc đã bị xóa.',
    };
  }

  if (status === 409) {
    return {
      title: 'Xung đột dữ liệu',
      description: 'Dữ liệu đã được cập nhật bởi thao tác khác. Vui lòng tải lại trang.',
    };
  }

  if (status === 429) {
    return {
      title: 'Thao tác quá nhanh',
      description: 'Vui lòng đợi giây lát trước khi thử lại.',
    };
  }

  if (status >= 500) {
    return {
      title: 'Lỗi máy chủ',
      description: 'Máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.',
    };
  }

  // 3. Fallback generic error
  return {
    title: 'Thao tác thất bại',
    description: typeof data?.detail === 'string' && data.detail.length < 120
      ? data.detail
      : 'Đã có lỗi xảy ra. Vui lòng thử lại sau!',
  };
}

