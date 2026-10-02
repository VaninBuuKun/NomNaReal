export type NotificationType =
  | 'Mention'
  | 'ThreadReply'
  | 'Assignment'
  | 'TaskSchedule'
  | 1
  | 2
  | 3
  | 4;

export interface NotificationMetadata {
  dueDate?: string;
  points?: number;
  grade?: string;
  assignmentId?: string;
  taskId?: string;
  taskStatus?: 'todo' | 'in_progress' | 'done';
  priority?: 'urgent' | 'high' | 'normal';
  assigneeName?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  actorId?: string;
  actorDisplayName?: string;
  actorUsername?: string;
  actorAvatarUrl?: string;
  workspaceId?: string;
  workspaceName?: string;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  metadata?: NotificationMetadata;
}

export interface UnreadNotificationCount {
  totalUnread: number;
  mentionUnread: number;
}
