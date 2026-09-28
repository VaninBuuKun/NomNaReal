import React, { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, Smiley, Heart, HandWaving, Sparkle } from "@phosphor-icons/react";

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    id: "frequent",
    label: "Thường dùng",
    icon: Sparkle,
    emojis: [
      "🔥", "❤️", "👍", "🚀", "😂", "🎉", "💡", "👏",
      "✨", "💯", "⚡", "🥳", "🤩", "🙏", "👀", "☕",
      "🤝", "🎯", "💪", "🎈", "🍕", "😎", "🫡", "🙌"
    ],
  },
  {
    id: "smileys",
    label: "Mặt cười",
    icon: Smiley,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
      "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛",
      "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏",
      "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😴", "😷"
    ],
  },
  {
    id: "gestures",
    label: "Cử chỉ",
    icon: HandWaving,
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🫰",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇",
      "☝️", "🫵", "👋", "🤚", "🖐️", "✋", "🖖", "👏",
      "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾"
    ],
  },
  {
    id: "hearts",
    label: "Biểu tượng & Tim",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "❤️‍🔥", "❤️‍🩹", "💯", "💢", "💥", "💫",
      "💦", "💨", "🕳️", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭"
    ],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
}) => {
  const [activeCategory, setActiveCategory] = useState("frequent");
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(search.trim()))
    : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-4 z-50 w-72 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none backdrop-blur-md"
    >
      {/* Search Input */}
      <div className="relative flex items-center">
        <MagnifyingGlass
          size={14}
          className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm biểu cảm..."
          className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          autoFocus
        />
      </div>

      {/* Category Tabs */}
      {!search.trim() && (
        <div className="flex items-center gap-1 border-b border-[var(--border-color)] pb-1.5">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer ${
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                }`}
                title={cat.label}
              >
                <Icon size={16} weight={isActive ? "fill" : "regular"} />
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="max-h-52 overflow-y-auto grid grid-cols-8 gap-1 p-0.5 custom-scrollbar">
        {currentEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-7 h-7 flex items-center justify-center text-lg hover:bg-[var(--bg-surface-active)] rounded-md hover:scale-125 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
