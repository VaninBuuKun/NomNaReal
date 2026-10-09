import { useCallback } from 'react';
import { signalRService } from '../services';
import {
  useWorkspaceStore,
  useChatStore,
  useDmStore,
} from '../stores';
import type {
  User,
  Message,
  Channel,
  PinnedMessage,
  AppNotification,
} from '../types';
import type { DirectMessageUser } from '../components/dm';

interface UseChatSignalRParams {
  currentUser: User | null;
  activeWorkspaceIdRef: React.MutableRefObject<string | null>;
  activeChannelIdRef: React.MutableRefObject<string | null>;
  activeSidebarViewRef: React.MutableRefObject<string>;
  handleIncomingMessage: (msg: Message) => void;
  handleNotificationSelect: (notif: AppNotification) => void;
  handleSelectChannel: (channelId: string) => void;
  setActiveWorkspaceId: (wsId: string) => void;
  setToast: (toast: any) => void;
  setPinnedMessages: React.Dispatch<React.SetStateAction<PinnedMessage[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  setChannelMemberIdsMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export function useChatSignalR({
  currentUser,
  activeWorkspaceIdRef,
  activeChannelIdRef,
  activeSidebarViewRef,
  handleIncomingMessage,
  handleNotificationSelect,
  handleSelectChannel,
  setActiveWorkspaceId,
  setToast,
  setPinnedMessages,
  setNotifications,
  setChannelMemberIdsMap,
}: UseChatSignalRParams) {
  const {
    setChannels,
    updateMessage,
    deleteMessage,
    setReactions,
    applyReactionDelta,
    updateReplyCount,
    setTypingUser,
  } = useChatStore();

  const { updateWorkspace } = useWorkspaceStore();
  const { setWorkspaceMembers, updateUserStatus } = useDmStore();

  const setupSignalR = useCallback(async () => {
    // 1. Connect SignalR
    await signalRService.startConnection(
      handleIncomingMessage,
      (data) => setTypingUser(data.username),
      () => setTypingUser(null)
    );

    // 2. Thread replies count
    signalRService.onThreadReplyCountUpdated((data) => {
      updateReplyCount(
        data.parentMessageId,
        typeof data.replyCount === 'number' ? data.replyCount : undefined
      );
    });

    // 3. Reactions
    signalRService.onReactionUpdated((update) => {
      if ('isAdded' in update && update.emoji) {
        applyReactionDelta(update as any, currentUser?.id);
      } else if (update.reactions) {
        setReactions(update.messageId, update.reactions);
      }
    });

    // 4. Edits & Deletions
    signalRService.onMessageEdited((edited) => {
      updateMessage(edited);
    });

    signalRService.onMessageDeleted((deleted) => {
      deleteMessage(deleted.messageId);
    });

    // 5. User Presence
    signalRService.onUserStatusChanged((data) => {
      const normalized = data.status.toLowerCase() as
        | 'online'
        | 'offline'
        | 'away'
        | 'dnd';
      updateUserStatus(data.userId, normalized);
    });

    // 6. Added to Private Channel
    signalRService.onAddedToChannel((newChannel: Channel) => {
      if (newChannel.workspaceId === activeWorkspaceIdRef.current) {
        setChannels((prev) => {
          if (prev.some((c) => c.id === newChannel.id)) return prev;
          return [...prev, newChannel];
        });
      }

      setToast({
        id: newChannel.id,
        title: 'Kênh riêng tư mới',
        description: `Bạn vừa được thêm vào #${newChannel.name}`,
        actionLabel: 'Xem ngay',
        onAction: () => {
          if (newChannel.workspaceId !== activeWorkspaceIdRef.current) {
            setActiveWorkspaceId(newChannel.workspaceId);
          }
          handleSelectChannel(newChannel.id);
          setToast(null);
        },
      });
    });

    // 7. Workspace Member Joined
    signalRService.onWorkspaceMemberJoined((data) => {
      const currentWs = useWorkspaceStore
        .getState()
        .workspaces.find((w) => w.id === data.workspaceId);
      if (currentWs) {
        updateWorkspace({ ...currentWs, memberCount: data.memberCount });
      }

      if (data.workspaceId === activeWorkspaceIdRef.current && data.member) {
        const newMem: DirectMessageUser = {
          id: data.member.userId,
          displayName: data.member.displayName,
          username: data.member.username,
          email: data.member.email || '',
          avatarUrl: data.member.avatarUrl,
          status: 'online',
          role:
            data.member.role === 'Admin'
              ? 'Quản trị viên'
              : data.member.role === 'Owner'
              ? 'Chủ phòng'
              : 'Thành viên',
        };
        setWorkspaceMembers((prev) => {
          if (prev.some((m) => m.id === newMem.id)) return prev;
          return [...prev, newMem];
        });
      }
    });

    // 8. Channel Member Added
    signalRService.onChannelMemberAdded((data) => {
      setChannelMemberIdsMap((prev) => {
        const existing = prev[data.channelId] || [];
        if (existing.includes(data.userId)) return prev;
        return {
          ...prev,
          [data.channelId]: [...existing, data.userId],
        };
      });
    });

    // 9. Pinned Messages
    signalRService.onMessagePinned((pinned: any) => {
      if (pinned.channelId === activeChannelIdRef.current) {
        setPinnedMessages((prev) => {
          if (prev.some((p) => p.messageId === pinned.messageId)) return prev;
          return [...prev, pinned];
        });
      }
    });

    signalRService.onMessageUnpinned((data: { channelId: string; messageId: string }) => {
      if (data.channelId === activeChannelIdRef.current) {
        setPinnedMessages((prev) => prev.filter((p) => p.messageId !== data.messageId));
      }
    });

    // 10. Notifications
    signalRService.onReceiveNotification((notif) => {
      setNotifications((prev) => [
        notif,
        ...prev.filter((n) => n.id !== notif.id),
      ]);

      const isViewingChannel =
        notif.channelId &&
        notif.channelId === activeChannelIdRef.current &&
        activeSidebarViewRef.current === 'channels' &&
        document.visibilityState === 'visible';

      if (!isViewingChannel) {
        setToast({
          id: notif.id,
          title: notif.title || 'Thông báo mới',
          description: notif.content || undefined,
          actionLabel: 'Xem ngay',
          onAction: () => {
            handleNotificationSelect(notif);
            setToast(null);
          },
        });
      }
    });

  }, [
    currentUser?.id,
    activeWorkspaceIdRef,
    activeChannelIdRef,
    activeSidebarViewRef,
    handleIncomingMessage,
    handleNotificationSelect,
    handleSelectChannel,
    setActiveWorkspaceId,
    setToast,
    setPinnedMessages,
    setNotifications,
    setChannelMemberIdsMap,
    setChannels,
    updateMessage,
    deleteMessage,
    setReactions,
    applyReactionDelta,
    updateReplyCount,
    setTypingUser,
    updateWorkspace,
    setWorkspaceMembers,
    updateUserStatus,
  ]);

  return { setupSignalR };
}
