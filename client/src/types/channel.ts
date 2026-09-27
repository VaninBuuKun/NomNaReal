export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  topic?: string | null;
  type: number; // 0 = Text, 1 = Voice, 2 = DirectMessage
  isPrivate: boolean;
}
