import React, { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, X, Fire } from "@phosphor-icons/react";

interface GifItem {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
}

const PRESET_GIFS: GifItem[] = [
  // Coding / Tech
  {
    id: "g1",
    title: "Coding Cat",
    url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif",
    category: "code",
    tags: ["cat", "code", "dev", "keyboard", "work", "mèo", "lập trình"],
  },
  {
    id: "g2",
    title: "Hacking furiously",
    url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif",
    category: "code",
    tags: ["hack", "fast", "typing", "matrix", "code", "gõ phím"],
  },
  {
    id: "g3",
    title: "It works on my machine",
    url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
    category: "code",
    tags: ["works", "bug", "code", "fix", "chạy được rồi"],
  },
  // Celebrate / Yes
  {
    id: "g4",
    title: "Leo Cheers",
    url: "https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif",
    category: "celebrate",
    tags: ["cheers", "celebrate", "chúc mừng", "leo", "great"],
  },
  {
    id: "g5",
    title: "Minion Yay",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    category: "celebrate",
    tags: ["minion", "yay", "vui", "hoan hô", "tuyệt vời"],
  },
  {
    id: "g6",
    title: "Thumbs Up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    category: "yes",
    tags: ["ok", "good", "thumbs up", "đồng ý", "được"],
  },
  // Reactions / Funny
  {
    id: "g7",
    title: "Mind Blown",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    category: "wow",
    tags: ["mindblown", "wow", "shocked", "bất ngờ", "đỉnh"],
  },
  {
    id: "g8",
    title: "Popcorn Watching",
    url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif",
    category: "funny",
    tags: ["popcorn", "drama", "hóng", "xem kịch"],
  },
  {
    id: "g9",
    title: "Dancing Party",
    url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif",
    category: "celebrate",
    tags: ["dance", "party", "quẩy", "vui vẻ"],
  },
  {
    id: "g10",
    title: "Facepalm",
    url: "https://media.giphy.com/media/3oEjI67Egb8G9jN3Q4/giphy.gif",
    category: "funny",
    tags: ["facepalm", "cạn lời", "fail", "thua"],
  },
  {
    id: "g11",
    title: "Snoop Dogg Dance",
    url: "https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif",
    category: "celebrate",
    tags: ["vibe", "dance", "chill", "nhạc"],
  },
  {
    id: "g12",
    title: "Fire Flame",
    url: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif",
    category: "fire",
    tags: ["fire", "cháy", "nhiệt", "hot", "flame"],
  },
];

const CATEGORY_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "code", label: "Code & Dev" },
  { id: "celebrate", label: "Chúc mừng" },
  { id: "wow", label: "Kinh ngạc" },
  { id: "funny", label: "Hài hước" },
];

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (url: string, title: string) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ isOpen, onClose, onSelectGif }) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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

  const filteredGifs = PRESET_GIFS.filter((gif) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        gif.title.toLowerCase().includes(q) ||
        gif.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (activeTab === "all") return true;
    return gif.category === activeTab;
  });

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-16 z-50 w-80 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl shadow-2xl p-3.5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 select-none backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
          <Fire size={15} weight="fill" />
          <span>Thư viện ảnh GIF</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

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
          placeholder="Tìm kiếm GIF (mèo, code, vui...)"
          className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          autoFocus
        />
      </div>

      {/* Category Filter Chips */}
      {!search.trim() && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-0.75 rounded-md text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--accent-primary)] text-white font-semibold shadow-2xs"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* GIF Grid */}
      <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2 p-0.5 custom-scrollbar">
        {filteredGifs.length > 0 ? (
          filteredGifs.map((gif) => (
            <div
              key={gif.id}
              onClick={() => {
                onSelectGif(gif.url, gif.title);
                onClose();
              }}
              className="group relative h-24 rounded-lg overflow-hidden border border-[var(--border-color)] cursor-pointer bg-black/40 hover:border-[var(--accent-primary)] hover:scale-102 transition-all shadow-2xs"
            >
              <img
                src={gif.url}
                alt={gif.title}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                <span className="text-[10px] text-white font-medium truncate block">
                  {gif.title}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-6 text-center text-xs text-[var(--text-muted)]">
            Không tìm thấy GIF phù hợp.
          </div>
        )}
      </div>
    </div>
  );
};
