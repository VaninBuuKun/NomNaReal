import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash,
  SpeakerHigh,
  CaretDown,
  CaretRight,
  Plus,
  PlusCircle,
  FolderPlus,
  Gear,
  UserPlus,
  SignOut,
  Lock,
  DotsSixVertical,
  MicrophoneSlash,
  Headphones,
  Waveform,
} from '@phosphor-icons/react';
import { ChannelType, type Channel, type Workspace } from '../../types';
import { InviteMemberModal, ServerSettingsModal, LeaveServerModal } from '../server';
import { Avatar } from '../ui';
import { channelApi } from '../../services/channelApi';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { getMediaUrl } from '../../utils/constants';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (type: ChannelType, categoryId?: string) => void;
  onOpenSettings?: () => void;
  isOwner?: boolean;
  onOpenEditWorkspace?: () => void;
  onLeaveWorkspace?: () => void;
  onOpenEditChannel?: (ch: Channel) => void;
  onOpenAddChannelMember?: (ch: Channel) => void;
  onChannelsReorder?: (updatedChannels: Channel[]) => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  currentWorkspace,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  isOwner,
  onLeaveWorkspace,
  onOpenEditChannel,
  onChannelsReorder,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isTextCollapsed, setIsTextCollapsed] = useState(false);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Drag and drop channel reordering state
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Category drag and drop reordering state
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryTargetId, setDragOverCategoryTargetId] = useState<string | null>(null);
  const [categoryDropPosition, setCategoryDropPosition] = useState<'above' | 'below' | null>(null);

  // Voice store state
  const {
    connectedChannelId,
    participants,
  } = useVoiceStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Extract Categories
  const categories = useMemo(() => {
    return channels
      .filter((c) => c.type === ChannelType.Category)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels]);

  const hasCategories = categories.length > 0;

  // Uncategorized channels
  const uncategorizedChannels = useMemo(() => {
    return channels
      .filter((c) => c.type !== ChannelType.Category && !c.categoryId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels]);

  // Fallback Text & Voice channels (used when no categories exist)
  const legacyTextChannels = useMemo(() => {
    return channels
      .filter((c) => c.type === ChannelType.Text || c.type === 0 || c.type === undefined)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels]);

  const legacyVoiceChannels = useMemo(() => {
    return channels
      .filter((c) => c.type === ChannelType.Voice || c.type === 1)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Reorder channel handler
  const handleReorderChannel = async (
    sourceId: string,
    targetId: string,
    pos: 'above' | 'below'
  ) => {
    const source = channels.find((c) => c.id === sourceId);
    const target = channels.find((c) => c.id === targetId);
    if (!source || !target || source.id === target.id) return;

    const targetCatId = target.categoryId || null;
    const categorySiblings = channels
      .filter(
        (c) =>
          c.type !== ChannelType.Category &&
          (c.categoryId || null) === targetCatId &&
          c.id !== sourceId
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const targetIndex = categorySiblings.findIndex((c) => c.id === targetId);
    const insertIndex =
      pos === 'above' ? (targetIndex === -1 ? 0 : targetIndex) : targetIndex + 1;

    const updatedSiblings = [
      ...categorySiblings.slice(0, insertIndex),
      { ...source, categoryId: targetCatId },
      ...categorySiblings.slice(insertIndex),
    ].map((ch, idx) => ({ ...ch, position: idx }));

    const otherChannels = channels.filter(
      (c) =>
        c.id !== sourceId &&
        (c.type === ChannelType.Category || (c.categoryId || null) !== targetCatId)
    );
    const newChannels = [...otherChannels, ...updatedSiblings];
    onChannelsReorder?.(newChannels);

    try {
      await channelApi.updateChannel(sourceId, {
        position: insertIndex,
        categoryId: targetCatId ?? '00000000-0000-0000-0000-000000000000',
      });
    } catch (err) {
      console.error('Failed to update channel position:', err);
    }
  };

  // Reorder category handler (drag entire category)
  const handleReorderCategory = async (
    sourceCatId: string,
    targetCatId: string,
    pos: 'above' | 'below'
  ) => {
    if (sourceCatId === targetCatId) return;
    const sortedCats = [...categories];
    const sourceCat = sortedCats.find((c) => c.id === sourceCatId);
    if (!sourceCat) return;

    const remainingCats = sortedCats.filter((c) => c.id !== sourceCatId);
    const targetIndex = remainingCats.findIndex((c) => c.id === targetCatId);
    if (targetIndex === -1) return;

    const insertIndex = pos === 'above' ? targetIndex : targetIndex + 1;
    remainingCats.splice(insertIndex, 0, sourceCat);

    const updatedCats = remainingCats.map((cat, idx) => ({ ...cat, position: idx }));
    const nonCategoryChannels = channels.filter((c) => c.type !== ChannelType.Category);
    const newChannels = [...nonCategoryChannels, ...updatedCats];

    onChannelsReorder?.(newChannels);

    try {
      await channelApi.updateChannel(sourceCatId, { position: insertIndex });
    } catch (err) {
      console.error('Failed to update category position:', err);
    }
  };

  const handleDropOnCategory = async (catId: string) => {
    if (!draggedChannelId) return;
    const source = channels.find((c) => c.id === draggedChannelId);
    if (!source || source.type === ChannelType.Category) return;

    const otherChannels = channels.filter((c) => c.id !== source.id);
    const updatedChannel = { ...source, categoryId: catId, position: 0 };
    const newChannels = [updatedChannel, ...otherChannels];
    onChannelsReorder?.(newChannels);

    try {
      await channelApi.updateChannel(source.id, {
        position: 0,
        categoryId: catId,
      });
    } catch (err) {
      console.error('Failed to move channel to category:', err);
    }
  };

  const renderChannelItem = (ch: Channel) => {
    const isActive = activeChannelId === ch.id;
    const isUnread = !!ch.hasUnread && !isActive;
    const isVoice = ch.type === ChannelType.Voice;
    const isBeingDragged = draggedChannelId === ch.id;
    const isDragTarget = dragOverChannelId === ch.id;

    return (
      <div key={ch.id} className="relative">
        {/* Discord-style drop indicator line with bullet dot */}
        {isDragTarget && (
          <div
            className={`absolute left-0 right-0 h-0.5 bg-accent-primary z-20 pointer-events-none flex items-center ${
              dropPosition === 'above' ? '-top-1' : '-bottom-1'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-accent-primary -ml-1 ring-2 ring-sidebar" />
          </div>
        )}

        <div
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', ch.id);
            setDraggedChannelId(ch.id);
          }}
          onDragEnd={() => {
            setDraggedChannelId(null);
            setDragOverChannelId(null);
            setDropPosition(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedChannelId === ch.id || draggedCategoryId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const isAbove = e.clientY - rect.top < rect.height / 2;
            setDragOverChannelId(ch.id);
            setDropPosition(isAbove ? 'above' : 'below');
          }}
          onDragLeave={() => {
            if (dragOverChannelId === ch.id) {
              setDragOverChannelId(null);
              setDropPosition(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedChannelId || draggedChannelId === ch.id) return;
            handleReorderChannel(draggedChannelId, ch.id, dropPosition || 'below');
            setDraggedChannelId(null);
            setDragOverChannelId(null);
            setDropPosition(null);
          }}
          onClick={() => onSelectChannel(ch.id)}
          className={`group/ch relative flex items-center justify-between px-2 py-1.5 rounded-control text-[13px] cursor-pointer transition-all ${
            isBeingDragged ? 'opacity-35 scale-[0.98]' : ''
          } ${
            isActive
              ? 'bg-surface-active text-text-primary font-bold'
              : isUnread
              ? 'text-text-primary font-bold hover:bg-surface'
              : 'text-text-secondary hover:bg-surface hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Drag Grip icon visible on hover */}
            <DotsSixVertical
              size={13}
              weight="bold"
              className="opacity-0 group-hover/ch:opacity-60 cursor-grab text-text-muted shrink-0 transition-opacity"
            />

            {isUnread && (
              <span className="absolute -left-1 w-1 h-2 rounded-r-full bg-accent-primary" />
            )}

            {ch.isPrivate ? (
              <Lock size={15} weight="bold" className="text-text-muted shrink-0" />
            ) : isVoice ? (
              <SpeakerHigh
                size={15}
                weight="bold"
                className={`shrink-0 ${
                  connectedChannelId === ch.id ? 'text-success' : 'text-text-muted'
                }`}
              />
            ) : (
              <Hash
                size={16}
                weight="bold"
                className={`shrink-0 ${isUnread ? 'text-accent-primary' : 'text-text-muted'}`}
              />
            )}
            <span className="truncate">{ch.name}</span>
          </div>

          {/* Channel Hover Actions: Unified Gear button */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenEditChannel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditChannel(ch);
                }}
                title="Cài đặt kênh"
                className="opacity-0 group-hover/ch:opacity-100 p-0.5 hover:text-text-primary rounded-control transition-opacity cursor-pointer text-text-muted"
              >
                <Gear size={13} weight="bold" />
              </button>
            )}
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
            )}
          </div>
        </div>

        {/* Indented presence under Voice Channel if connected */}
        {isVoice && connectedChannelId === ch.id && participants.length > 0 && (
          <div className="ml-5 my-0.5 space-y-0.5 border-l border-border/40 pl-1.5 animate-in fade-in duration-150">
            {participants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between px-2 py-1 rounded-control text-xs text-text-secondary hover:bg-surface transition-colors group/p"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <Avatar
                      src={getMediaUrl(p.avatarUrl)}
                      fallback={p.displayName}
                      size="sm"
                    />
                    {p.isSpeaking && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success ring-1 ring-surface animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`truncate text-[12px] ${
                      p.isSpeaking ? 'text-success font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {p.displayName}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-text-muted">
                  {p.isMuted && (
                    <MicrophoneSlash size={12} weight="bold" className="text-danger" />
                  )}
                  {p.isDeafened && (
                    <Headphones size={12} weight="fill" className="text-danger" />
                  )}
                  {p.isSpeaking && (
                    <Waveform size={12} weight="bold" className="text-success animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      id="channelSidebar"
      className="h-full min-h-0 flex-1 shrink-0 bg-sidebar flex flex-col overflow-hidden min-w-[200px] select-none"
    >
      {/* 1. Server Header with Discord Dropdown */}
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="w-full h-[54px] px-4 border-b border-border flex items-center justify-between gap-2 font-bold text-[15px] text-text-primary hover:bg-surface transition-colors cursor-pointer text-left"
          title="Tùy chọn Server"
        >
          <span className="truncate">{currentWorkspace?.name || 'NomNa Server'}</span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-text-muted shrink-0 transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180 text-text-primary' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[999] bg-black/20"
                onClick={() => setIsMenuOpen(false)}
              />

              <div
                ref={menuRef}
                className="fixed top-[52px] left-[78px] w-[220px] z-[1000] bg-surface border border-border shadow-floating rounded-card p-1.5 flex flex-col gap-0.5 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {/* 1. Mời mọi người */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-semibold text-accent-primary hover:bg-accent-primary hover:text-on-accent transition-colors cursor-pointer group"
                >
                  <span>Mời mọi người</span>
                  <UserPlus
                    size={16}
                    weight="bold"
                    className="text-current opacity-80 group-hover:opacity-100"
                  />
                </button>

                {/* 2. Cài đặt máy chủ */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsServerSettingsOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:bg-accent-primary hover:text-on-accent transition-colors cursor-pointer group"
                >
                  <span>Cài đặt máy chủ</span>
                  <Gear
                    size={16}
                    weight="bold"
                    className="text-current opacity-70 group-hover:opacity-100"
                  />
                </button>

                {/* 3. Tạo kênh */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateChannel(ChannelType.Text);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:bg-accent-primary hover:text-on-accent transition-colors cursor-pointer group"
                >
                  <span>Tạo kênh</span>
                  <PlusCircle
                    size={16}
                    weight="bold"
                    className="text-current opacity-70 group-hover:opacity-100"
                  />
                </button>

                {/* 4. Tạo danh mục */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateChannel(ChannelType.Category);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:bg-accent-primary hover:text-on-accent transition-colors cursor-pointer group"
                >
                  <span>Tạo danh mục</span>
                  <FolderPlus
                    size={16}
                    weight="bold"
                    className="text-current opacity-70 group-hover:opacity-100"
                  />
                </button>

                {/* 5. Rời máy chủ (Chỉ hiển thị cho thành viên, chủ sở hữu không thể rời) */}
                {!isOwner && (
                  <>
                    <div className="w-full h-px bg-border my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsLeaveModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium text-danger hover:bg-danger hover:text-on-accent transition-colors cursor-pointer group"
                    >
                      <span>Rời máy chủ</span>
                      <SignOut size={16} weight="bold" />
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body
          )}
      </div>

      {/* 2. Channel List with Categories & Drag-Drop Reorder */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {hasCategories ? (
          <>
            {/* Uncategorized Channels (if any) */}
            {uncategorizedChannels.length > 0 && (
              <div className="space-y-0.5">
                {uncategorizedChannels.map((ch) => renderChannelItem(ch))}
              </div>
            )}

            {/* Category Groups */}
            {categories.map((cat) => {
              const childChannels = channels
                .filter((c) => c.categoryId === cat.id && c.type !== ChannelType.Category)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

              const isCollapsed = !!collapsedCategories[cat.id];
              const isCategoryDropTarget = dragOverCategoryId === cat.id;
              const isBeingDragged = draggedCategoryId === cat.id;
              const isCategoryReorderTarget = dragOverCategoryTargetId === cat.id;

              return (
                <div
                  key={cat.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedChannelId) {
                      setDragOverCategoryId(cat.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverCategoryId === cat.id) setDragOverCategoryId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedChannelId) {
                      setDragOverCategoryId(null);
                      handleDropOnCategory(cat.id);
                    }
                  }}
                  className={`relative transition-all rounded-control p-0.5 ${
                    isBeingDragged ? 'opacity-30 scale-[0.98]' : ''
                  } ${
                    isCategoryDropTarget ? 'bg-accent-soft/30 ring-1 ring-accent-primary' : ''
                  }`}
                >
                  {/* Discord-style category drop indicator line with bullet dot */}
                  {isCategoryReorderTarget && (
                    <div
                      className={`absolute left-0 right-0 h-0.5 bg-accent-primary z-20 pointer-events-none flex items-center ${
                        categoryDropPosition === 'above' ? '-top-1' : '-bottom-1'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-primary -ml-1 ring-2 ring-sidebar shadow-xs" />
                    </div>
                  )}

                  {/* Category Header Row with Drag Capability */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', cat.id);
                      setDraggedCategoryId(cat.id);
                    }}
                    onDragEnd={() => {
                      setDraggedCategoryId(null);
                      setDragOverCategoryTargetId(null);
                      setCategoryDropPosition(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedCategoryId || draggedCategoryId === cat.id) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const isAbove = e.clientY - rect.top < rect.height / 2;
                      setDragOverCategoryTargetId(cat.id);
                      setCategoryDropPosition(isAbove ? 'above' : 'below');
                    }}
                    onDragLeave={() => {
                      if (dragOverCategoryTargetId === cat.id) {
                        setDragOverCategoryTargetId(null);
                        setCategoryDropPosition(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedCategoryId || draggedCategoryId === cat.id) return;
                      handleReorderCategory(
                        draggedCategoryId,
                        cat.id,
                        categoryDropPosition || 'below'
                      );
                      setDraggedCategoryId(null);
                      setDragOverCategoryTargetId(null);
                      setCategoryDropPosition(null);
                    }}
                    className="flex items-center justify-between px-1.5 py-1 mb-0.5 group/cat rounded-control hover:bg-surface/50 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {/* Drag grip icon visible on category hover */}
                      <span title="Kéo để đổi vị trí danh mục" className="shrink-0 flex items-center">
                        <DotsSixVertical
                          size={12}
                          weight="bold"
                          className="opacity-0 group-hover/cat:opacity-60 cursor-grab text-text-muted shrink-0 transition-opacity"
                        />
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary cursor-pointer truncate"
                      >
                        {isCollapsed ? (
                          <CaretRight size={11} weight="bold" />
                        ) : (
                          <CaretDown size={11} weight="bold" />
                        )}
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] opacity-70">({childChannels.length})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 hover:text-text-primary hover:bg-surface rounded-control transition-colors cursor-pointer text-text-muted"
                        title="Tạo kênh trong danh mục này"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateChannel(ChannelType.Text, cat.id);
                        }}
                      >
                        <Plus size={13} weight="bold" />
                      </button>
                      {onOpenEditChannel && (
                        <button
                          type="button"
                          className="p-1 hover:text-text-primary hover:bg-surface rounded-control transition-colors cursor-pointer text-text-muted"
                          title="Cài đặt danh mục"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditChannel(cat);
                          }}
                        >
                          <Gear size={13} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Channels */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {childChannels.map((ch) => renderChannelItem(ch))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Legacy Fallback for servers without categories */
          <>
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1 group">
                <button
                  type="button"
                  onClick={() => setIsTextCollapsed((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {isTextCollapsed ? (
                    <CaretRight size={11} weight="bold" />
                  ) : (
                    <CaretDown size={11} weight="bold" />
                  )}
                  <span>Kênh chat</span>
                  <span className="text-[10px] opacity-70">({legacyTextChannels.length})</span>
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-text-primary hover:bg-surface rounded-control transition-colors cursor-pointer text-text-muted"
                  title="Tạo kênh chat"
                  onClick={() => onCreateChannel(ChannelType.Text)}
                >
                  <Plus size={13} weight="bold" />
                </button>
              </div>

              {!isTextCollapsed && (
                <div className="space-y-0.5">
                  {legacyTextChannels.map((ch) => renderChannelItem(ch))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between px-1.5 mb-1 group">
                <button
                  type="button"
                  onClick={() => setIsVoiceCollapsed((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {isVoiceCollapsed ? (
                    <CaretRight size={11} weight="bold" />
                  ) : (
                    <CaretDown size={11} weight="bold" />
                  )}
                  <span>Kênh thoại</span>
                  <span className="text-[10px] opacity-70">({legacyVoiceChannels.length})</span>
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-text-primary hover:bg-surface rounded-control transition-colors cursor-pointer text-text-muted"
                  title="Tạo kênh thoại"
                  onClick={() => onCreateChannel(ChannelType.Voice)}
                >
                  <Plus size={13} weight="bold" />
                </button>
              </div>

              {!isVoiceCollapsed && (
                <div className="space-y-0.5">
                  {legacyVoiceChannels.map((ch) => renderChannelItem(ch))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspace={currentWorkspace}
      />

      {/* Leave Server Modal */}
      <LeaveServerModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        workspace={currentWorkspace}
        onConfirmLeave={async () => {
          await onLeaveWorkspace?.();
        }}
      />

      {/* Unified Server Settings Modal */}
      {currentWorkspace && (
        <ServerSettingsModal
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          workspace={currentWorkspace}
          isOwner={isOwner ?? false}
          onWorkspaceDeleted={() => onLeaveWorkspace?.()}
        />
      )}
    </aside>
  );
};
