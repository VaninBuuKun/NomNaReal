import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PaperPlaneRight,
  Paperclip,
  Smiley,
  Code,
  Image as ImageIcon,
  Heart,
  ChatCenteredDots,
  PushPin,
  PencilSimple,
} from '@phosphor-icons/react';
import type { Message, User } from '../types';

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  parentMessage?: Message | null;
  width?: number;
  onExpandWidth?: () => void;
}

interface ThreadReply {
  id: string;
  sender: string;
  initials: string;
  time: string;
  color: string;
  content: string;
  codeSnippet?: string;
  reactions?: Record<string, { count: number; active: boolean }>;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  width = 480,
  onExpandWidth,
}) => {
  const [replyText, setReplyText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [replies, setReplies] = useState<ThreadReply[]>([
    {
      id: 'r1',
      sender: 'Duc Nguyen',
      initials: 'DN',
      time: '10:33 AM',
      color: '#ea580c',
      content: 'Style màu cam ấm này đọc text lâu không bị mỏi mắt như nền trắng tinh 100%. Rất hợp với phong cách Arc & Linear.',
      reactions: { '👍': { count: 3, active: true }, '🔥': { count: 2, active: false } },
    },
    {
      id: 'r2',
      sender: 'Sarah Miller',
      initials: 'SM',
      time: '10:35 AM',
      color: '#8b5cf6',
      content: 'Đồng ý luôn! Thiết kế theo Clean Architecture và CQRS giúp code phân tách rất rõ ràng, MediatR Pipeline Behavior xử lý validation chuẩn chỉ.',
      codeSnippet: `// MediatR Command Handler tách biệt\npublic class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, Result<MessageDto>> {\n    // Handler độc lập, dễ test\n}`,
      reactions: { '❤️': { count: 4, active: true }, '🚀': { count: 2, active: true } },
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies.length, isOpen]);

  if (!isOpen) return null;

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    let content = replyText.trim();
    let codeSnippet: string | undefined = undefined;

    // Check if reply contains markdown code block
    const codeMatch = content.match(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/);
    if (codeMatch) {
      codeSnippet = codeMatch[1].trim();
      content = content.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/, '').trim();
      if (!content) content = 'Đã chia sẻ đoạn mã nguồn:';
    }

    const newReply: ThreadReply = {
      id: `r-${Date.now()}`,
      sender: currentUser?.displayName || 'Bạn',
      initials: currentUser?.displayName.slice(0, 2).toUpperCase() || 'ME',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: 'var(--accent-primary)',
      content,
      codeSnippet,
      reactions: {},
    };

    setReplies((prev) => [...prev, newReply]);
    setReplyText('');
    setShowEmojiBar(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const toggleReaction = (replyId: string, emoji: string) => {
    setReplies((prev) =>
      prev.map((r) => {
        if (r.id !== replyId) return r;
        const currentReactions = r.reactions || {};
        const existing = currentReactions[emoji];
        if (existing) {
          const nextActive = !existing.active;
          const nextCount = existing.count + (nextActive ? 1 : -1);
          if (nextCount <= 0) {
            const copy = { ...currentReactions };
            delete copy[emoji];
            return { ...r, reactions: copy };
          }
          return {
            ...r,
            reactions: {
              ...currentReactions,
              [emoji]: { count: nextCount, active: nextActive },
            },
          };
        }
        return {
          ...r,
          reactions: {
            ...currentReactions,
            [emoji]: { count: 1, active: true },
          },
        };
      })
    );
  };

  const insertEmoji = (emoji: string) => {
    setReplyText((prev) => prev + emoji);
    setShowEmojiBar(false);
  };

  const insertCodeTemplate = () => {
    setReplyText((prev) => prev + '\n```csharp\n// Nhập mã code tại đây\n```\n');
  };

  return (
    <aside
      id="threadSidebar"
      className="h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] flex flex-col overflow-hidden min-w-[360px] max-w-[720px]"
      style={{ width: `${width}px` }}
    >
      {/* 1. Thread Header */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-4 flex items-center justify-between font-bold text-[0.92rem] shrink-0 bg-[var(--bg-sidebar)] select-none">
        <div className="flex items-center gap-2">
          <ChatCenteredDots size={17} weight="bold" className="text-[var(--accent-primary)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">
            Thread thảo luận
          </span>
          <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            {replies.length} phản hồi
          </span>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
          onClick={onClose}
          title="Đóng bảng thread (Esc)"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* 2. Messages List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Parent Root Message Card */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#3b82f6] text-white text-[0.7rem] font-bold flex items-center justify-center">
                MD
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">Minh Dev</span>
              <span className="text-[0.62rem] font-bold uppercase px-1.5 py-0.2 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                LEAD
              </span>
            </div>
            <span className="text-[0.68rem] text-[var(--text-muted)]">10:30 AM</span>
          </div>
          <div className="text-xs text-[var(--text-primary)] leading-relaxed">
            SignalR Hub đã được cấu hình với JWT Authentication và tối ưu query qua IApplicationDbContext! Anh em test thử thread nhé!
          </div>
        </div>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Các câu trả lời
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Replies Stream */}
        {replies.map((r) => {
          const isMe = r.sender === 'Bạn' || (currentUser && r.sender === currentUser.displayName);
          return (
            <div key={r.id} className="group relative p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-all flex gap-3">
              <div
                className="w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center font-bold text-[0.74rem] text-white shadow-xs"
                style={{
                  background: r.color,
                }}
              >
                {r.initials}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {r.sender}
                  </span>
                  <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.62rem] px-1.5 py-0.2 rounded font-bold uppercase">
                    {isMe ? 'YOU' : 'DEV'}
                  </span>
                  <span className="text-[0.68rem] text-[var(--text-muted)]">{r.time}</span>
                </div>

                <div className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                  {r.content}
                </div>

                {/* Optional code snippet */}
                {r.codeSnippet && (
                  <div className="bg-[var(--code-bg)] text-[var(--code-text)] text-[0.75rem] p-2.5 rounded-lg mt-2 font-mono overflow-x-auto leading-normal">
                    {r.codeSnippet}
                  </div>
                )}

                {/* Emoji reactions row */}
                {r.reactions && Object.keys(r.reactions).length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {Object.entries(r.reactions).map(([emoji, item]) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => toggleReaction(r.id, emoji)}
                        className={`text-[0.72rem] px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          item.active
                            ? 'bg-[var(--accent-soft)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Floating Action Toolbar */}
              <div className="absolute -top-3 right-3 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-lg p-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-md z-10">
                <button
                  type="button"
                  className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                  title="Thả tim"
                  onClick={() => toggleReaction(r.id, '❤️')}
                >
                  <Heart size={14} weight="fill" className="text-red-500" />
                </button>
                <button
                  type="button"
                  className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                  title="Like"
                  onClick={() => toggleReaction(r.id, '👍')}
                >
                  👍
                </button>
                <button
                  type="button"
                  className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                  title="Fire"
                  onClick={() => toggleReaction(r.id, '🔥')}
                >
                  🔥
                </button>
                <button
                  type="button"
                  className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                  title="Rocket"
                  onClick={() => toggleReaction(r.id, '🚀')}
                >
                  🚀
                </button>
                <button
                  type="button"
                  className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                  title="Ghim"
                >
                  <PushPin size={13} />
                </button>
                {isMe && (
                  <button
                    type="button"
                    className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <PencilSimple size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Rich Chat Input Area for Thread */}
      <div className="p-3 shrink-0">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-2.5 px-3 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_4px_16px_var(--accent-glow)]">
          {/* Quick Emoji Bar Popup */}
          {showEmojiBar && (
            <div className="flex items-center gap-2 p-1.5 mb-1 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl shadow-md animate-in slide-in-from-bottom-2 duration-150">
              {['👍', '❤️', '🔥', '🚀', '👀', '🎉', '💡', '😂'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <textarea
            className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[0.88rem] resize-none w-full leading-normal"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => onExpandWidth && onExpandWidth()}
            placeholder="Trả lời trong thread... (Enter để gửi, Shift+Enter xuống dòng)"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp tin"
                onClick={() => alert('Chọn tệp đính kèm trong thread')}
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                className={`p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
                  showEmojiBar
                    ? 'text-[var(--accent-primary)] bg-[var(--accent-soft)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]'
                }`}
                title="Thêm Emoji"
                onClick={() => setShowEmojiBar(!showEmojiBar)}
              >
                <Smiley size={16} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Chèn mã code"
                onClick={insertCodeTemplate}
              >
                <Code size={16} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Gửi hình ảnh"
                onClick={() => alert('Chọn hình ảnh để tải lên thread')}
              >
                <ImageIcon size={16} />
              </button>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="bg-[var(--accent-primary)] text-white border-none px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 shadow-[0_2px_8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
              >
                <span>Trả lời</span>
                <PaperPlaneRight size={14} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
