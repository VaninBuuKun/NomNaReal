import React, { useState } from 'react';
import { X, PaperPlaneRight } from '@phosphor-icons/react';
import type { Message, User } from '../types';

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  parentMessage?: Message | null;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ isOpen, onClose }) => {
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState([
    {
      id: 'r1',
      sender: 'Duc Nguyen',
      initials: 'DN',
      time: '10:33 AM',
      color: '#ea580c',
      content: 'Style màu cam ấm này đọc text lâu không bị mỏi mắt như nền trắng tinh 100%.',
    },
    {
      id: 'r2',
      sender: 'Sarah Miller',
      initials: 'SM',
      time: '10:35 AM',
      color: '#8b5cf6',
      content: 'Đồng ý luôn! Thiết kế theo Clean Architecture và CQRS giúp code phân tách rất rõ ràng.',
    },
  ]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplies((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        sender: 'Bạn',
        initials: 'ME',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: 'var(--accent-primary)',
        content: replyText.trim(),
      },
    ]);
    setReplyText('');
  };

  return (
    <aside
      className="thread-sidebar"
      id="threadSidebar"
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div className="thread-top-bar">
        <span>Thread: Thảo luận kiến trúc</span>
        <button
          type="button"
          className="icon-tool-btn"
          onClick={onClose}
          title="Đóng bảng thread"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="thread-content-list">
        {/* Parent message header */}
        <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Minh Dev:
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: '4px', lineHeight: 1.4 }}>
            SignalR Hub đã được cấu hình với JWT Authentication và tối ưu query qua IApplicationDbContext!
          </div>
        </div>

        {/* Replies */}
        {replies.map((r) => (
          <div key={r.id} className="chat-bubble-row" style={{ padding: '6px 4px' }}>
            <div
              className="bubble-avatar"
              style={{ width: '28px', height: '28px', fontSize: '0.72rem', background: r.color }}
            >
              {r.initials}
            </div>
            <div className="bubble-body">
              <div className="bubble-header">
                <span className="sender-name" style={{ fontSize: '0.82rem' }}>
                  {r.sender}
                </span>
                <span className="send-time">{r.time}</span>
              </div>
              <div className="bubble-content" style={{ fontSize: '0.82rem' }}>
                {r.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="thread-input-box">
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            className="message-textarea"
            placeholder="Trả lời trong thread..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            style={{
              background: 'var(--bg-surface)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              flex: 1,
            }}
          />
          <button
            type="button"
            className="submit-send-btn"
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            style={{ padding: '8px 10px' }}
          >
            <PaperPlaneRight size={14} weight="fill" />
          </button>
        </div>
      </div>
    </aside>
  );
};
