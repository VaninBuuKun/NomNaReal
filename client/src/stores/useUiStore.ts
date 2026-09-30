import { create } from 'zustand';
import { ChannelType, type Channel, type Message } from '../types';
import type { DirectMessageUser } from '../components/dm';

export const MIN_CHANNEL_WIDTH = 200;
export const MAX_CHANNEL_WIDTH = 450;
export const MIN_THREAD_WIDTH = 360;
export const MAX_THREAD_WIDTH = 720;
export const DEFAULT_THREAD_WIDTH = 480;
export const MIN_MEMBER_WIDTH = 260;
export const MAX_MEMBER_WIDTH = 480;
export const DEFAULT_MEMBER_WIDTH = 270;
export const MIN_SEARCH_WIDTH = 320;
export const MAX_SEARCH_WIDTH = 600;
export const DEFAULT_SEARCH_WIDTH = 380;
export const MIN_PINNED_WIDTH = 300;
export const MAX_PINNED_WIDTH = 550;
export const DEFAULT_PINNED_WIDTH = 360;

interface UiState {
  activeSidebarView: 'channels' | 'dms';
  isThreadOpen: boolean;
  activeThreadMessage: Message | null;
  isMemberListOpen: boolean;
  isSearchOpen: boolean;
  isPinnedSidebarOpen: boolean;

  // Modals
  isSettingsOpen: boolean;
  isCreateWorkspaceOpen: boolean;
  isEditWorkspaceOpen: boolean;
  isCreateChannelOpen: boolean;
  createChannelType: ChannelType;
  channelToEdit: Channel | null;
  channelToAddMember: Channel | null;
  isNewDmOpen: boolean;
  memberToKick: DirectMessageUser | null;

  // Sidebar Widths
  channelWidth: number;
  threadWidth: number;
  memberWidth: number;
  searchWidth: number;
  pinnedSidebarWidth: number;

  // Actions
  setActiveSidebarView: (view: 'channels' | 'dms') => void;
  openThread: (message: Message) => void;
  closeThread: () => void;
  toggleMemberList: () => void;
  setMemberListOpen: (open: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setSearchWidth: (width: number) => void;
  openPinnedSidebar: () => void;
  closePinnedSidebar: () => void;
  togglePinnedSidebar: () => void;
  setPinnedSidebarWidth: (width: number) => void;

  setSettingsOpen: (open: boolean) => void;
  setCreateWorkspaceOpen: (open: boolean) => void;
  setEditWorkspaceOpen: (open: boolean) => void;
  setCreateChannelOpen: (open: boolean, type?: ChannelType) => void;
  setChannelToEdit: (channel: Channel | null) => void;
  setChannelToAddMember: (channel: Channel | null) => void;
  setNewDmOpen: (open: boolean) => void;
  setMemberToKick: (member: DirectMessageUser | null) => void;

  setChannelWidth: (width: number) => void;
  setThreadWidth: (width: number) => void;
  setMemberWidth: (width: number) => void;
  expandThread: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSidebarView: 'channels',
  isThreadOpen: false,
  activeThreadMessage: null,
  isMemberListOpen: localStorage.getItem('nomna_member_list_open') !== 'false',
  isSearchOpen: false,

  isSettingsOpen: false,
  isCreateWorkspaceOpen: false,
  isEditWorkspaceOpen: false,
  isCreateChannelOpen: false,
  createChannelType: ChannelType.Text,
  channelToEdit: null,
  channelToAddMember: null,
  isNewDmOpen: false,
  memberToKick: null,

  channelWidth: (() => {
    const saved = localStorage.getItem('nomna_channel_width');
    return saved
      ? Math.max(MIN_CHANNEL_WIDTH, Math.min(MAX_CHANNEL_WIDTH, parseInt(saved, 10)))
      : 240;
  })(),

  threadWidth: (() => {
    const saved = localStorage.getItem('nomna_thread_width');
    return saved
      ? Math.max(MIN_THREAD_WIDTH, Math.min(MAX_THREAD_WIDTH, parseInt(saved, 10)))
      : DEFAULT_THREAD_WIDTH;
  })(),

  memberWidth: (() => {
    const saved = localStorage.getItem('nomna_member_width');
    return saved
      ? Math.max(MIN_MEMBER_WIDTH, Math.min(MAX_MEMBER_WIDTH, parseInt(saved, 10)))
      : DEFAULT_MEMBER_WIDTH;
  })(),

  searchWidth: (() => {
    const saved = localStorage.getItem('nomna_search_width');
    return saved
      ? Math.max(MIN_SEARCH_WIDTH, Math.min(MAX_SEARCH_WIDTH, parseInt(saved, 10)))
      : DEFAULT_SEARCH_WIDTH;
  })(),

  pinnedSidebarWidth: (() => {
    const saved = localStorage.getItem('nomna_pinned_width');
    return saved
      ? Math.max(MIN_PINNED_WIDTH, Math.min(MAX_PINNED_WIDTH, parseInt(saved, 10)))
      : DEFAULT_PINNED_WIDTH;
  })(),

  isPinnedSidebarOpen: false,

  setActiveSidebarView: (view) => set({ activeSidebarView: view }),

  openThread: (message) =>
    set({
      isThreadOpen: true,
      activeThreadMessage: message,
      // Mutual exclusivity: opening thread closes other sidebars
      isMemberListOpen: false,
      isSearchOpen: false,
      isPinnedSidebarOpen: false,
    }),

  closeThread: () =>
    set({
      isThreadOpen: false,
      activeThreadMessage: null,
    }),

  toggleMemberList: () =>
    set((state) => {
      const next = !state.isMemberListOpen;
      localStorage.setItem('nomna_member_list_open', String(next));
      return {
        isMemberListOpen: next,
        ...(next ? { isThreadOpen: false, activeThreadMessage: null, isSearchOpen: false, isPinnedSidebarOpen: false } : {}),
      };
    }),

  setMemberListOpen: (open) => {
    localStorage.setItem('nomna_member_list_open', String(open));
    set({ isMemberListOpen: open });
  },

  openSearch: () =>
    set({
      isSearchOpen: true,
      isThreadOpen: false,
      activeThreadMessage: null,
      isMemberListOpen: false,
      isPinnedSidebarOpen: false,
    }),

  closeSearch: () => set({ isSearchOpen: false }),

  toggleSearch: () =>
    set((state) => {
      const next = !state.isSearchOpen;
      return {
        isSearchOpen: next,
        ...(next
          ? {
              isThreadOpen: false,
              activeThreadMessage: null,
              isMemberListOpen: false,
              isPinnedSidebarOpen: false,
            }
          : {}),
      };
    }),

  setSearchWidth: (width) => {
    localStorage.setItem('nomna_search_width', width.toString());
    set({ searchWidth: width });
  },

  openPinnedSidebar: () =>
    set({
      isPinnedSidebarOpen: true,
      isThreadOpen: false,
      activeThreadMessage: null,
      isMemberListOpen: false,
      isSearchOpen: false,
    }),

  closePinnedSidebar: () => set({ isPinnedSidebarOpen: false }),

  togglePinnedSidebar: () =>
    set((state) => {
      const next = !state.isPinnedSidebarOpen;
      return {
        isPinnedSidebarOpen: next,
        ...(next
          ? {
              isThreadOpen: false,
              activeThreadMessage: null,
              isMemberListOpen: false,
              isSearchOpen: false,
            }
          : {}),
      };
    }),

  setPinnedSidebarWidth: (width) => {
    localStorage.setItem('nomna_pinned_width', width.toString());
    set({ pinnedSidebarWidth: width });
  },

  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setCreateWorkspaceOpen: (open) => set({ isCreateWorkspaceOpen: open }),
  setEditWorkspaceOpen: (open) => set({ isEditWorkspaceOpen: open }),
  setCreateChannelOpen: (open, type = ChannelType.Text) =>
    set({ isCreateChannelOpen: open, createChannelType: type }),
  setChannelToEdit: (channel) => set({ channelToEdit: channel }),
  setChannelToAddMember: (channel) => set({ channelToAddMember: channel }),
  setNewDmOpen: (open) => set({ isNewDmOpen: open }),
  setMemberToKick: (member) => set({ memberToKick: member }),

  setChannelWidth: (width) => {
    localStorage.setItem('nomna_channel_width', width.toString());
    set({ channelWidth: width });
  },

  setThreadWidth: (width) => {
    localStorage.setItem('nomna_thread_width', width.toString());
    set({ threadWidth: width });
  },

  setMemberWidth: (width) => {
    localStorage.setItem('nomna_member_width', width.toString());
    set({ memberWidth: width });
  },

  expandThread: () =>
    set((state) => {
      if (state.threadWidth < DEFAULT_THREAD_WIDTH) {
        localStorage.setItem('nomna_thread_width', DEFAULT_THREAD_WIDTH.toString());
        return { threadWidth: DEFAULT_THREAD_WIDTH };
      }
      return state;
    }),
}));
