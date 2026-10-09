import React, { useMemo } from 'react';
import {
  CreateWorkspaceModal,
  EditWorkspaceModal,
  KickMemberModal,
} from '../../components/server';
import {
  CreateChannelModal,
  EditChannelModal,
  AddChannelMemberModal,
} from '../../components/channel';
import { NewDirectMessageModal, type DirectMessageUser } from '../../components/dm';
import { SettingsModal } from '../../components/settings';
import { UserProfileModal, type UserProfileData } from '../../components/profile';
import { useUiStore, useChatStore, useDmStore, useFriendStore } from '../../stores';
import type { User, Workspace, Channel } from '../../types';

interface ChatModalsProps {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  currentWorkspace: Workspace | null;
  workspaceMembers: DirectMessageUser[];
  currentUserRole?: string | null;
  isOwner: boolean;
  handleLogout: () => void;
  handleWorkspaceCreated: (ws: Workspace) => void;
  handleWorkspaceUpdated: (ws: Workspace) => void;
  handleWorkspaceDeleted: (id: string) => void;
  handleChannelCreated: (ch: Channel) => void;
  handleChannelUpdated: (ch: Channel) => void;
  handleChannelDeleted: (id: string) => void;
  handleKickMember: (member: DirectMessageUser) => Promise<void>;
  handleStartDm: (user: DirectMessageUser) => void;
  handleStartDmWithUser: (user: { id: string; displayName: string; username: string; avatarUrl?: string }) => void;
  inspectingUser: UserProfileData | null;
  setInspectingUser: (u: UserProfileData | null) => void;
  userProfileAnchor: { top: number; left: number; right: number; bottom: number } | null;
  setUserProfileAnchor: (anchor: { top: number; left: number; right: number; bottom: number } | null) => void;
  setChannelMemberIdsMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  dmConversations: { user: { id: string } }[];
}

export const ChatModals: React.FC<ChatModalsProps> = ({
  currentUser,
  setCurrentUser,
  currentWorkspace,
  workspaceMembers,
  currentUserRole,
  isOwner,
  handleLogout,
  handleWorkspaceCreated,
  handleWorkspaceUpdated,
  handleWorkspaceDeleted,
  handleChannelCreated,
  handleChannelUpdated,
  handleChannelDeleted,
  handleKickMember,
  handleStartDm,
  handleStartDmWithUser,
  inspectingUser,
  setInspectingUser,
  userProfileAnchor,
  setUserProfileAnchor,
  setChannelMemberIdsMap,
  dmConversations,
}) => {
  const {
    isCreateWorkspaceOpen,
    isEditWorkspaceOpen,
    isCreateChannelOpen,
    createChannelType,
    channelToEdit,
    channelToAddMember,
    isNewDmOpen,
    memberToKick,
    isSettingsOpen,
    setCreateWorkspaceOpen,
    setEditWorkspaceOpen,
    setCreateChannelOpen,
    setChannelToEdit,
    setChannelToAddMember,
    setNewDmOpen,
    setMemberToKick,
    setSettingsOpen,
  } = useUiStore();

  const { activeWorkspaceId } = currentWorkspace ? { activeWorkspaceId: currentWorkspace.id } : { activeWorkspaceId: null };
  const { setMessages } = useChatStore();
  const { updateMemberProfile } = useDmStore();
  const friends = useFriendStore((state) => state.friends);

  const dmCandidateMembers = useMemo(() => {
    const map = new Map<string, DirectMessageUser>();
    for (const f of friends) {
      if (f.userId !== currentUser?.id) {
        map.set(f.userId, {
          id: f.userId,
          displayName: f.displayName,
          username: f.username,
          email: '',
          avatarUrl: f.avatarUrl,
          status: f.status === 'online' ? 'online' : 'offline',
        });
      }
    }
    for (const m of workspaceMembers) {
      if (m.id !== currentUser?.id && !map.has(m.id)) {
        map.set(m.id, m);
      }
    }
    return Array.from(map.values());
  }, [friends, workspaceMembers, currentUser?.id]);

  return (
    <>
      <KickMemberModal
        isOpen={Boolean(memberToKick)}
        onClose={() => setMemberToKick(null)}
        member={memberToKick}
        workspaceName={currentWorkspace?.name}
        onConfirmKick={handleKickMember}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      <EditWorkspaceModal
        isOpen={isEditWorkspaceOpen}
        onClose={() => setEditWorkspaceOpen(false)}
        workspace={currentWorkspace}
        isOwner={isOwner}
        onWorkspaceUpdated={handleWorkspaceUpdated}
        onWorkspaceDeleted={handleWorkspaceDeleted}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        workspaceId={activeWorkspaceId}
        channelType={createChannelType}
        onChannelCreated={handleChannelCreated}
      />

      <EditChannelModal
        isOpen={Boolean(channelToEdit)}
        onClose={() => setChannelToEdit(null)}
        channel={channelToEdit}
        onChannelUpdated={handleChannelUpdated}
        onChannelDeleted={handleChannelDeleted}
      />

      <AddChannelMemberModal
        isOpen={Boolean(channelToAddMember)}
        onClose={() => setChannelToAddMember(null)}
        channel={channelToAddMember}
        members={dmCandidateMembers}
        onMemberAdded={(userId) => {
          if (channelToAddMember) {
            const chId = channelToAddMember.id;
            setChannelMemberIdsMap((prev) => {
              const existing = prev[chId] || [];
              if (existing.includes(userId)) return prev;
              return { ...prev, [chId]: [...existing, userId] };
            });
          }
        }}
      />

      <NewDirectMessageModal
        isOpen={isNewDmOpen}
        onClose={() => setNewDmOpen(false)}
        onStartDm={handleStartDm}
        existingDmUserIds={dmConversations.map((c) => c.user.id)}
        members={dmCandidateMembers}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserUpdated={(u) => {
          setCurrentUser(u);
          updateMemberProfile(u.id, {
            displayName: u.displayName,
            avatarUrl: u.avatarUrl || undefined,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === u.id
                ? {
                    ...m,
                    senderDisplayName: u.displayName,
                    senderAvatarUrl: u.avatarUrl,
                  }
                : m
            )
          );
        }}
      />

      <UserProfileModal
        isOpen={Boolean(inspectingUser)}
        onClose={() => {
          setInspectingUser(null);
          setUserProfileAnchor(null);
        }}
        user={inspectingUser}
        anchorRect={userProfileAnchor}
        currentUserId={currentUser?.id}
        onStartDm={(u) => {
          handleStartDmWithUser({
            id: u.id,
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl || undefined,
          });
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        canKick={
          Boolean(currentUserRole) &&
          (currentUserRole?.toLowerCase() === 'owner' ||
            (currentUserRole?.toLowerCase() === 'admin' &&
              (inspectingUser?.role || '').toLowerCase() !== 'owner' &&
              (inspectingUser?.role || '').toLowerCase() !== 'admin'))
        }
        onKickMember={(u) => {
          const found = workspaceMembers.find((m) => m.id === u.id);
          if (found) setMemberToKick(found);
        }}
      />

      
    </>
  );
};
