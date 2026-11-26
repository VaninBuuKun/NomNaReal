import React, { useState, useEffect } from 'react';
import {
  Gear,
  ShieldCheck,
  Trash,
  ArrowLeft,
  Hash,
  SpeakerHigh,
  Folder,
} from '@phosphor-icons/react';
import { Modal } from '../ui';
import { ChannelType, type Channel, type Server, type Workspace } from '../../types';
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
  server?: Server | null;
  workspace?: Workspace | null;
  categories?: Channel[];
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  channel,
  server,
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
  const isVoice = channel.type === ChannelType.Voice || Number(channel.type) === 1;

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
          {/* Back button at top of settings sidebar */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer group"
          >
            <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-1.5 pb-2.5 mb-2 border-b border-[var(--border-color)]/60 min-w-0">
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

          <div className="pt-3 border-t border-[var(--border-color)]/60">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeft size={14} weight="bold" />
                <span>Quay lại</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">ESC</span>
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
              server={server}
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
