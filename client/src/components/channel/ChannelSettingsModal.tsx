import React, { useState, useEffect } from 'react';
import {
  Gear,
  ShieldCheck,
  Trash,
  X,
  Hash,
  SpeakerHigh,
  Folder,
} from '@phosphor-icons/react';
import { Modal } from '../ui';
import { ChannelType, type Channel, type Workspace } from '../../types';
import {
  ChannelOverviewTab,
  ChannelPermissionsTab,
  ChannelDangerZoneTab,
  type ChannelSettingsTab,
} from './settings';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  workspace: Workspace | null;
  categories?: Channel[];
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  channel,
  workspace,
  categories = [],
  onChannelUpdated,
  onChannelDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<ChannelSettingsTab>('overview');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, channel?.id]);

  if (!channel) return null;

  const isCategory = channel.type === ChannelType.Category;
  const isVoice = channel.type === ChannelType.Voice;

  const getChannelPrefix = () => {
    if (isCategory) return <Folder size={14} weight="bold" className="shrink-0 text-[var(--text-muted)]" />;
    if (isVoice) return <SpeakerHigh size={14} weight="bold" className="shrink-0 text-[var(--text-muted)]" />;
    return <Hash size={14} weight="bold" className="shrink-0 text-[var(--text-muted)]" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="max-w-4xl h-[600px] p-0 overflow-hidden flex flex-col"
    >
      <div className="flex flex-1 min-h-0 h-full overflow-hidden">
        {/* 1. Left Navigation Sidebar */}
        <div className="w-56 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col shrink-0 p-3 select-none">
          <div className="flex items-center gap-1.5 pb-3 mb-2 border-b border-[var(--border-color)]/60 min-w-0">
            {getChannelPrefix()}
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
              {channel.name}
            </span>
          </div>

          <nav className="flex-1 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Gear size={16} weight={activeTab === 'overview' ? 'bold' : 'regular'} />
              <span>Tổng quan</span>
            </button>

            {!isCategory && (
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'permissions'
                    ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <ShieldCheck size={16} weight={activeTab === 'permissions' ? 'bold' : 'regular'} />
                <span>Quyền hạn</span>
              </button>
            )}

            <div className="pt-2 mt-2 border-t border-[var(--border-color)]/60">
              <button
                type="button"
                onClick={() => setActiveTab('delete')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'delete'
                    ? 'bg-rose-500/15 text-rose-500 font-semibold'
                    : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-500'
                }`}
              >
                <Trash size={16} weight={activeTab === 'delete' ? 'bold' : 'regular'} />
                <span>{isCategory ? 'Xóa danh mục' : 'Xóa kênh'}</span>
              </button>
            </div>
          </nav>

          <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>ESC để thoát</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* 2. Main Content Tab View */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
          {activeTab === 'overview' && (
            <ChannelOverviewTab
              channel={channel}
              categories={categories}
              onChannelUpdated={onChannelUpdated}
            />
          )}

          {activeTab === 'permissions' && !isCategory && (
            <ChannelPermissionsTab
              channel={channel}
              workspace={workspace}
            />
          )}

          {activeTab === 'delete' && (
            <ChannelDangerZoneTab
              channel={channel}
              onChannelDeleted={onChannelDeleted}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
