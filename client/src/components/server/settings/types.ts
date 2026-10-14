import type { Role } from '../../../types/role';

export type SettingsTab = 'overview' | 'roles' | 'members' | 'delete';

export interface ServerMemberItem {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  role: string;
  status: string;
  roles?: Role[];
}

export const PRESET_COLORS = [
  '#99aab5',
  '#1abc9c',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e91e63',
  '#f1c40f',
  '#e67e22',
  '#e74c3c',
  '#5865f2',
];
