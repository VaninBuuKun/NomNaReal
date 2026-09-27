import React from 'react';
import { Hash, Sparkle, LockSimple, ChatCenteredDots } from '@phosphor-icons/react';
import type { Channel } from '../../types';

interface EmptyChatStateProps {
  currentChannel: Channel | null;
  onSelectPrompt: (text: string) => void;
}

const STARTER_PROMPTS = [
  { emoji: '👋', text: 'Chào mọi người! Rất vui được tham gia thảo luận cùng team.' },
  { emoji: '🚀', text: 'Hôm nay tiến độ công việc thế nào rồi anh em?' },
  { emoji: '☕', text: 'Chúc cả nhà một ngày làm việc hiệu quả và tràn đầy năng lượng!' },
  { emoji: '💡', text: 'Mình có một số ý tưởng muốn bàn bạc cùng mọi người trong kênh.' },
];

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  currentChannel,
  onSelectPrompt,
}) => {
  // If no channel is selected
  if (!currentChannel) {
    return (
      <div className="m-auto flex flex-col items-center text-center p-8 max-w-md select-none animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-[0_10px_35px_var(--accent-glow)] flex items-center justify-center mb-5">
          <div className="w-full h-full rounded-[22px] bg-[var(--bg-chat)] flex items-center justify-center overflow-hidden">
            <ChatCenteredDots size={40} weight="duotone" className="text-[var(--accent-primary)] animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
          Chào mừng đến với NomNa!
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
          Hãy chọn một kênh thảo luận ở danh sách bên trái hoặc tạo kênh mới để bắt đầu trò chuyện cùng các thành viên.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] shadow-xs">
          <span>👈</span>
          <span>Chọn một kênh trên thanh điều hướng để mở chat</span>
        </div>
      </div>
    );
  }

  const isPrivate = currentChannel.isPrivate;

  return (
    <div className="m-auto flex flex-col items-center text-center p-6 md:p-8 max-w-xl select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Glowing Hero Icon Badge */}
      <div className="relative mb-5 flex items-center justify-center group">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-[0_10px_35px_var(--accent-glow)] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <div className="w-full h-full rounded-[22px] bg-[var(--bg-chat)] flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-transparent" />
            {isPrivate ? (
              <LockSimple size={38} weight="bold" className="text-[var(--accent-primary)] relative z-10" />
            ) : (
              <Hash size={40} weight="bold" className="text-[var(--accent-primary)] relative z-10" />
            )}
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[var(--bg-chat)] flex items-center justify-center shadow-md animate-bounce">
          <Sparkle size={12} weight="fill" className="text-white" />
        </div>
      </div>

      {/* Channel Header Title */}
      <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">
        Chào mừng đến với #{currentChannel.name}!
      </h2>

      {/* Friendly Description */}
      <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed mb-6">
        Đây là điểm khởi đầu của kênh <strong>#{currentChannel.name}</strong>. Hãy gửi lời chào đầu tiên hoặc bấm vào gợi ý bên dưới để bắt đầu cuộc trò chuyện sôi nổi!
      </p>

      {/* Starter Prompts Box */}
      <div className="w-full max-w-lg">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center justify-center gap-1.5">
          <Sparkle size={14} weight="fill" className="text-amber-500" />
          <span>Gợi ý mở đầu cuộc trò chuyện</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {STARTER_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(prompt.text)}
              className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent-primary)] text-left transition-all duration-200 group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-lg group-hover:scale-125 transition-transform shrink-0">
                {prompt.emoji}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] leading-relaxed">
                {prompt.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="flex items-center justify-center gap-4 mt-7 pt-4 border-t border-[var(--border-color)]/60 text-[11px] text-[var(--text-muted)] w-full max-w-md">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span>Realtime SignalR</span>
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
          <span>File & Video 100MB</span>
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
          <span>Thread thảo luận</span>
        </span>
      </div>
    </div>
  );
};
