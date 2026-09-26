import React from 'react';
import { X, LogOut } from 'lucide-react';
import { Palette, CheckCircle } from '@phosphor-icons/react';
import { cn } from '@/shared/utils/cn';
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
    {
      id: 'warm-orange',
      name: 'Trắng Cam Hiện Đại (Warm Light)',
      desc: 'Phong cách Arc Browser & Substack, màu cam ấm áp',
      icon: '🍊',
    },
    {
      id: 'dark-zinc',
      name: 'Dark Zinc (Tối Hiện Đại)',
      desc: 'Tông màu đen xám phong cách Linear & Discord',
      icon: '🌙',
    },
    {
      id: 'clean-coral',
      name: 'Trắng San Hô (Clean Coral)',
      desc: 'Nền trắng sáng điểm xuyết sắc màu hồng san hô',
      icon: '☀️',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl w-full max-w-[500px] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 font-bold text-base text-[var(--text-primary)]">
            <span>⚙️ Cài đặt ứng dụng</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5">
          {/* User Profile Card */}
          {currentUser && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {currentUser.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                  {currentUser.displayName}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  @{currentUser.username} · {currentUser.email}
                </div>
                {currentUser.bio && (
                  <div className="text-[0.78rem] text-[var(--text-muted)] mt-0.5 truncate">
                    {currentUser.bio}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Selector */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] mb-2.5">
              <Palette size={18} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>Giao diện & Chủ đề (Theme)</span>
            </div>

            <div className="flex flex-col gap-2">
              {themes.map((theme) => {
                const isActive = currentTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all',
                      isActive
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] shadow-xs'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{theme.icon}</span>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
                          )}
                        >
                          {theme.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{theme.desc}</div>
                      </div>
                    </div>

                    {isActive && (
                      <span className="flex items-center gap-1 text-[var(--accent-primary)] text-xs font-bold bg-[var(--bg-chat)] px-2 py-0.5 rounded-full border border-[var(--accent-primary)]/20 shadow-xs">
                        <CheckCircle size={14} weight="fill" />
                        <span>Đang chọn</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-sm transition-colors cursor-pointer"
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
