/**
 * Maps API / Backend Error Responses to friendly, clear Vietnamese messages.
 * Prevents displaying raw error codes like "Auth.InvalidCredentials" to end users.
 */
export const getFriendlyErrorMessage = (
  error: any,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
): string => {
  if (!error) return fallbackMessage;

  const data = error.response?.data;
  const status = error.response?.status;

  // 1. If explicit business code is present in title or code
  const rawCode = (data?.code || data?.title || '') as string;
  const detail = data?.detail as string | undefined;
  const message = data?.message as string | undefined;

  const codeMap: Record<string, string> = {
    'Auth.InvalidCredentials': 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
    'Auth.AccountLocked': 'Tài khoản tạm thời bị khóa do thử đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.',
    'Auth.EmailExists': 'Địa chỉ email này đã được sử dụng cho tài khoản khác.',
    'Auth.UsernameExists': 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.',
    'Auth.UserNotFound': 'Không tìm thấy tài khoản tương ứng với thông tin này.',
    'Auth.ResetPasswordFailed': 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
    'Auth.InvalidVerificationCode': 'Mã xác thực không chính xác hoặc đã hết hạn.',
    'Auth.RegistrationFailed': 'Đăng ký tài khoản không thành công. Vui lòng kiểm tra lại thông tin.',
    'LinkPreview.InvalidUrl': 'Đường dẫn liên kết không hợp lệ.',
    'LinkPreview.ForbiddenHost': 'Không thể xem trước liên kết nội bộ.',
  };

  if (rawCode && codeMap[rawCode]) {
    return codeMap[rawCode];
  }

  // 2. If detail is a meaningful human sentence (and not a raw error code)
  if (detail && !/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(detail)) {
    // Translate common backend English messages if any
    if (detail.includes('Invalid email/username or password')) {
      return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }
    if (detail.includes('temporarily locked')) {
      return 'Tài khoản tạm thời bị khóa do thử đăng nhập sai nhiều lần. Vui lòng thử lại sau.';
    }
    if (detail.includes('already registered')) {
      return 'Địa chỉ email này đã được sử dụng cho tài khoản khác.';
    }
    if (detail.includes('already taken')) {
      return 'Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.';
    }
    return detail;
  }

  // 3. If data.message exists and is not raw code
  if (message && !/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(message)) {
    return message;
  }

  // 4. HTTP status fallbacks
  if (status === 401) {
    return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (status === 404) {
    return 'Không tìm thấy tài nguyên yêu cầu.';
  }
  if (status === 409) {
    return 'Dữ liệu đã tồn tại hoặc xảy ra xung đột.';
  }
  if (status === 429) {
    return 'Bạn thao tác quá nhanh. Vui lòng đợi trong giây lát rồi thử lại.';
  }
  if (status >= 500) {
    return 'Hệ thống đang bảo trì hoặc gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }

  return fallbackMessage;
};
