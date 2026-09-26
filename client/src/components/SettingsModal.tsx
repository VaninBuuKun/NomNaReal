import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Bell,
  Palette,
  Keyboard,
  Buildings,
  Users,
  SignOut,
  X,
  CheckCircle,
  Plus,
} from '@phosphor-icons/react';
import { Button, Input, Avatar, Badge } from '@/shared/ui';
import type { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

type TabType = 'profile' | 'security' | 'notifications' | 'appearance' | 'shortcuts' | 'workspace' | 'members';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Form states for Profile edit
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Alex Rivers');
  const [username, setUsername] = useState(currentUser?.username || 'alexrivers');
  const [bio, setBio] = useState(currentUser?.bio || 'Tech Lead & System Architect @ NomNa');
  const [density, setDensity] = useState<'cozy' | 'compact'>('cozy');

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName);
      setUsername(currentUser.username);
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const themes = [
    {
      id: 'warm-orange',
      name: 'Trắng Cam Ấm (Warm Light)',
      desc: 'Phong cách Arc Browser & Substack, màu cam ấm áp',
      colors: ['#f6f5f2', '#ff5a1f', '#1c1917'],
    },
    {
      id: 'dark-zinc',
      name: 'Dark Zinc (Tối Hiện Đại)',
      desc: 'Tông màu đen xám phong cách Linear & Discord',
      colors: ['#09090b', '#6366f1', '#f4f4f6'],
    },
    {
      id: 'clean-coral',
      name: 'Trắng San Hô (Clean Coral)',
      desc: 'Nền trắng sáng điểm xuyết sắc màu hồng san hô',
      colors: ['#ffffff', '#f43f5e', '#0f172a'],
    },
  ];

  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    profile: {
      title: 'Hồ sơ cá nhân',
      subtitle: 'Quản lý thông tin danh tính, ảnh đại diện và tiểu sử hiển thị của bạn',
    },
    security: {
      title: 'Bảo mật & 2FA',
      subtitle: 'Mật khẩu đăng nhập, xác thực 2 lớp và quản lý phiên hoạt động',
    },
    notifications: {
      title: 'Tùy chọn Thông báo',
      subtitle: 'Cấu hình âm thanh thông báo và nhắc nhở tin nhắn mới trong kênh',
    },
    appearance: {
      title: 'Giao diện & Chủ đề (Theme)',
      subtitle: 'Tùy chỉnh bảng màu sắc, kích thước hiển thị và mật độ giao diện',
    },
    shortcuts: {
      title: 'Phím tắt nhanh',
      subtitle: 'Danh sách các tổ hợp phím tắt thao tác nhanh giúp tăng tốc độ làm việc',
    },
    workspace: {
      title: 'Thông tin Workspace',
      subtitle: 'Chi tiết không gian làm việc Nexus Hub và mã mời tham gia',
    },
    members: {
      title: 'Thành viên & Phân quyền',
      subtitle: 'Danh sách thành viên trực thuộc Workspace và quyền hạn quản trị',
    },
  };

  const handleSave = () => {
    alert('Đã lưu các thay đổi cài đặt thành công!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[980px] max-w-[95vw] h-[680px] max-h-[92vh] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl flex overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. LEFT SIDEBAR (250px) ================= */}
        <aside
          className="w-[250px] bg-[var(--bg-rail)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between shrink-0 overflow-y-auto"
          style={{ width: '250px', padding: '20px 14px', flexShrink: 0 }}
        >
          <div>
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[var(--border-color)]">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                ⚡
              </div>
              <h2 className="font-bold text-sm text-[var(--text-primary)]">Cài đặt NomNa</h2>
            </div>

            {/* Group 1: Personal */}
            <div className="mb-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                Cá nhân
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'profile'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <UserIcon size={17} weight={activeTab === 'profile' ? 'bold' : 'regular'} />
                <span>Hồ sơ cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'security'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <ShieldCheck size={17} weight={activeTab === 'security' ? 'bold' : 'regular'} />
                <span>Bảo mật & 2FA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'notifications'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Bell size={17} weight={activeTab === 'notifications' ? 'bold' : 'regular'} />
                  <span>Thông báo</span>
                </span>
                <Badge variant="neutral" size="sm">Mới</Badge>
              </button>
            </div>

            {/* Group 2: App Customization */}
            <div className="mb-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                Tùy biến
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'appearance'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Palette size={17} weight={activeTab === 'appearance' ? 'bold' : 'regular'} />
                <span>Giao diện & Theme</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shortcuts')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'shortcuts'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Keyboard size={17} weight={activeTab === 'shortcuts' ? 'bold' : 'regular'} />
                <span>Phím tắt nhanh</span>
              </button>
            </div>

            {/* Group 3: Workspace */}
            <div className="mb-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                Không gian làm việc
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'workspace'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Buildings size={17} weight={activeTab === 'workspace' ? 'bold' : 'regular'} />
                <span>Thông tin Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'members'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users size={17} weight={activeTab === 'members' ? 'bold' : 'regular'} />
                  <span>Thành viên</span>
                </span>
                <Badge variant="neutral" size="sm">4</Badge>
              </button>
            </div>
          </div>

          {/* Bottom Logout */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
            >
              <SignOut size={17} weight="bold" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </aside>

        {/* ================= 2. RIGHT CONTENT AREA ================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-chat)]">
          {/* Header Bar */}
          <header className="h-16 px-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-chat)]">
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)]">
                {tabTitles[activeTab].title}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {tabTitles[activeTab].subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)]"
              title="Đóng (Esc)"
            >
              <X size={16} weight="bold" />
            </button>
          </header>

          {/* Content Body */}
          <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
            
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <>
                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Ảnh đại diện & Danh tính</h3>
                  <div className="flex items-center gap-4">
                    <Avatar fallback={displayName} size="xl" status="online" />
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => alert('Chọn file ảnh JPG/PNG từ máy tính của bạn')}
                        >
                          Tải ảnh mới lên
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => alert('Đã khôi phục avatar mặc định theo tên')}
                        >
                          Xóa ảnh
                        </Button>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        Định dạng hỗ trợ: JPG, PNG, WebP hoặc GIF. Kích thước tối đa 5MB.
                      </span>
                    </div>
                  </div>
                </section>

                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Thông tin cơ bản</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Tên hiển thị"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <Input
                      label="Tên người dùng (Username)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Tiểu sử ngắn (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Giới thiệu đôi nét về bản thân hoặc chức danh của bạn..."
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-chat)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] resize-vertical transition-all"
                    />
                  </div>

                  <Input
                    label="Email đã xác minh"
                    disabled
                    value={currentUser?.email || 'alex@pulsechat.io'}
                    className="opacity-70 cursor-not-allowed"
                  />
                </section>
              </>
            )}

            {/* TAB 2: SECURITY */}
            {activeTab === 'security' && (
              <>
                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Đổi mật khẩu tài khoản</h3>
                  <Input label="Mật khẩu hiện tại" type="password" placeholder="••••••••••••" showPasswordToggle />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Mật khẩu mới" type="password" placeholder="••••••••••••" showPasswordToggle />
                    <Input label="Nhập lại mật khẩu mới" type="password" placeholder="••••••••••••" showPasswordToggle />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => alert('Cập nhật mật khẩu thành công!')}
                    >
                      Cập nhật mật khẩu
                    </Button>
                  </div>
                </section>

                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Xác thực 2 lớp (2FA - TOTP)</h3>
                    <Badge variant="success">Khuyến nghị</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Bảo vệ tài khoản an toàn với ứng dụng Google Authenticator hoặc Authy bằng cách yêu cầu mã xác thực 6 số mỗi khi đăng nhập.
                  </p>
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => alert('Mở trình hướng dẫn thiết lập 2FA với mã QR')}
                    >
                      Bật xác thực 2 lớp (2FA)
                    </Button>
                  </div>
                </section>
              </>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Cấu hình thông báo tin nhắn</h3>
                
                <label className="flex items-center justify-between py-2.5 border-b border-[var(--border-color)] cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Âm thanh tin nhắn đến</div>
                    <div className="text-xs text-[var(--text-muted)]">Phát âm thanh nhẹ khi có tin nhắn mới trong kênh đang theo dõi</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)] cursor-pointer" />
                </label>

                <label className="flex items-center justify-between py-2.5 border-b border-[var(--border-color)] cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Thông báo đẩy Desktop (Push)</div>
                    <div className="text-xs text-[var(--text-muted)]">Hiển thị banner thông báo trên màn hình ngay cả khi thu nhỏ trình duyệt</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)] cursor-pointer" />
                </label>

                <label className="flex items-center justify-between py-2.5 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Nhắc nhở khi được nhắc tên (@mention)</div>
                    <div className="text-xs text-[var(--text-muted)]">Ưu tiên thông báo nổi bật khi ai đó gắn thẻ bạn hoặc @everyone</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)] cursor-pointer" />
                </label>
              </section>
            )}

            {/* TAB 4: APPEARANCE & THEME */}
            {activeTab === 'appearance' && (
              <>
                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Chủ đề giao diện (Theme Palette)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((t) => {
                      const isActive = currentTheme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => onThemeChange(t.id)}
                          className={`border-2 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col gap-2 relative bg-[var(--bg-chat)] ${
                            isActive
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] shadow-sm'
                              : 'border-[var(--border-color)] hover:border-[var(--border-hover)] hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {t.name}
                            </span>
                            {isActive && (
                              <CheckCircle size={16} weight="fill" className="text-[var(--accent-primary)]" />
                            )}
                          </div>
                          <div className="flex gap-1 h-4 rounded overflow-hidden">
                            {t.colors.map((c, idx) => (
                              <div
                                key={idx}
                                className="flex-1 h-full"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="text-[0.7rem] text-[var(--text-muted)] line-clamp-2 leading-tight">
                            {t.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-3">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Mật độ hiển thị tin nhắn</h3>
                  <div className="flex gap-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="density"
                        checked={density === 'cozy'}
                        onChange={() => setDensity('cozy')}
                        className="accent-[var(--accent-primary)] cursor-pointer"
                      />
                      <span>Rộng rãi (Cozy)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="density"
                        checked={density === 'compact'}
                        onChange={() => setDensity('compact')}
                        className="accent-[var(--accent-primary)] cursor-pointer"
                      />
                      <span>Gọn gàng (Compact)</span>
                    </label>
                  </div>
                </section>
              </>
            )}

            {/* TAB 5: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Phím tắt tăng tốc làm việc</h3>
                
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)] text-xs">
                  <span className="text-[var(--text-secondary)]">Tìm kiếm tin nhắn & kênh</span>
                  <kbd className="px-2 py-1 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] font-mono font-bold text-[var(--text-primary)]">
                    Ctrl + K
                  </kbd>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)] text-xs">
                  <span className="text-[var(--text-secondary)]">Gửi tin nhắn</span>
                  <kbd className="px-2 py-1 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] font-mono font-bold text-[var(--text-primary)]">
                    Enter
                  </kbd>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)] text-xs">
                  <span className="text-[var(--text-secondary)]">Xuống dòng trong ô chat</span>
                  <kbd className="px-2 py-1 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] font-mono font-bold text-[var(--text-primary)]">
                    Shift + Enter
                  </kbd>
                </div>

                <div className="flex justify-between items-center py-2 text-xs">
                  <span className="text-[var(--text-secondary)]">Đóng hộp thoại hoặc mở bảng Thread</span>
                  <kbd className="px-2 py-1 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] font-mono font-bold text-[var(--text-primary)]">
                    Esc
                  </kbd>
                </div>
              </section>
            )}

            {/* TAB 6: WORKSPACE */}
            {activeTab === 'workspace' && (
              <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Thông tin Nexus Hub</h3>
                <Input label="Tên không gian làm việc" defaultValue="Nexus Hub" />
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Mã mời tham gia (Invite Code)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      defaultValue="NEXUS123"
                      className="font-mono text-[var(--accent-primary)] font-bold flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => alert('Đã sao chép link mời: https://nomna.io/join/NEXUS123')}
                      className="whitespace-nowrap shrink-0"
                    >
                      Sao chép link
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 7: MEMBERS */}
            {activeTab === 'members' && (
              <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Thành viên Workspace (4)</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => alert('Nhập email thành viên để gửi lời mời tham gia')}
                    leftIcon={<Plus size={14} weight="bold" />}
                  >
                    Mời thành viên
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-chat)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <Avatar fallback="Alex Rivers" status="online" size="md" />
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">Alex Rivers</div>
                        <div className="text-[0.7rem] text-[var(--text-muted)]">alex@pulsechat.io</div>
                      </div>
                    </div>
                    <Badge variant="primary">OWNER</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-chat)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <Avatar fallback="Minh Dev" status="online" size="md" />
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">Minh Dev</div>
                        <div className="text-[0.7rem] text-[var(--text-muted)]">minh@pulsechat.io</div>
                      </div>
                    </div>
                    <Badge variant="neutral">ADMIN</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-chat)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <Avatar fallback="Van Nguyen" status="away" size="md" />
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">Van Nguyen</div>
                        <div className="text-[0.7rem] text-[var(--text-muted)]">van@pulsechat.io</div>
                      </div>
                    </div>
                    <Badge variant="neutral">MEMBER</Badge>
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Footer Save Action Bar */}
          <footer
            className="h-16 px-8 border-t border-[var(--border-color)] bg-[var(--bg-rail)] flex items-center justify-end gap-3 shrink-0"
            style={{ padding: '0 28px', height: '64px' }}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              style={{ padding: '8px 20px', minWidth: '95px' }}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSave}
              style={{ padding: '8px 22px', minWidth: '120px' }}
            >
              Lưu thay đổi
            </Button>
          </footer>
        </main>

      </div>
    </div>
  );
};
