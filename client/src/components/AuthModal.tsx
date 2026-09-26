import React, { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { ChatTeardropDots, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/shared/utils/cn';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthModalProps {
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('alex@pulsechat.io');
  const [password, setPassword] = useState('Password123!');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!');
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
      setError(err.response?.data?.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userOrEmail: string) => {
    setEmailOrUsername(userOrEmail);
    setPassword('Password123!');
    handleLogin(undefined, userOrEmail, 'Password123!');
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl w-full max-w-[440px] overflow-hidden shadow-2xl flex flex-col">
        {/* Banner */}
        <div className="p-6 text-center border-b border-[var(--border-color)] bg-[var(--bg-rail)] flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] mb-3">
            <ChatTeardropDots size={28} weight="fill" />
          </div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            NomNa Chat
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
            Nền tảng nhắn tin thời gian thực hiệu năng cao xây dựng trên .NET 9 & React
          </p>

          {/* Tab Switcher */}
          <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-color)] mt-4 w-full">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                !isRegister
                  ? 'bg-[var(--bg-chat)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <LogIn size={14} />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                isRegister
                  ? 'bg-[var(--bg-chat)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <UserPlus size={14} />
              <span>Đăng ký mới</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={(e) => handleLogin(e)} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Email hoặc Tên tài khoản
                </label>
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="alex@pulsechat.io hoặc alexrivers"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[var(--accent-glow)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập vào NomNa 🚀'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Họ và tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="vana"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="vana@example.com"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[var(--accent-glow)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản mới'}
              </button>
            </form>
          )}

          {/* Quick Demo Login */}
          {!isRegister && (
            <div className="pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                <Sparkle size={13} weight="fill" className="text-[var(--accent-primary)]" />
                <span>Đăng nhập nhanh (Tài khoản mẫu seed sẵn)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickLogin('alex@pulsechat.io')}
                  className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-all text-left truncate cursor-pointer"
                >
                  ⚡ Alex Rivers (Lead)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('minh@pulsechat.io')}
                  className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-all text-left truncate cursor-pointer"
                >
                  💻 Minh Dev (Senior)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
