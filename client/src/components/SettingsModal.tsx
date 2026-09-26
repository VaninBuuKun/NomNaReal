import React from 'react';
import { X, Palette, LogOut } from 'lucide-react';
import type { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  currentTheme,
  onThemeChange,
}) => {
  if (!isOpen) return null;

  const themes = [
    { id: 'warm-orange', name: 'Trắng Cam Ấm (Warm Light)', desc: 'Phong cách Arc / Substack ngả kem ấm áp', icon: '🍊' },
    { id: 'dark-zinc', name: 'Dark Zinc (Tối Hiện Đại)', desc: 'Tông màu đen xám phong cách Linear & Discord', icon: '🌙' },
    { id: 'clean-coral', name: 'Trắng San Hô (Clean Coral)', desc: 'Nền trắng sáng điểm xuyết màu hồng san hô', icon: '☀️' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      animation: 'fadeIn 0.15s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-chat)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '520px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.05rem' }}>
            <span>⚙️ Cài đặt ứng dụng</span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* User Profile Card */}
          {currentUser && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                {currentUser.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentUser.displayName}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{currentUser.username} · {currentUser.email}</div>
                {currentUser.bio && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>{currentUser.bio}</div>
                )}
              </div>
            </div>
          )}

          {/* Theme Selector (As requested: moved into Settings) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '10px'
            }}>
              <Palette size={16} color="var(--accent-primary)" />
              <span>Giao diện & Chủ đề (Theme)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {themes.map((theme) => {
                const isActive = currentTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{theme.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {theme.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {theme.desc}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span style={{
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'var(--bg-chat)',
                        padding: '2px 8px',
                        borderRadius: '99px'
                      }}>
                        Đang chọn
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logout Action */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--status-dnd)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={16} />
              <span>Đăng xuất khỏi tài khoản</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
