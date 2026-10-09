import React, { useState } from "react";
import { Check } from "lucide-react";

interface AppearanceTabProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [density, setDensity] = useState<"cozy" | "compact">(() => {
    return (localStorage.getItem("nomna_message_density") as "cozy" | "compact") || "cozy";
  });

  const handleDensityChange = (newDensity: "cozy" | "compact") => {
    setDensity(newDensity);
    localStorage.setItem("nomna_message_density", newDensity);
  };

  const themes = [
    {
      id: "discord-dark",
      name: "Discord Dark (Mặc định)",
      desc: "Giao diện tối chuẩn Discord kinh điển với sắc tím blurple",
      colors: ["#1e1f22", "#5865f2", "#f2f3f5"],
    },
    {
      id: "warm-orange",
      name: "Trắng Cam Ấm (Warm Light)",
      desc: "Phong cách Arc Browser & Substack, màu cam ấm áp",
      colors: ["#f6f5f2", "#ff5a1f", "#1c1917"],
    },
    {
      id: "dark-zinc",
      name: "Dark Zinc (Tối Hiện Đại)",
      desc: "Tông màu đen xám phong cách Linear & Discord",
      colors: ["#09090b", "#6366f1", "#f4f4f6"],
    },
    {
      id: "clean-coral",
      name: "Trắng San Hô (Clean Coral)",
      desc: "Nền trắng sáng điểm xuyết sắc màu hồng san hô",
      colors: ["#ffffff", "#f43f5e", "#0f172a"],
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Theme Selection */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Chủ đề & Bảng màu (Theme)
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Chọn giao diện màu sắc bạn yêu thích. Hệ thống sẽ lưu và áp dụng ngay lập tức.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {themes.map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className={`relative rounded-[6px] border p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-200 select-none ${
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/40 shadow-sm ring-1 ring-[var(--accent-primary)]"
                    : "border-[var(--border-color)] bg-[var(--bg-chat)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-surface-active)]"
                }`}
              >
                {/* Palette color preview */}
                <div className="flex items-center gap-1.5">
                  {t.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  {isSelected && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {t.name}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Message Density */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Mật độ hiển thị tin nhắn
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tùy chỉnh khoảng cách giữa các khối tin nhắn trong phòng trò chuyện.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div
            onClick={() => handleDensityChange("cozy")}
            className={`p-3.5 rounded-[4px] border cursor-pointer transition-all ${
              density === "cozy"
                ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/40 ring-1 ring-[var(--accent-primary)]"
                : "border-[var(--border-color)] bg-[var(--bg-chat)] hover:bg-[var(--bg-surface-active)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">Thoải mái (Cozy)</span>
              {density === "cozy" && <Check size={14} className="text-[var(--accent-primary)]" />}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Hiển thị avatar lớn, khoảng cách rộng rãi, dễ nhìn.
            </p>
          </div>

          <div
            onClick={() => handleDensityChange("compact")}
            className={`p-3.5 rounded-[4px] border cursor-pointer transition-all ${
              density === "compact"
                ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/40 ring-1 ring-[var(--accent-primary)]"
                : "border-[var(--border-color)] bg-[var(--bg-chat)] hover:bg-[var(--bg-surface-active)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">Gọn gàng (Compact)</span>
              {density === "compact" && <Check size={14} className="text-[var(--accent-primary)]" />}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Thu nhỏ dòng tin nhắn, hiển thị được nhiều nội dung hơn.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
