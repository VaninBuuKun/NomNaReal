import React from 'react';
import { X, Send } from 'lucide-react';
import type { Message, User } from '../types';

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  parentMessage?: Message | null;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <aside style={{
      width: '320px',
      backgroundColor: 'var(--bg-sidebar)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        height: '54px',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: '0.92rem',
        flexShrink: 0
      }}>
        <span>Luồng thảo luận (Thread)</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Replies Stream */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Alex Rivers:
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
            Chào mừng mọi người đến với PulseChat! Hệ thống Backend .NET 9 và SignalR đã sẵn sàng hoạt động.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#10b981',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 700,
            flexShrink: 0
          }}>
            MD
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Minh Dev</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10:33 AM</span>
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '2px', color: 'var(--text-primary)' }}>
              Đã test thử qua SignalR WebSocket, tốc độ gửi nhận &lt; 5ms cực phê!
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-rail)',
        display: 'flex',
        gap: '6px',
        flexShrink: 0
      }}>
        <input
          type="text"
          placeholder="Trả lời trong thread..."
          style={{
            flex: 1,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button
          type="button"
          style={{
            background: 'var(--accent-primary)',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            padding: '0 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </aside>
  );
};
