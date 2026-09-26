import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthModalProps {
  onSuccess: (user: User, token: string) => void;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  currentTheme = 'warm-orange',
  onThemeChange,
}) => {
  const [isRegister, setIsRegister] = useState(false);

  // Login form state
  const [emailOrUsername, setEmailOrUsername] = useState('alex@pulsechat.io');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTheme, setActiveTheme] = useState(currentTheme);

  const handleThemeSelect = (themeName: string) => {
    setActiveTheme(themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('nomna_theme', themeName);
    if (onThemeChange) {
      onThemeChange(themeName);
    }
  };

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = customUser || emailOrUsername;
      const p = customPass || password;
      const res = await authApi.login(u, p);
      localStorage.setItem('nomna_token', res.accessToken);
      localStorage.setItem('nomna_refresh', res.refreshToken);
      onSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản & mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register(regEmail, regUsername, regDisplayName, regPassword);
      localStorage.setItem('nomna_token', res.accessToken);
      localStorage.setItem('nomna_refresh', res.refreshToken);
      onSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký không thành công. Tên đăng nhập hoặc email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillAccount = (user: string, pass: string) => {
    setEmailOrUsername(user);
    setPassword(pass);
    setError(null);
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

      {/* Main Glassmorphic Card (Wider & Perfectly Balanced with Shared UI) */}
      <div className="w-full max-w-[480px] md:max-w-[500px] bg-[var(--card-glass-bg)] border border-[var(--card-glass-border)] rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col gap-4">
        {/* Header: Clean Title only (No lightning badge, no description) */}
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
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <Input
              label="Email hoặc Tên tài khoản"
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="alex@pulsechat.io hoặc alexrivers"
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng kiểm tra hộp thư để khôi phục mật khẩu tài khoản!')}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                showPasswordToggle
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
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
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
            <Input
              label="Họ và tên hiển thị"
              type="text"
              required
              value={regDisplayName}
              onChange={(e) => setRegDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tên đăng nhập"
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="nguyenvana"
              />

              <Input
                label="Địa chỉ Email"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="vana@nomna.io"
              />
            </div>

            <Input
              label="Mật khẩu (Tối thiểu 8 ký tự)"
              type="password"
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••••••"
              showPasswordToggle
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

        {/* Social Logins: Google & Facebook Ở DƯỚI (Dùng shared/ui/Button variant="social") */}
        <div className="grid grid-cols-2 gap-3">
          {/* Google Button */}
          <Button
            type="button"
            variant="social"
            size="md"
            fullWidth
            onClick={() => alert('Đăng nhập Google OAuth 2.0 (Đang thiết lập OAuth Client ID)')}
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
            Google
          </Button>

          {/* Facebook Button */}
          <Button
            type="button"
            variant="social"
            size="md"
            fullWidth
            onClick={() => alert('Đăng nhập Facebook Login (Đang thiết lập App ID)')}
            leftIcon={
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
          >
            Facebook
          </Button>
        </div>

        {/* Footer switch between Login & Register */}
        <footer className="text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-3.5 mt-1">
          {!isRegister ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </span>
          ) : (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Đăng nhập
              </button>
            </span>
          )}
        </footer>
      </div>
    </div>
  );
};
