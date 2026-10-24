import React from 'react';
import { MemberListPanel } from '../../components/channel';
import { SearchSidebar, PinnedMessagesSidebar } from '../../components/chat';
import { useUiStore, useChatStore } from '../../stores';
import { ChannelType, type User, type Channel, type PinnedMessage } from '../../types';
import type { DirectMessageUser } from '../../components/dm';
import type { UserProfileData } from '../../components/profile';

interface ChatRightPanelsProps {
  currentUser: User | null;
  currentUserRole?: string | null;
  currentChannel: Channel | null;
  workspaceMembers: DirectMessageUser[];
  displayedMembers: DirectMessageUser[];
  loadingChannelMemberIds: Record<string, boolean>;
  pinnedMessages: PinnedMessage[];
  handleOpenUserProfile: (user: UserProfileData, anchorRect?: DOMRect) => void;
  handleStartDmWithUser: (user: { id: string; displayName: string; username: string; avatarUrl?: string }) => void;
  handleToggleReaction: (msgId: string, emoji: string) => Promise<void>;
  handleEditMessage: (msgId: string, content: string) => Promise<void>;
  handleDeleteMessage: (msgId: string) => Promise<void>;
  handleUnpinMessage: (msgId: string) => Promise<void>;
  isResizingMember: boolean;
  isResizingSearch: boolean;
  isResizingPinned: boolean;
  handleMemberResizeStart: (e: React.MouseEvent) => void;
  handleSearchResizeStart: (e: React.MouseEvent) => void;
  handlePinnedResizeStart: (e: React.MouseEvent) => void;
  onJumpToMessage?: (messageId: string, targetChannelId?: string) => Promise<void> | void;
}

export const ChatRightPanels: React.FC<ChatRightPanelsProps> = ({
  currentUser,
  currentUserRole,
  currentChannel,
  workspaceMembers,
  displayedMembers,
  loadingChannelMemberIds,
  pinnedMessages,
  handleOpenUserProfile,
  handleStartDmWithUser,
  handleUnpinMessage,
  isResizingMember,
  isResizingSearch,
  isResizingPinned,
  handleMemberResizeStart,
  handleSearchResizeStart,
  handlePinnedResizeStart,
  onJumpToMessage,
}) => {
  const {
    activeSidebarView,
    isMemberListOpen,
    isSearchOpen,
    isPinnedSidebarOpen,
    memberWidth,
    searchWidth,
    pinnedSidebarWidth,
    setMemberListOpen,
    closeSearch,
    closePinnedSidebar,
    setChannelToAddMember,
    setMemberToKick,
    setSettingsOpen,
  } = useUiStore();

  const { activeChannelId, setActiveChannelId } = useChatStore();
  const activeWorkspaceId = currentChannel ? currentChannel.workspaceId : undefined;
  const isDm = activeSidebarView === 'dms' || currentChannel?.type === ChannelType.DirectMessage;
  const isMemberPanelVisible = !isDm && isMemberListOpen;

  const handleJumpToMessage = (messageId: string, targetChannelId?: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId, targetChannelId);
      return;
    }
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      const scroller = el.closest('[data-virtuoso-scroller="true"]');
      if (scroller) {
        const scrollerRect = scroller.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - scrollerRect.top - scrollerRect.height / 2 + elRect.height / 2;
        scroller.scrollTop += offset;
      } else {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      el.classList.remove('animate-message-highlight');
      void el.offsetWidth;
      el.classList.add('animate-message-highlight');
      setTimeout(() => {
        el.classList.remove('animate-message-highlight');
      }, 2200);
    }
  };

  const isAnyPanelOpen = isMemberPanelVisible || isSearchOpen || isPinnedSidebarOpen;
  const currentWidth = isMemberPanelVisible
    ? (memberWidth || 270)
    : isSearchOpen
    ? (searchWidth || 380)
    : isPinnedSidebarOpen
    ? (pinnedSidebarWidth || 380)
    : 270;

  const currentResizer = isMemberPanelVisible
    ? {
        isResizing: isResizingMember,
        onMouseDown: handleMemberResizeStart,
        title: 'Kéo sang trái/phải để chỉnh kích thước Sidebar Thành viên',
      }
    : isSearchOpen
    ? {
        isResizing: isResizingSearch,
        onMouseDown: handleSearchResizeStart,
        title: 'Kéo sang trái/phải để chỉnh kích thước Sidebar Tìm kiếm',
      }
    : isPinnedSidebarOpen
    ? {
        isResizing: isResizingPinned,
        onMouseDown: handlePinnedResizeStart,
        title: 'Kéo sang trái/phải để chỉnh kích thước Sidebar Tin nhắn đã ghim',
      }
    : null;

  return (
    <>
      {/* Resizer Divider */}
      {isAnyPanelOpen && currentResizer && (
        <div
          className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
            currentResizer.isResizing
              ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
              : 'bg-[var(--border-color)]'
          }`}
          onMouseDown={currentResizer.onMouseDown}
          title={currentResizer.title}
        />
      )}

      {/* Sliding Right Drawer Container with Smooth Transition */}
      <div
        className="h-full shrink-0 flex overflow-hidden transition-[width,opacity] duration-300 ease-in-out"
        style={{
          width: isAnyPanelOpen ? `${currentWidth}px` : '0px',
          opacity: isAnyPanelOpen ? 1 : 0,
          pointerEvents: isAnyPanelOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="h-full shrink-0 flex"
          style={{ width: `${currentWidth}px` }}
        >
          {/* 1. Member List Panel */}
          {isMemberPanelVisible && (
            <MemberListPanel
              isOpen={isMemberPanelVisible}
              onClose={() => setMemberListOpen(false)}
              members={displayedMembers}
              currentUser={currentUser}
              currentUserRole={currentUserRole || undefined}
              width={memberWidth}
              channelName={currentChannel?.name || undefined}
              isPrivateChannel={
                Boolean(
                  currentChannel?.isPrivate &&
                  currentChannel.type !== ChannelType.DirectMessage
                )
              }
              isLoading={
                Boolean(
                  currentChannel?.isPrivate &&
                  currentChannel.type !== ChannelType.DirectMessage &&
                  currentChannel &&
                  loadingChannelMemberIds[currentChannel.id]
                )
              }
              onOpenAddMember={() =>
                currentChannel && setChannelToAddMember(currentChannel)
              }
              onOpenUserProfile={handleOpenUserProfile}
              onStartDmWithUser={handleStartDmWithUser}
              onOpenSettings={() => setSettingsOpen(true)}
              onRequestKickMember={(m) => setMemberToKick(m)}
            />
          )}

          {/* 2. Search Sidebar */}
          {!isMemberPanelVisible && isSearchOpen && (
            <SearchSidebar
              isOpen={isSearchOpen}
              onClose={closeSearch}
              width={searchWidth}
              currentChannel={currentChannel}
              workspaceId={activeWorkspaceId || null}
              workspaceMembers={workspaceMembers}
              onJumpToMessage={(channelId, messageId) => {
                if (channelId !== activeChannelId) {
                  setActiveChannelId(channelId);
                }
                setTimeout(() => {
                  handleJumpToMessage(messageId);
                }, 300);
              }}
            />
          )}

          {/* 3. Pinned Messages Sidebar */}
          {!isMemberPanelVisible && !isSearchOpen && isPinnedSidebarOpen && (
            <PinnedMessagesSidebar
              isOpen={isPinnedSidebarOpen}
              onClose={closePinnedSidebar}
              width={pinnedSidebarWidth}
              pinnedMessages={pinnedMessages}
              onJumpToMessage={handleJumpToMessage}
              onUnpinMessage={handleUnpinMessage}
            />
          )}
        </div>
      </div>
    </>
  );
};
