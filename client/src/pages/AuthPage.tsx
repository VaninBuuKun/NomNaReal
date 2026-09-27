import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm, RegisterForm } from '../components/auth';
import { Button } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { authApi } from '../services';

interface AuthPageProps {
  mode: 'login' | 'register';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onAuthSuccess }) => {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [error, setError] = useState<string | null>(null);
  const { theme: activeTheme, changeTheme } = useTheme();

  const handleAuthSuccess = () => {
    if (onAuthSuccess) onAuthSuccess();
    navigate('/');
  };

  const handleGoogleLogin = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId || googleClientId.trim() === '') {
      setError('Chưa cấu hình Google Client ID. Vui lòng điền VITE_GOOGLE_CLIENT_ID trong file client/.env để kích hoạt.');
      return;
    }

    const loadGsiScript = (onLoaded: () => void) => {
      const existingScript = document.getElementById('google-gsi-script');
      if (existingScript && (window as any).google?.accounts?.id) {
        onLoaded();
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = onLoaded;
      script.onerror = () => {
        setError('Không thể tải Google Identity Services. Vui lòng kiểm tra kết nối mạng.');
      };
      document.head.appendChild(script);
    };

    loadGsiScript(() => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        setError('Google Identity Service không khả dụng trên trình duyệt này.');
        return;
      }

      setError(null);
      google.accounts.id.initialize({
        client_id: googleClientId.trim(),
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            setError('Không nhận được mã xác thực Google Token.');
            return;
          }
          try {
            await authApi.googleLogin(response.credential);
            localStorage.setItem('nomna_logged_in', 'true');
            handleAuthSuccess();
          } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } } };
            setError(errorObj?.response?.data?.message || 'Đăng nhập với Google thất bại. Vui lòng thử lại.');
          }
        },
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn('Google One Tap notification skipped or not displayed');
        }
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dot-matrix-bg overflow-x-hidden animate-in fade-in duration-200">
      {/* Ambient Center Warm Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full bg-[radial-gradient(circle,var(--accent-glow)_0%,transparent_70%)] blur-[80px] pointer-events-none z-0" />

      {/* Top Floating Theme Switcher */}
      <aside className="absolute top-5 right-6 hidden sm:flex items-center gap-1.5 bg-[var(--card-glass-bg)] border border-[var(--border-color)] p-1 rounded-full backdrop-blur-md z-20 shadow-xs">
        <button
          type="button"
          onClick={() => changeTheme('warm-orange')}
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
          onClick={() => changeTheme('dark-zinc')}
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
          onClick={() => changeTheme('clean-coral')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTheme === 'clean-coral'
              ? 'bg-[var(--accent-primary)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          ☀️ San Hô
        </button>
      </aside>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-[480px] md:max-w-[500px] bg-[var(--card-glass-bg)] border border-[var(--card-glass-border)] rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col gap-4">
        <header className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {!isRegister ? 'Đăng nhập vào NomNa' : 'Tạo tài khoản NomNa'}
          </h1>
        </header>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium animate-in fade-in duration-150">
            {error}
          </div>
        )}

        {/* Auth Forms */}
        {!isRegister ? (
          <LoginForm onSuccess={handleAuthSuccess} onError={(err) => setError(err)} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} onError={(err) => setError(err)} />
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[0.72rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            hoặc tiếp tục với
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Social Login */}
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

        {/* Footer */}
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
