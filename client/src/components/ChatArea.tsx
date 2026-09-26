import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare, Paperclip, Smile, Code } from 'lucide-react';
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
  isThreadOpen: boolean;
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
  isThreadOpen,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
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

  return (
    <section style={{
      flex: 1,
      backgroundColor: 'var(--bg-chat)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top Header */}
      <div style={{
        height: '54px',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-chat)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hash size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {currentChannel?.name || 'general'}
          </h2>
          {currentChannel?.topic && (
            <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '10px'
            }}>
              {currentChannel.topic}
            </span>
          )}
        </div>

        <div>
          <button
            onClick={onToggleThread}
            title="Mở bảng thảo luận Thread"
            style={{
              background: isThreadOpen ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: isThreadOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={14} />
            <span>Thread</span>
          </button>
        </div>
      </div>

      {/* Message List Stream */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.88rem'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
            Chưa có tin nhắn nào trong kênh này. Hãy là người bắt đầu cuộc trò chuyện!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const initials = msg.senderDisplayName.slice(0, 2).toUpperCase();

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isMe ? 'var(--accent-primary)' : '#3b82f6',
                  color: '#fff',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}>
                  {initials}
                </div>

                {/* Message Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {msg.senderDisplayName}
                    </span>
                    {isMe ? (
                      <span style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        YOU
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#3b82f6',
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        MEMBER
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {timeStr}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      <div style={{
        padding: '2px 24px 6px 24px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: '22px',
        flexShrink: 0
      }}>
        {typingUser ? (
          <>
            <div style={{ display: 'flex', gap: '3px' }}>
              <span style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '-0.32s' }} />
              <span style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '-0.16s' }} />
              <span style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out' }} />
            </div>
            <span><strong>{typingUser}</strong> đang soạn tin nhắn...</span>
          </>
        ) : null}
      </div>

      {/* Chat Input Area */}
      <div style={{ padding: '0 20px 18px 20px', flexShrink: 0 }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}>
          <textarea
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={`Nhắn tin tại #${currentChannel?.name || 'general'}... (Nhấn Enter để gửi)`}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              resize: 'none',
              width: '100%',
              lineHeight: 1.4
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                type="button" 
                title="Đính kèm tệp" 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Paperclip size={16} />
              </button>
              <button 
                type="button" 
                title="Biểu tượng cảm xúc" 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Smile size={16} />
              </button>
              <button 
                type="button" 
                title="Chèn mã code" 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Code size={16} />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={!content.trim() || sending}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: !content.trim() || sending ? 'not-allowed' : 'pointer',
                opacity: !content.trim() || sending ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 12px var(--accent-glow)'
              }}
            >
              <span>{sending ? 'Đang gửi...' : 'Gửi'}</span>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
