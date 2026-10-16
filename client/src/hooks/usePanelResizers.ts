import { useState, useCallback } from 'react';
import {
  useUiStore,
  MIN_CHANNEL_WIDTH,
  MAX_CHANNEL_WIDTH,
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
    memberWidth,
    searchWidth,
    pinnedSidebarWidth,
    setChannelWidth,
    setMemberWidth,
    setSearchWidth,
    setPinnedSidebarWidth,
  } = useUiStore();

  const [isResizingChannel, setIsResizingChannel] = useState(false);
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
    isResizingMember,
    isResizingSearch,
    isResizingPinned,
    handleChannelResizeStart,
    handleMemberResizeStart,
    handleSearchResizeStart,
    handlePinnedResizeStart,
  };
}
