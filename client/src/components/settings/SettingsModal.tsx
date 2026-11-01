import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  ShieldCheck,
  Bell,
  Palette,
  Keyboard,
  SignOut,
  X,
  Gear,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Badge } from "../ui";
import type { User } from "../../types";
import { ProfileTab } from "./ProfileTab";
import { SecurityTab } from "./SecurityTab";
import { AppearanceTab } from "./AppearanceTab";
import { NotificationsTab } from "./NotificationsTab";
import { ShortcutsTab } from "./ShortcutsTab";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onUserUpdated?: (user: User) => void;
}

type TabType =
  | "profile"
  | "security"
  | "notifications"
  | "appearance"
  | "shortcuts";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [mobileSubView, setMobileSubView] = useState<"menu" | "content">("menu");

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("profile");
      setMobileSubView("menu");
    }
  }, [isOpen]);

  // Escape key to close & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    profile: {
      title: "Hồ sơ cá nhân",
      subtitle:
        "Quản lý thông tin danh tính, ảnh đại diện và tiểu sử hiển thị của bạn",
    },
    security: {
      title: "Bảo mật & Mật khẩu",
      subtitle: "Cập nhật mật khẩu đăng nhập, bảo mật tài khoản và xác thực",
    },
    notifications: {
      title: "Tùy chọn Thông báo",
      subtitle:
        "Cấu hình âm thanh thông báo và nhắc nhở tin nhắn mới trong kênh",
    },
    appearance: {
      title: "Giao diện & Chủ đề (Theme)",
      subtitle:
        "Tùy chỉnh bảng màu sắc, kích thước hiển thị và mật độ tin nhắn",
    },
    shortcuts: {
      title: "Phím tắt nhanh",
      subtitle:
        "Danh sách các tổ hợp phím tắt thao tác nhanh giúp tăng tốc độ làm việc",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:w-[980px] sm:max-w-[95vw] sm:h-[680px] sm:max-h-[92vh] bg-[var(--bg-chat)] border-0 sm:border border-[var(--border-color)] sm:rounded-[4px] flex overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. LEFT SIDEBAR (Master Menu on Mobile, Fixed on Desktop) ================= */}
        <aside
          className={`w-full sm:w-[250px] bg-[var(--bg-rail)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between shrink-0 overflow-y-auto ${
            mobileSubView === "content" ? "hidden sm:flex" : "flex"
          }`}
          style={{ flexShrink: 0 }}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <Gear
                  size={20}
                  weight="bold"
                  className="text-[var(--text-secondary)]"
                />
                <h2 className="font-bold text-sm text-[var(--text-primary)]">
                  Cài đặt
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden w-8 h-8 rounded-[3px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Group 1: Personal */}
            <div className="mb-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                Cá nhân
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profile");
                  setMobileSubView("content");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "profile"
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                }`}
              >
                <UserIcon
                  size={17}
                  weight={activeTab === "profile" ? "bold" : "regular"}
                />
                <span>Hồ sơ cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("security");
                  setMobileSubView("content");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "security"
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                }`}
              >
                <ShieldCheck
                  size={17}
                  weight={activeTab === "security" ? "bold" : "regular"}
                />
                <span>Bảo mật & Mật khẩu</span>
              </button>
            </div>

            {/* Group 2: App Customization */}
            <div className="mb-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                Ứng dụng
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("appearance");
                  setMobileSubView("content");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "appearance"
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Palette
                  size={17}
                  weight={activeTab === "appearance" ? "bold" : "regular"}
                />
                <span>Giao diện & Theme</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("notifications");
                  setMobileSubView("content");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[3px] text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "notifications"
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Bell
                    size={17}
                    weight={activeTab === "notifications" ? "bold" : "regular"}
                  />
                  <span>Thông báo</span>
                </span>
                <Badge variant="neutral" size="sm">
                  Cài đặt
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("shortcuts");
                  setMobileSubView("content");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "shortcuts"
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Keyboard
                  size={17}
                  weight={activeTab === "shortcuts" ? "bold" : "regular"}
                />
                <span>Phím tắt nhanh</span>
              </button>
            </div>
          </div>

          {/* Bottom Logout */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
            >
              <SignOut size={17} weight="bold" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </aside>

        {/* ================= 2. RIGHT CONTENT AREA (Detail on Mobile) ================= */}
        <main
          className={`flex-1 flex flex-col overflow-hidden bg-[var(--bg-chat)] ${
            mobileSubView === "menu" ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Header Bar */}
          <header className="h-16 px-4 sm:px-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-chat)]">
            <div className="flex items-center gap-3">
              {/* Mobile Back Button to return to menu */}
              <button
                type="button"
                onClick={() => setMobileSubView("menu")}
                className="sm:hidden p-1.5 rounded-control text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shrink-0"
                title="Quay lại danh mục"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {tabTitles[activeTab].title}
                </h1>
                <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                  {tabTitles[activeTab].subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-[3px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)] shrink-0"
              title="Đóng (Esc)"
            >
              <X size={16} weight="bold" />
            </button>
          </header>

          {/* Content Body */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
            {activeTab === "profile" && (
              <ProfileTab
                currentUser={currentUser}
                onUserUpdated={onUserUpdated}
              />
            )}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "shortcuts" && <ShortcutsTab />}
          </div>
        </main>
      </div>
    </div>
  );
};
