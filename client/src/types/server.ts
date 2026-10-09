export interface Server {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  inviteCode: string;
  ownerId: string;
  memberCount?: number;
}
