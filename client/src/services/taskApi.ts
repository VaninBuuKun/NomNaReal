import { httpClient } from './httpClient';
import type { TaskItem, TaskItemStatus, TaskPriority } from '../types/task';

export interface CreateTaskPayload {
  channelId: string;
  title: string;
  note?: string | null;
  attachmentUrl?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  sourceMessageId?: string | null;
}

export interface UpdateTaskPayload {
  title: string;
  note?: string | null;
  attachmentUrl?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  completionNote?: string | null;
}

export const taskApi = {
  getChannelTasks: async (channelId: string): Promise<TaskItem[]> => {
    const response = await httpClient.get<TaskItem[]>(`/tasks/channel/${channelId}`);
    return response.data;
  },

  createTask: async (payload: CreateTaskPayload): Promise<TaskItem> => {
    const response = await httpClient.post<TaskItem>('/tasks', payload);
    return response.data;
  },

  updateTask: async (taskId: string, payload: UpdateTaskPayload): Promise<TaskItem> => {
    const response = await httpClient.put<TaskItem>(`/tasks/${taskId}`, payload);
    return response.data;
  },

  toggleTaskStatus: async (
    taskId: string,
    targetStatus?: TaskItemStatus,
    completionNote?: string | null
  ): Promise<TaskItem> => {
    const response = await httpClient.patch<TaskItem>(`/tasks/${taskId}/status`, {
      targetStatus,
      completionNote,
    });
    return response.data;
  },

  deleteTask: async (taskId: string, channelId?: string): Promise<void> => {
    await httpClient.delete(`/tasks/${taskId}`, {
      params: channelId ? { channelId } : undefined,
    });
  },
};
