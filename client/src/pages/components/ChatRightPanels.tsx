import React from 'react';
import { MemberListPanel } from '../../components/channel';
import { ThreadPanel } from '../../components/thread';
import { SearchSidebar, PinnedMessagesSidebar } from '../../components/chat';
import { ChannelTasksSidebar } from '../../components/tasks';
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
  isResizingThread: boolean;
  isResizingMember: boolean;
  isResizingSearch: boolean;
  isResizingPinned: boolean;
  isResizingTask: boolean;
  handleThreadResizeStart: (e: React.MouseEvent) => void;
  handleMemberResizeStart: (e: React.MouseEvent) => void;
  handleSearchResizeStart: (e: React.MouseEvent) => void;
  handlePinnedResizeStart: (e: React.MouseEvent) => void;
  handleTaskResizeStart: (e: React.MouseEvent) => void;
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
  handleToggleReaction,
  handleEditMessage,
  handleDeleteMessage,
  handleUnpinMessage,
  isResizingThread,
  isResizingMember,
  isResizingSearch,
  isResizingPinned,
  isResizingTask,
  handleThreadResizeStart,
  handleMemberResizeStart,
  handleSearchResizeStart,
  handlePinnedResizeStart,
  handleTaskResizeStart,
}) => {
  const {
    isThreadOpen,
    activeThreadMessage,
    isMemberListOpen,
    isSearchOpen,
    isPinnedSidebarOpen,
    isTaskSidebarOpen,
    threadWidth,
    memberWidth,
    searchWidth,
    pinnedSidebarWidth,
    taskSidebarWidth,
    closeThread,
    expandThread,
    setMemberListOpen,
    closeSearch,
    closePinnedSidebar,
    closeTaskSidebar,
    setChannelToAddMember,
    setMemberToKick,
    setSettingsOpen,
  } = useUiStore();

  const { activeWorkspaceId } = currentChannel ? { activeWorkspaceId: currentChannel.workspaceId } : { activeWorkspaceId: undefined };
  const { activeChannelId, setActiveChannelId } = useChatStore();

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('animate-message-highlight');
      void el.offsetWidth;
      el.classList.add('animate-message-highlight');
      setTimeout(() => {
        el.classList.remove('animate-message-highlight');
      }, 2200);
    }
  };

  return (
    <>
      {/* 3.5 Resizer Divider & Thread Panel */}
      {isThreadOpen && (
        <>
          <div
            className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
              isResizingThread
                ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
                : 'bg-[var(--border-color)]'
            }`}
            onMouseDown={handleThreadResizeStart}
            title="Kéo sang trái/phải để chỉnh kích thước Sidebar Thread"
          />
          <ThreadPanel
            isOpen={isThreadOpen}
            onClose={closeThread}
            currentUser={currentUser}
            parentMessage={activeThreadMessage}
            width={threadWidth}
            onExpandWidth={expandThread}
            onToggleReaction={handleToggleReaction}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </>
      )}

      {/* 4. Resizer Divider & Member List Panel (Mutually Exclusive) */}
      {!isThreadOpen && isMemberListOpen && (
        <>
          <div
            className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
              isResizingMember
                ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
                : 'bg-[var(--border-color)]'
            }`}
            onMouseDown={handleMemberResizeStart}
            title="Kéo sang trái/phải để chỉnh kích thước Sidebar Thành viên"
          />
          <MemberListPanel
            isOpen={isMemberListOpen}
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
        </>
      )}

      {/* 5. Resizer Divider & Search Sidebar (Mutually Exclusive) */}
      {!isThreadOpen && !isMemberListOpen && isSearchOpen && (
        <>
          <div
            className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
              isResizingSearch
                ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
                : 'bg-[var(--border-color)]'
            }`}
            onMouseDown={handleSearchResizeStart}
            title="Kéo sang trái/phải để chỉnh kích thước Sidebar Tìm kiếm"
          />
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
        </>
      )}

      {/* 6. Resizer Divider & Pinned Messages Sidebar (Mutually Exclusive) */}
      {!isThreadOpen &&
        !isMemberListOpen &&
        !isSearchOpen &&
        isPinnedSidebarOpen && (
          <>
            <div
              className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingPinned
                  ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
                  : 'bg-[var(--border-color)]'
              }`}
              onMouseDown={handlePinnedResizeStart}
              title="Kéo sang trái/phải để chỉnh kích thước Sidebar Tin nhắn đã ghim"
            />
            <PinnedMessagesSidebar
              isOpen={isPinnedSidebarOpen}
              onClose={closePinnedSidebar}
              width={pinnedSidebarWidth}
              pinnedMessages={pinnedMessages}
              onJumpToMessage={handleJumpToMessage}
              onUnpinMessage={handleUnpinMessage}
            />
          </>
        )}

      {/* 7. Resizer Divider & Tasks Sidebar (Mutually Exclusive) */}
      {!isThreadOpen &&
        !isMemberListOpen &&
        !isSearchOpen &&
        !isPinnedSidebarOpen &&
        isTaskSidebarOpen && (
          <>
            <div
              className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingTask
                  ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]'
                  : 'bg-[var(--border-color)]'
              }`}
              onMouseDown={handleTaskResizeStart}
              title="Kéo sang trái/phải để chỉnh kích thước Sidebar Công việc"
            />
            <ChannelTasksSidebar
              isOpen={isTaskSidebarOpen}
              onClose={closeTaskSidebar}
              width={taskSidebarWidth}
              currentChannel={currentChannel}
              workspaceMembers={workspaceMembers}
              currentUserId={currentUser?.id}
              onJumpToMessage={handleJumpToMessage}
            />
          </>
        )}
    </>
  );
};
