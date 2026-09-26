import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlass,
  Users,
  PushPin,
  ChatCenteredDots,
  Paperclip,
  Smiley,
  Code,
  PaperPlaneRight,
  Heart,
  ChatTeardropDots,
  PencilSimple,
} from '@phosphor-icons/react';
import type { Channel, Message, User } from '../types';

interface ChatAreaProps {
  currentChannel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  onSendMessage: (content: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  typingUser: string | null;
  onToggleThread: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentChannel,
  messages,
  currentUser,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  typingUser,
  onToggleThread,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, { count: number; active: boolean }>>>({
    default: {
      '🔥': { count: 4, active: true },
      '👍': { count: 2, active: false },
      '🚀': { count: 5, active: true },
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onStartTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSendMessage(text);
      setContent('');
      onStopTyping();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = prev[msgId] || {
        '🔥': { count: 2, active: false },
        '👍': { count: 1, active: false },
      };
      const current = msgReactions[emoji] || { count: 0, active: false };
      const newActive = !current.active;
      const newCount = newActive ? current.count + 1 : Math.max(0, current.count - 1);

      return {
        ...prev,
        [msgId]: {
          ...msgReactions,
          [emoji]: { count: newCount, active: newActive },
        },
      };
    });
  };

  return (
    <section className="flex-1 h-full min-h-0 bg-[var(--bg-chat)] flex flex-col overflow-hidden relative">
      {/* Header Chat */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-5 flex items-center justify-between bg-[var(--bg-chat)] shrink-0 select-none">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)] whitespace-nowrap">
            # {currentChannel?.name || 'general'}
          </h2>
          <span className="text-[0.8rem] text-[var(--text-muted)] border-l border-[var(--border-color)] pl-2.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {currentChannel?.topic || 'Kênh trao đổi ý kiến và cập nhật tiến độ'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Tìm kiếm trong kênh"
          >
            <MagnifyingGlass size={17} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Thành viên"
          >
            <Users size={17} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Ghim"
          >
            <PushPin size={17} />
          </button>
        </div>
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 min-h-0 p-5 overflow-y-auto flex flex-col gap-3" id="messageStream">
        {messages.length === 0 ? (
          <div className="m-auto text-center text-[var(--text-muted)] select-none">
            <div className="text-4xl mb-2">💬</div>
            <p className="font-bold text-[var(--text-primary)] mb-1">
              Chào mừng bạn đến với #{currentChannel?.name || 'general'}
            </p>
            <p className="text-sm">
              Chưa có tin nhắn nào trong kênh này. Hãy là người bắt đầu cuộc trò chuyện nhé!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const initials = msg.senderDisplayName.slice(0, 2).toUpperCase() || 'US';
            const msgReactions = reactions[msg.id] || (index === 0 ? reactions.default : null);

            return (
              <div key={msg.id} className="group relative flex gap-3 px-3 py-2 rounded-xl transition-all duration-150 hover:bg-[var(--bg-surface)]">
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-[0.82rem] text-white shadow-sm"
                  style={{
                    background: isMe
                      ? 'var(--accent-primary)'
                      : index % 2 === 0
                      ? '#3b82f6'
                      : '#10b981',
                  }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.75">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[0.9rem] font-semibold text-[var(--text-primary)]">{msg.senderDisplayName}</span>
                    <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                      {isMe ? 'YOU' : index === 0 ? 'LEAD' : 'MEMBER'}
                    </span>
                    <span className="text-[0.72rem] text-[var(--text-muted)]">{timeStr}</span>
                  </div>
                  <div className="text-[0.92rem] leading-relaxed text-[var(--text-primary)] break-words whitespace-pre-wrap">{msg.content}</div>

                  {/* Render code snippet preview if message references code */}
                  {msg.content.includes('ApplicationDbContext') && (
                    <div className="bg-[var(--code-bg)] text-[var(--code-text)] rounded-lg px-3.5 py-2.5 mt-1.5 font-mono text-[0.82rem] leading-normal overflow-x-auto">
                      {`public interface IApplicationDbContext {\n    DbSet<User> Users { get; }\n    DbSet<Workspace> Workspaces { get; }\n    Task<int> SaveChangesAsync(CancellationToken ct = default);\n}`}
                    </div>
                  )}

                  {/* Reactions */}
                  {msgReactions && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {Object.entries(msgReactions).map(([emoji, item]) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`border rounded-md px-2 py-0.75 text-[0.78rem] inline-flex items-center gap-1.25 cursor-pointer transition-all duration-150 ${
                            item.active
                              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                              : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-surface-active)]'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {index === 1 && (
                    <div className="inline-flex items-center gap-1.5 mt-1.5 text-[0.8rem] text-[var(--accent-primary)] font-semibold cursor-pointer hover:underline" onClick={onToggleThread}>
                      <ChatTeardropDots size={14} weight="fill" />
                      <span>2 replies · Cập nhật 3 phút trước</span>
                    </div>
                  )}
                </div>

                {/* Toolbar on hover */}
                <div className="absolute -top-3 right-3.5 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-lg p-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-md z-10">
                  <button
                    type="button"
                    className="p-1 px-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                    title="Thả tim"
                    onClick={() => toggleReaction(msg.id, '❤️')}
                  >
                    <Heart size={14} weight="fill" className="text-red-500" />
                  </button>
                  <button
                    type="button"
                    className="p-1 px-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                    title="Reply Thread"
                    onClick={onToggleThread}
                  >
                    <ChatCenteredDots size={14} />
                  </button>
                  <button type="button" className="p-1 px-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer" title="Ghim">
                    <PushPin size={14} />
                  </button>
                  {isMe && (
                    <button type="button" className="p-1 px-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer" title="Chỉnh sửa">
                      <PencilSimple size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="px-6 py-1 text-xs text-[var(--text-muted)] flex items-center gap-2 min-h-5.5 shrink-0">
        {typingUser ? (
          <>
            <div className="typing-wave">
              <span />
              <span />
              <span />
            </div>
            <span>
              <strong>{typingUser}</strong> đang soạn tin nhắn...
            </span>
          </>
        ) : null}
      </div>

      {/* Chat Input Box */}
      <div className="px-5 pb-4.5 shrink-0">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-2.5 px-3.5 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_4px_16px_var(--accent-glow)]">
          <textarea
            className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[0.92rem] resize-none w-full leading-normal"
            rows={2}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Nhắn tin tới #${currentChannel?.name || 'general'}... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)`}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp tin"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Thêm Emoji"
              >
                <Smiley size={16} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Chèn mã code"
              >
                <Code size={16} />
              </button>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                className="bg-[var(--accent-primary)] text-white border-none px-3.5 py-1.5 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 shadow-[0_2px_8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={handleSend}
                disabled={!content.trim() || sending}
              >
                <span>{sending ? 'Đang gửi...' : 'Gửi tin'}</span>
                <PaperPlaneRight size={14} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
