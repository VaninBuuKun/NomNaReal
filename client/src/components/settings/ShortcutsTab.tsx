import React from "react";
import { Command } from "lucide-react";

export const ShortcutsTab: React.FC = () => {
  const shortcuts = [
    { label: "Tìm kiếm tin nhắn & kênh nhanh", keys: ["Ctrl", "K"] },
    { label: "Gửi tin nhắn trong ô chat", keys: ["Enter"] },
    { label: "Xuống dòng trong ô gõ chat", keys: ["Shift", "Enter"] },
    { label: "Đóng modal hoặc thu gọn bảng bên phải", keys: ["Esc"] },
    { label: "Bật/Tắt danh sách thành viên", keys: ["Ctrl", "U"] },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Command size={18} className="text-[var(--accent-primary)]" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Phím tắt tăng tốc làm việc
          </h3>
        </div>

        <div className="divide-y divide-[var(--border-color)]/70">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-3 first:pt-1 last:pb-1 text-xs"
            >
              <span className="text-[var(--text-secondary)] font-medium">
                {s.label}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 rounded-[3px] bg-[var(--bg-chat)] border border-[var(--border-color)] font-mono text-[11px] font-bold text-[var(--text-primary)] shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
