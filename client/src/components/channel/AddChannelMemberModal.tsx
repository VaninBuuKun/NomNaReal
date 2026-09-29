import React, { useState, useMemo, useEffect } from 'react';
import {
  MagnifyingGlass,
  UserPlus,
  User,
  ShieldCheck,
  Check,
  Lock,
} from '@phosphor-icons/react';
import { Modal, Button, Spinner } from '../ui';
import type { Channel } from '../../types';
import type { DirectMessageUser } from '../dm';
import { channelApi } from '../../services/channelApi';

interface AddChannelMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  members: DirectMessageUser[];
  onMemberAdded?: (userId: string) => void;
}

export const AddChannelMemberModal: React.FC<AddChannelMemberModalProps> = ({
  isOpen,
  onClose,
  channel,
  members = [],
  onMemberAdded,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelMemberIds, setChannelMemberIds] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [addingUserIds, setAddingUserIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing channel members whenever modal opens
  useEffect(() => {
    if (isOpen && channel?.id) {
      let isMounted = true;
      setIsLoadingMembers(true);
      setErrorMessage(null);

      channelApi
        .getMembers(channel.id)
        .then((data) => {
          if (isMounted) {
            setChannelMemberIds(data.map((m) => m.userId));
          }
        })
        .catch((err) => {
          console.error('Failed to load channel members:', err);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingMembers(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else {
      setChannelMemberIds([]);
      setSearchTerm('');
      setErrorMessage(null);
    }
  }, [isOpen, channel?.id]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(term) ||
        m.username.toLowerCase().includes(term) ||
        (m.email && m.email.toLowerCase().includes(term))
    );
  }, [members, searchTerm]);

  const handleAddMember = async (member: DirectMessageUser) => {
    if (!channel?.id || addingUserIds.includes(member.id)) return;

    setAddingUserIds((prev) => [...prev, member.id]);
    setErrorMessage(null);

    try {
      await channelApi.addMember(channel.id, member.id);
      setChannelMemberIds((prev) => [...prev, member.id]);
      if (onMemberAdded) {
        onMemberAdded(member.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể thêm thành viên vào kênh.';
      setErrorMessage(msg);
    } finally {
      setAddingUserIds((prev) => prev.filter((id) => id !== member.id));
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setErrorMessage(null);
    onClose();
  };

  const getStatusColor = (status: DirectMessageUser['status']) => {
    switch (status) {
      case 'online':
        return 'bg-[var(--status-online)] shadow-[0_0_6px_rgba(22,163,74,0.4)]';
      case 'away':
        return 'bg-[var(--status-away)]';
      case 'dnd':
        return 'bg-[var(--status-dnd)]';
      case 'offline':
      default:
        return 'bg-neutral-400';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Lock size={18} weight="bold" className="text-amber-500 shrink-0" />
          <span>Thêm thành viên vào #{channel?.name || 'kênh'}</span>
        </div>
      }
      subtitle="Tìm kiếm thành viên trong không gian làm việc để cấp quyền vào kênh riêng tư này."
      className="max-w-[500px]"
    >
      <div className="p-5 flex flex-col gap-4">
        {errorMessage && (
          <div className="p-2.5 rounded-[4px] bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Search Input Bar */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Tìm thành viên
          </label>
          <div className="relative flex items-center">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập tên hiển thị, @username hoặc email..."
              autoFocus
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
          </div>
        </div>

        {/* Member Results List */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
            <span>Thành viên không gian làm việc ({filteredMembers.length})</span>
            {isLoadingMembers && (
              <span className="flex items-center gap-1 normal-case font-normal text-[var(--text-muted)]">
                <Spinner size="sm" />
                Đang tải...
              </span>
            )}
          </div>

          <div className="max-h-[290px] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-1.5">
                <User size={24} className="opacity-40" />
                <span>
                  Không tìm thấy thành viên nào khớp với &quot;{searchTerm}&quot;
                </span>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isExisting = channelMemberIds.includes(member.id);
                const isAdding = addingUserIds.includes(member.id);
                const avatarSrc = member.avatarUrl || '/default-avatar.png';

                return (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface-active)] transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* User Info Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-color)] overflow-hidden shadow-2xs">
                          <img
                            src={avatarSrc}
                            alt={member.displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/default-avatar.png';
                            }}
                          />
                        </div>
                        {/* Status dot */}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${getStatusColor(
                            member.status
                          )}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {member.displayName}
                          </span>
                          {member.role === 'Quản trị viên' && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[var(--accent-primary)] bg-[var(--accent-soft)] px-1 py-0.2 rounded-[2px]">
                              <ShieldCheck size={10} weight="fill" />
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          @{member.username} · {member.customStatus || member.email}
                        </div>
                      </div>
                    </div>

                    {/* Action Right */}
                    {isExisting ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-[3px] shrink-0 select-none">
                        <Check size={13} weight="bold" />
                        Đã trong kênh
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isAdding}
                        onClick={() => handleAddMember(member)}
                        leftIcon={<UserPlus size={13} weight="bold" />}
                        className="shrink-0 text-xs py-1.5 px-3 rounded-[3px]"
                      >
                        Thêm
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
