import React, { useState } from "react";
import { Bell, Volume2, AtSign } from "lucide-react";

export const NotificationsTab: React.FC = () => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("nomna_sound_enabled") !== "false";
  });
  const [desktopEnabled, setDesktopEnabled] = useState<boolean>(() => {
    return localStorage.getItem("nomna_desktop_notif") === "true";
  });
  const [mentionsOnly, setMentionsOnly] = useState<boolean>(() => {
    return localStorage.getItem("nomna_mentions_only") === "true";
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("nomna_sound_enabled", String(next));
      return next;
    });
  };

  const toggleDesktop = async () => {
    if (!desktopEnabled && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        alert("Bạn đã chặn thông báo trình duyệt cho trang này.");
        return;
      }
    }
    setDesktopEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("nomna_desktop_notif", String(next));
      return next;
    });
  };

  const toggleMentions = () => {
    setMentionsOnly((prev) => {
      const next = !prev;
      localStorage.setItem("nomna_mentions_only", String(next));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Tùy chọn nhận thông báo
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tùy chỉnh cách NomNa thông báo tin nhắn và hoạt động mới cho bạn.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-[4px] bg-[var(--bg-chat)] border border-[var(--border-color)]/70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                <Volume2 size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Âm thanh thông báo
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Phát âm thanh nhẹ khi có tin nhắn mới gửi đến.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? "bg-[var(--accent-primary)]" : "bg-zinc-600/40"
              }`}
            >
              <span
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  soundEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Desktop Notification Toggle */}
          <div className="flex items-center justify-between p-3 rounded-[4px] bg-[var(--bg-chat)] border border-[var(--border-color)]/70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Thông báo trên màn hình (Desktop)
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Hiển thị popup thông báo khi bạn đang dùng tab trình duyệt khác.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDesktop}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                desktopEnabled ? "bg-[var(--accent-primary)]" : "bg-zinc-600/40"
              }`}
            >
              <span
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  desktopEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Mentions Only Toggle */}
          <div className="flex items-center justify-between p-3 rounded-[4px] bg-[var(--bg-chat)] border border-[var(--border-color)]/70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                <AtSign size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Chỉ thông báo khi được nhắc tên (@mention)
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Bỏ qua tin nhắn thông thường và chỉ đổ chuông khi có ai đó tag tên bạn.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMentions}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                mentionsOnly ? "bg-[var(--accent-primary)]" : "bg-zinc-600/40"
              }`}
            >
              <span
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  mentionsOnly ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
