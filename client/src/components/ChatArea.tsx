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
    <section className="chat-container">
      {/* Header Chat */}
      <div className="chat-top-header">
        <div className="chat-header-info">
          <h2># {currentChannel?.name || 'general'}</h2>
          <span className="header-desc">
            {currentChannel?.topic || 'Kênh trao đổi ý kiến và cập nhật tiến độ'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button type="button" className="icon-tool-btn" title="Tìm kiếm trong kênh">
            <MagnifyingGlass size={17} />
          </button>
          <button type="button" className="icon-tool-btn" title="Thành viên">
            <Users size={17} />
          </button>
          <button type="button" className="icon-tool-btn" title="Ghim">
            <PushPin size={17} />
          </button>
        </div>
      </div>

      {/* Message Stream Area */}
      <div className="message-stream" id="messageStream">
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Chào mừng bạn đến với #{currentChannel?.name || 'general'}
            </p>
            <p style={{ fontSize: '0.85rem' }}>
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
              <div key={msg.id} className="chat-bubble-row">
                <div
                  className="bubble-avatar"
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
                <div className="bubble-body">
                  <div className="bubble-header">
                    <span className="sender-name">{msg.senderDisplayName}</span>
                    <span className="role-badge">
                      {isMe ? 'YOU' : index === 0 ? 'LEAD' : 'MEMBER'}
                    </span>
                    <span className="send-time">{timeStr}</span>
                  </div>
                  <div className="bubble-content">{msg.content}</div>

                  {/* Render code snippet preview if message references code */}
                  {msg.content.includes('ApplicationDbContext') && (
                    <div className="code-snippet">
                      {`public interface IApplicationDbContext {\n    DbSet<User> Users { get; }\n    DbSet<Workspace> Workspaces { get; }\n    Task<int> SaveChangesAsync(CancellationToken ct = default);\n}`}
                    </div>
                  )}

                  {/* Reactions */}
                  {msgReactions && (
                    <div className="reaction-row">
                      {Object.entries(msgReactions).map(([emoji, item]) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`reaction-button ${item.active ? 'active' : ''}`}
                        >
                          <span>{emoji}</span>
                          <span>{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {index === 1 && (
                    <div className="thread-link-badge" onClick={onToggleThread}>
                      <ChatTeardropDots size={14} weight="fill" />
                      <span>2 replies · Cập nhật 3 phút trước</span>
                    </div>
                  )}
                </div>

                {/* Toolbar on hover */}
                <div className="float-action-toolbar">
                  <button
                    type="button"
                    className="toolbar-icon-btn"
                    title="Thả tim"
                    onClick={() => toggleReaction(msg.id, '❤️')}
                  >
                    <Heart size={14} weight="fill" className="text-red-500" />
                  </button>
                  <button
                    type="button"
                    className="toolbar-icon-btn"
                    title="Reply Thread"
                    onClick={onToggleThread}
                  >
                    <ChatCenteredDots size={14} />
                  </button>
                  <button type="button" className="toolbar-icon-btn" title="Ghim">
                    <PushPin size={14} />
                  </button>
                  {isMe && (
                    <button type="button" className="toolbar-icon-btn" title="Chỉnh sửa">
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
      <div className="typing-status-bar">
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
      <div className="chat-input-area">
        <div className="input-card">
          <textarea
            className="message-textarea"
            rows={2}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Nhắn tin tới #${currentChannel?.name || 'general'}... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)`}
          />

          <div className="input-toolbar">
            <div className="toolbar-left">
              <button type="button" className="icon-tool-btn" title="Đính kèm tệp tin">
                <Paperclip size={16} />
              </button>
              <button type="button" className="icon-tool-btn" title="Thêm Emoji">
                <Smiley size={16} />
              </button>
              <button type="button" className="icon-tool-btn" title="Chèn mã code">
                <Code size={16} />
              </button>
            </div>
            <div className="toolbar-right">
              <button
                type="button"
                className="submit-send-btn"
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
