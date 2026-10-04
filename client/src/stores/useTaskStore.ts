import { create } from 'zustand';
import {
  type TaskItem,
  TaskItemStatus,
  TaskPriority,
} from '../types/task';

const STORAGE_KEY = 'nomna_tasks_storage_v1';

// Seed initial realistic tasks for demo
const INITIAL_DEMO_TASKS: TaskItem[] = [
  {
    id: 'demo-task-1',
    workspaceId: 'demo-workspace',
    channelId: 'demo-channel',
    title: 'Nộp slide báo cáo đồ án tiến độ tuần 4',
    note: 'Chuẩn bị bản PDF và link Google Slides gửi thầy trước buổi học',
    status: TaskItemStatus.Todo,
    priority: TaskPriority.High,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Ngày mai
    createdById: 'user-teacher-1',
    assigneeId: 'user-me',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    creator: {
      id: 'user-teacher-1',
      displayName: 'Thầy Nguyễn Văn An',
      username: 'thayan',
    },
    assignee: {
      id: 'user-me',
      displayName: 'Tôi (Học viên)',
      username: 'ban',
    },
  },
  {
    id: 'demo-task-2',
    workspaceId: 'demo-workspace',
    channelId: 'demo-channel',
    title: 'Tìm hiểu tài liệu Clean Architecture & SignalR',
    note: 'Đọc kỹ tài liệu mô hình CQRS và MediatR để áp dụng vào đồ án',
    status: TaskItemStatus.InProgress,
    priority: TaskPriority.Normal,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 ngày nữa
    createdById: 'user-teacher-1',
    assigneeId: 'user-student-2',
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    creator: {
      id: 'user-teacher-1',
      displayName: 'Thầy Nguyễn Văn An',
      username: 'thayan',
    },
    assignee: {
      id: 'user-student-2',
      displayName: 'Minh Tuấn',
      username: 'minhtuan',
    },
  },
  {
    id: 'demo-task-3',
    workspaceId: 'demo-workspace',
    channelId: 'demo-channel',
    title: 'Thống nhất chủ đề và phân chia thành viên trong nhóm',
    note: 'Đã họp lúc 20:00 và chia việc xong cho cả 4 bạn',
    status: TaskItemStatus.Done,
    priority: TaskPriority.Normal,
    completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    createdById: 'user-me',
    assigneeId: 'user-me',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    creator: {
      id: 'user-me',
      displayName: 'Tôi (Học viên)',
      username: 'ban',
    },
    assignee: {
      id: 'user-me',
      displayName: 'Tôi (Học viên)',
      username: 'ban',
    },
  },
];

function loadTasksFromStorage(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_TASKS;
  } catch {
    return INITIAL_DEMO_TASKS;
  }
}

function saveTasksToStorage(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
}

export type TaskFilterType = 'all' | 'my' | 'pending' | 'completed';

interface TaskState {
  tasks: TaskItem[];
  filter: TaskFilterType;
  searchKeyword: string;
  isCreateModalOpen: boolean;
  createInitialData: Partial<TaskItem> | null;
  taskToEdit: TaskItem | null;

  // Actions
  setFilter: (filter: TaskFilterType) => void;
  setSearchKeyword: (keyword: string) => void;
  openCreateModal: (initialData?: Partial<TaskItem>) => void;
  closeCreateModal: () => void;
  openEditModal: (task: TaskItem) => void;
  closeEditModal: () => void;

  // Task Mutations
  addTask: (newTask: Omit<TaskItem, 'id' | 'createdAt' | 'status'> & { status?: TaskItemStatus }) => TaskItem;
  toggleTaskStatus: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: loadTasksFromStorage(),
  filter: 'all',
  searchKeyword: '',
  isCreateModalOpen: false,
  createInitialData: null,
  taskToEdit: null,

  setFilter: (filter) => set({ filter }),
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),

  openCreateModal: (initialData) =>
    set({
      isCreateModalOpen: true,
      createInitialData: initialData || null,
    }),

  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      createInitialData: null,
    }),

  openEditModal: (task) =>
    set({
      taskToEdit: task,
    }),

  closeEditModal: () =>
    set({
      taskToEdit: null,
    }),

  addTask: (newTaskData) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdTask: TaskItem = {
      ...newTaskData,
      id,
      status: newTaskData.status ?? TaskItemStatus.Todo,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const nextTasks = [createdTask, ...state.tasks];
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks, isCreateModalOpen: false, createInitialData: null };
    });

    return createdTask;
  },

  toggleTaskStatus: (taskId: string) => {
    set((state) => {
      const nextTasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const isCurrentlyDone = task.status === TaskItemStatus.Done;
        const nextStatus = isCurrentlyDone ? TaskItemStatus.Todo : TaskItemStatus.Done;
        return {
          ...task,
          status: nextStatus,
          completedAt: nextStatus === TaskItemStatus.Done ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      });
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  updateTask: (taskId: string, updates: Partial<TaskItem>) => {
    set((state) => {
      const nextTasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks, taskToEdit: null };
    });
  },

  deleteTask: (taskId: string) => {
    set((state) => {
      const nextTasks = state.tasks.filter((t) => t.id !== taskId);
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks, taskToEdit: null };
    });
  },
}));
