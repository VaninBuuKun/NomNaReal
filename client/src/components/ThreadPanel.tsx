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
      className="thread-sidebar"
      id="threadSidebar"
      style={{
        width: `${width}px`,
        minWidth: '360px',
        maxWidth: '720px',
        flexShrink: 0,
        display: 'flex',
      }}
    >
      {/* 1. Thread Header */}
      <div className="thread-top-bar">
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
          className="icon-tool-btn"
          onClick={onClose}
          title="Đóng bảng thread (Esc)"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* 2. Messages List */}
      <div className="thread-content-list flex-1 overflow-y-auto p-4 flex flex-col gap-3">
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
            <div key={r.id} className="chat-bubble-row group relative p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-all">
              <div
                className="bubble-avatar"
                style={{
                  width: '30px',
                  height: '30px',
                  fontSize: '0.74rem',
                  background: r.color,
                }}
              >
                {r.initials}
              </div>
              <div className="bubble-body flex-1 min-w-0">
                <div className="bubble-header flex items-baseline gap-2">
                  <span className="sender-name text-xs font-bold text-[var(--text-primary)]">
                    {r.sender}
                  </span>
                  <span className="role-badge text-[0.62rem]">
                    {isMe ? 'YOU' : 'DEV'}
                  </span>
                  <span className="send-time text-[0.68rem] text-[var(--text-muted)]">{r.time}</span>
                </div>

                <div className="bubble-content text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed">
                  {r.content}
                </div>

                {/* Optional code snippet */}
                {r.codeSnippet && (
                  <div className="code-snippet text-[0.75rem] p-2.5 rounded-lg mt-2 font-mono overflow-x-auto">
                    {r.codeSnippet}
                  </div>
                )}

                {/* Emoji reactions row */}
                {r.reactions && Object.keys(r.reactions).length > 0 && (
                  <div className="reaction-row flex gap-1.5 mt-2 flex-wrap">
                    {Object.entries(r.reactions).map(([emoji, item]) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => toggleReaction(r.id, emoji)}
                        className={`reaction-button text-[0.72rem] px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                          item.active
                            ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
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
              <div className="float-action-toolbar opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="toolbar-icon-btn"
                  title="Thả tim"
                  onClick={() => toggleReaction(r.id, '❤️')}
                >
                  <Heart size={14} weight="fill" className="text-red-500" />
                </button>
                <button
                  type="button"
                  className="toolbar-icon-btn"
                  title="Like"
                  onClick={() => toggleReaction(r.id, '👍')}
                >
                  👍
                </button>
                <button
                  type="button"
                  className="toolbar-icon-btn"
                  title="Fire"
                  onClick={() => toggleReaction(r.id, '🔥')}
                >
                  🔥
                </button>
                <button
                  type="button"
                  className="toolbar-icon-btn"
                  title="Rocket"
                  onClick={() => toggleReaction(r.id, '🚀')}
                >
                  🚀
                </button>
                <button type="button" className="toolbar-icon-btn" title="Ghim">
                  <PushPin size={13} />
                </button>
                {isMe && (
                  <button type="button" className="toolbar-icon-btn" title="Chỉnh sửa">
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
      <div className="chat-input-area p-3 shrink-0">
        <div className="input-card">
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
            className="message-textarea"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => onExpandWidth && onExpandWidth()}
            placeholder="Trả lời trong thread... (Enter để gửi, Shift+Enter xuống dòng)"
          />

          <div className="input-toolbar">
            <div className="toolbar-left flex items-center gap-1">
              <button
                type="button"
                className="icon-tool-btn"
                title="Đính kèm tệp tin"
                onClick={() => alert('Chọn tệp đính kèm trong thread')}
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                className={`icon-tool-btn ${showEmojiBar ? 'text-[var(--accent-primary)]' : ''}`}
                title="Thêm Emoji"
                onClick={() => setShowEmojiBar(!showEmojiBar)}
              >
                <Smiley size={16} />
              </button>
              <button
                type="button"
                className="icon-tool-btn"
                title="Chèn mã code"
                onClick={insertCodeTemplate}
              >
                <Code size={16} />
              </button>
              <button
                type="button"
                className="icon-tool-btn"
                title="Gửi hình ảnh"
                onClick={() => alert('Chọn hình ảnh để tải lên thread')}
              >
                <ImageIcon size={16} />
              </button>
            </div>

            <div className="toolbar-right">
              <button
                type="button"
                className="submit-send-btn"
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
