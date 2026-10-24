import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTheme, type ThemeName } from "../../hooks/useTheme";

export const AppearanceTab: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();

  const [density, setDensity] = useState<"cozy" | "compact">(() => {
    return (localStorage.getItem("nomna_message_density") as "cozy" | "compact") || "cozy";
  });

  const handleDensityChange = (newDensity: "cozy" | "compact") => {
    setDensity(newDensity);
    localStorage.setItem("nomna_message_density", newDensity);
  };

  return (
    <div className="space-y-6">
      {/* 1. Theme Color Selector */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[8px] p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Giao diện & Bảng màu
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
              <Sparkles size={11} /> 3 Bảng màu tuyển chọn
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Chọn phong cách màu sắc phù hợp với bạn. Mặc định là màu đen, có thêm 2 tùy chọn tím violet và đen than chì onyx.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id as ThemeName)}
                className={`p-3.5 rounded-[8px] border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/30 ring-1 ring-[var(--accent-primary)] shadow-xs"
                    : "border-[var(--border-color)] bg-[var(--bg-chat)] hover:bg-[var(--bg-surface-active)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ background: t.primaryColor }}
                      />
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {t.name}
                      </span>
                    </div>
                    {isSelected && <Check size={14} className="text-[var(--accent-primary)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {t.description}
                  </p>
                </div>
                {t.badge && (
                  <div className="mt-3 pt-2 border-t border-[var(--border-color)]/50">
                    <span className="text-[10px] font-semibold text-[var(--accent-primary)]">
                      {t.badge}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Message Density */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[8px] p-5 space-y-4">
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
            className={`p-3.5 rounded-[8px] border cursor-pointer transition-all ${
              density === "cozy"
                ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/30 ring-1 ring-[var(--accent-primary)]"
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
            className={`p-3.5 rounded-[8px] border cursor-pointer transition-all ${
              density === "compact"
                ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]/30 ring-1 ring-[var(--accent-primary)]"
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
