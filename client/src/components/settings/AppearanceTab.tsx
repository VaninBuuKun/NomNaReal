import React, { useState } from "react";
import { Check } from "lucide-react";

export const AppearanceTab: React.FC = () => {
  const [density, setDensity] = useState<"cozy" | "compact">(() => {
    return (localStorage.getItem("nomna_message_density") as "cozy" | "compact") || "cozy";
  });

  const handleDensityChange = (newDensity: "cozy" | "compact") => {
    setDensity(newDensity);
    localStorage.setItem("nomna_message_density", newDensity);
  };

  return (
    <div className="space-y-6">
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
