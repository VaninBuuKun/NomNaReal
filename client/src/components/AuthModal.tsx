import React, { useState } from 'react';
import { LogIn, UserPlus, Zap } from 'lucide-react';
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
      localStorage.setItem('pulsechat_token', res.accessToken);
      localStorage.setItem('pulsechat_refresh', res.refreshToken);
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
      localStorage.setItem('pulsechat_token', res.accessToken);
      localStorage.setItem('pulsechat_refresh', res.refreshToken);
      onSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string) => {
    setEmailOrUsername(email);
    setPassword('Password123!');
    handleLogin(undefined, email, 'Password123!');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-chat)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        width: '92%',
        maxWidth: '460px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Banner */}
        <div style={{
          padding: '24px 24px 16px 24px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-rail)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--accent-primary)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 800,
            marginBottom: '10px',
            boxShadow: '0 4px 14px var(--accent-glow)'
          }}>
            ⚡
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>PulseChat</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Hệ thống Chat Real-time Hiệu năng cao (.NET 9 + React)
          </p>

          {/* Quick Demo User Buttons */}
          <div style={{
            marginTop: '16px',
            padding: '10px',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Zap size={13} />
              <span>Đăng nhập nhanh 1-Click (Tài khoản mẫu)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => quickLogin('alex@pulsechat.io')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-chat)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Alex Rivers
              </button>
              <button
                type="button"
                onClick={() => quickLogin('minh@pulsechat.io')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-chat)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Minh Dev
              </button>
              <button
                type="button"
                onClick={() => quickLogin('van@pulsechat.io')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-chat)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Van Nguyen
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => { setIsRegister(false); setError(null); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: !isRegister ? 'var(--bg-chat)' : 'var(--bg-surface)',
              color: !isRegister ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              borderBottom: !isRegister ? '2px solid var(--accent-primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogIn size={16} /> Đăng nhập
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(null); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: isRegister ? 'var(--bg-chat)' : 'var(--bg-surface)',
              color: isRegister ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              borderBottom: isRegister ? '2px solid var(--accent-primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={16} /> Tạo tài khoản mới
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.82rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email hoặc Username
                </label>
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="alex@pulsechat.io"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập vào PulseChat 🚀'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Họ tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="Alex Rivers"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Tên tài khoản (Username)
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="alexrivers"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="alex@pulsechat.io"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '6px',
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Đang tạo...' : 'Đăng ký tài khoản 🎉'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
