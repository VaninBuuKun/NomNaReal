export const TaskItemStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
} as const;

export type TaskItemStatus = (typeof TaskItemStatus)[keyof typeof TaskItemStatus];

export const TaskPriority = {
  Low: 0,
  Normal: 1,
  High: 2,
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface TaskMemberSummary {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string | null;
}

export interface TaskItem {
  id: string;
  workspaceId: string;
  channelId: string;
  title: string;
  note?: string | null;
  status: TaskItemStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  createdById: string;
  assigneeId?: string | null;
  sourceMessageId?: string | null;
  createdAt: string;
  updatedAt?: string | null;

  // Populated summaries for UI display
  assignee?: TaskMemberSummary | null;
  creator?: TaskMemberSummary | null;
}
