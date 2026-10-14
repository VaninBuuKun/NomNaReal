import type { Channel, Workspace } from '../../../types';

export type ChannelSettingsTab = 'overview' | 'permissions' | 'delete';

export interface ChannelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  workspace: Workspace | null;
  categories?: Channel[];
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}
