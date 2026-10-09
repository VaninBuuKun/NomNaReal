import { useState, useCallback } from 'react';
import {
  useUiStore,
  MIN_CHANNEL_WIDTH,
  MAX_CHANNEL_WIDTH,
  MIN_THREAD_WIDTH,
  MAX_THREAD_WIDTH,
  MIN_MEMBER_WIDTH,
  MAX_MEMBER_WIDTH,
  MIN_SEARCH_WIDTH,
  MAX_SEARCH_WIDTH,
  MIN_PINNED_WIDTH,
  MAX_PINNED_WIDTH,
} from '../stores';

export function usePanelResizers() {
  const {
    channelWidth,
    threadWidth,
    memberWidth,
    searchWidth,
    pinnedSidebarWidth,
    setChannelWidth,
    setThreadWidth,
    setMemberWidth,
    setSearchWidth,
    setPinnedSidebarWidth,
  } = useUiStore();

  const [isResizingChannel, setIsResizingChannel] = useState(false);
  const [isResizingThread, setIsResizingThread] = useState(false);
  const [isResizingMember, setIsResizingMember] = useState(false);
  const [isResizingSearch, setIsResizingSearch] = useState(false);
  const [isResizingPinned, setIsResizingPinned] = useState(false);

  // Left Sidebar: Dragging to the right increases width
  const handleChannelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChannel(true);
    const startX = e.clientX;
    const startWidth = channelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_CHANNEL_WIDTH,
        Math.min(MAX_CHANNEL_WIDTH, startWidth + (moveEvent.clientX - startX))
      );
      setChannelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingChannel(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [channelWidth, setChannelWidth]);

  // Right Sidebars: Dragging to the left increases width
  const handleThreadResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingThread(true);
    const startX = e.clientX;
    const startWidth = threadWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_THREAD_WIDTH,
        Math.min(MAX_THREAD_WIDTH, startWidth + (startX - moveEvent.clientX))
      );
      setThreadWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingThread(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [threadWidth, setThreadWidth]);

  const handleMemberResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingMember(true);
    const startX = e.clientX;
    const startWidth = memberWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_MEMBER_WIDTH,
        Math.min(MAX_MEMBER_WIDTH, startWidth + (startX - moveEvent.clientX))
      );
      setMemberWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingMember(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [memberWidth, setMemberWidth]);

  const handleSearchResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSearch(true);
    const startX = e.clientX;
    const startWidth = searchWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_SEARCH_WIDTH,
        Math.min(MAX_SEARCH_WIDTH, startWidth + (startX - moveEvent.clientX))
      );
      setSearchWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingSearch(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [searchWidth, setSearchWidth]);

  const handlePinnedResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPinned(true);
    const startX = e.clientX;
    const startWidth = pinnedSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_PINNED_WIDTH,
        Math.min(MAX_PINNED_WIDTH, startWidth + (startX - moveEvent.clientX))
      );
      setPinnedSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingPinned(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [pinnedSidebarWidth, setPinnedSidebarWidth]);


  return {
    isResizingChannel,
    isResizingThread,
    isResizingMember,
    isResizingSearch,
    isResizingPinned,
    handleChannelResizeStart,
    handleThreadResizeStart,
    handleMemberResizeStart,
    handleSearchResizeStart,
    handlePinnedResizeStart,
  };
}
