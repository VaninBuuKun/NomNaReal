import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { authApi } from '../services/api';

// --- Zod Validation Schemas ---
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Vui lòng nhập email hoặc tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  displayName: z.string().min(2, 'Họ và tên hiển thị tối thiểu 2 ký tự'),
  username: z
    .string()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm hoặc gạch nối'),
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface AuthPageProps {
  mode: 'login' | 'register';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onAuthSuccess }) => {
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  // Global error banner
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Theme selection state
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('nomna_theme') || 'warm-orange';
  });

  const handleThemeSelect = (themeName: string) => {
    setActiveTheme(themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('nomna_theme', themeName);
  };

  // React Hook Form for Login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: 'alex@pulsechat.io',
      password: 'Password123!',
      rememberMe: true,
    },
  });

  // React Hook Form for Register
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      password: '',
    },
  });

  // Quick fill demo account
  const quickFillAccount = (user: string, pass: string) => {
    loginForm.setValue('emailOrUsername', user, { shouldValidate: true });
    loginForm.setValue('password', pass, { shouldValidate: true });
    setError(null);
  };

  // Handle Login submission
  const onLoginSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(data.emailOrUsername, data.password);
      localStorage.setItem('nomna_token', res.accessToken);
      localStorage.setItem('nomna_refresh_token', res.refreshToken);
      if (onAuthSuccess) onAuthSuccess();
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản & mật khẩu!'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const onRegisterSubmit = async (data: RegisterFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register(data.email, data.username, data.displayName, data.password);
      localStorage.setItem('nomna_token', res.accessToken);
      localStorage.setItem('nomna_refresh_token', res.refreshToken);
      if (onAuthSuccess) onAuthSuccess();
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          'Đăng ký không thành công. Tên đăng nhập hoặc email có thể đã tồn tại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth handler
  const handleGoogleLogin = () => {
    setError('Tính năng đăng nhập Google: Đang chuẩn bị kích hoạt với Google OAuth Client ID.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dot-matrix-bg overflow-x-hidden animate-in fade-in duration-200">
      {/* Ambient Center Warm Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full bg-[radial-gradient(circle,var(--accent-glow)_0%,transparent_70%)] blur-[80px] pointer-events-none z-0" />

      {/* Top Floating Theme Switcher */}
      <aside className="absolute top-5 right-6 hidden sm:flex items-center gap-1.5 bg-[var(--card-glass-bg)] border border-[var(--border-color)] p-1 rounded-full backdrop-blur-md z-20 shadow-xs">
        <button
          type="button"
          onClick={() => handleThemeSelect('warm-orange')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTheme === 'warm-orange'
              ? 'bg-[var(--accent-primary)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🍊 Trắng Cam
        </button>
        <button
          type="button"
          onClick={() => handleThemeSelect('dark-zinc')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTheme === 'dark-zinc'
              ? 'bg-[var(--accent-primary)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🌙 Dark Zinc
        </button>
        <button
          type="button"
          onClick={() => handleThemeSelect('clean-coral')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTheme === 'clean-coral'
              ? 'bg-[var(--accent-primary)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          ☀️ San Hô
        </button>
      </aside>

      {/* Main Glassmorphic Card (Exact visual design from AuthModal.tsx) */}
      <div className="w-full max-w-[480px] md:max-w-[500px] bg-[var(--card-glass-bg)] border border-[var(--card-glass-border)] rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col gap-4">
        {/* Header: Clean Title only */}
        <header className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {!isRegister ? 'Đăng nhập vào NomNa' : 'Tạo tài khoản NomNa'}
          </h1>
        </header>

        {/* Error message banner */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium animate-in fade-in duration-150">
            {error}
          </div>
        )}

        {/* 1. LOGIN MODE FORM */}
        {!isRegister ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="flex flex-col gap-3.5">
            <Input
              label="Email hoặc Tên tài khoản"
              type="text"
              placeholder="alex@pulsechat.io hoặc alexrivers"
              {...loginForm.register('emailOrUsername')}
              error={loginForm.formState.errors.emailOrUsername?.message}
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setError('Vui lòng kiểm tra hộp thư email để khôi phục mật khẩu tài khoản!')}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••••••"
                showPasswordToggle
                {...loginForm.register('password')}
                error={loginForm.formState.errors.password?.message}
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...loginForm.register('rememberMe')}
                  className="w-4 h-4 rounded accent-[var(--accent-primary)] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              {/* Seed Demo Account Quick Links */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span>Mẫu:</span>
                <button
                  type="button"
                  onClick={() => quickFillAccount('alex@pulsechat.io', 'Password123!')}
                  className="hover:text-[var(--accent-primary)] font-semibold cursor-pointer underline underline-offset-2"
                >
                  Alex
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => quickFillAccount('minh@pulsechat.io', 'Password123!')}
                  className="hover:text-[var(--accent-primary)] font-semibold cursor-pointer underline underline-offset-2"
                >
                  Minh
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
              rightIcon={<ArrowRight size={17} />}
              className="mt-1"
            >
              Đăng nhập
            </Button>
          </form>
        ) : (
          /* 2. REGISTER MODE FORM (2 Cột tinh gọn) */
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="flex flex-col gap-3.5">
            <Input
              label="Họ và tên hiển thị"
              type="text"
              placeholder="Nguyễn Văn A"
              {...registerForm.register('displayName')}
              error={registerForm.formState.errors.displayName?.message}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tên đăng nhập"
                type="text"
                placeholder="nguyenvana"
                {...registerForm.register('username')}
                error={registerForm.formState.errors.username?.message}
              />

              <Input
                label="Địa chỉ Email"
                type="email"
                placeholder="vana@nomna.io"
                {...registerForm.register('email')}
                error={registerForm.formState.errors.email?.message}
              />
            </div>

            <Input
              label="Mật khẩu (Tối thiểu 6 ký tự)"
              type="password"
              placeholder="••••••••••••"
              showPasswordToggle
              {...registerForm.register('password')}
              error={registerForm.formState.errors.password?.message}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
              rightIcon={<ArrowRight size={17} />}
              className="mt-1"
            >
              Tạo tài khoản NomNa
            </Button>
          </form>
        )}

        {/* Divider with subtle text */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[0.72rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            hoặc tiếp tục với
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Social Login: Google */}
        <div>
          <Button
            type="button"
            variant="social"
            size="md"
            fullWidth
            onClick={handleGoogleLogin}
            leftIcon={
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            }
          >
            Đăng nhập với Google
          </Button>
        </div>

        {/* Footer switch between Login & Register */}
        <footer className="text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-3.5 mt-1">
          {!isRegister ? (
            <span>
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                onClick={() => setError(null)}
                className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </Link>
            </span>
          ) : (
            <span>
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                onClick={() => setError(null)}
                className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Đăng nhập
              </Link>
            </span>
          )}
        </footer>
      </div>
    </div>
  );
};
