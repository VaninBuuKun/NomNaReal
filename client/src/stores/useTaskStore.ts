import { create } from 'zustand';
import {
  type TaskItem,
  TaskItemStatus,
  TaskPriority,
} from '../types/task';
import { taskApi } from '../services/taskApi';

// Clear any legacy mock task storage
try {
  localStorage.removeItem('nomna_tasks_storage');
  localStorage.removeItem('nomna_tasks_storage_v2');
} catch {
  // ignore
}

export type TaskFilterType = 'all' | 'my' | 'pending' | 'completed';

interface TaskState {
  tasks: TaskItem[];
  filter: TaskFilterType;
  searchKeyword: string;
  isLoading: boolean;
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

  // API Fetch
  fetchTasks: (channelId: string) => Promise<void>;

  // Task Mutations
  addTask: (newTask: Omit<TaskItem, 'id' | 'createdAt' | 'status'> & { status?: TaskItemStatus }) => Promise<TaskItem>;
  toggleTaskStatus: (taskId: string, targetStatus?: TaskItemStatus, completionNote?: string | null) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  deleteTask: (taskId: string, channelId?: string) => Promise<void>;

  // Real-time SignalR Event Handlers
  handleTaskCreated: (task: TaskItem) => void;
  handleTaskUpdated: (task: TaskItem) => void;
  handleTaskStatusChanged: (task: TaskItem) => void;
  handleTaskDeleted: (payload: { taskId: string }) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  filter: 'all',
  searchKeyword: '',
  isLoading: false,
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

  fetchTasks: async (channelId: string) => {
    if (!channelId) return;

    try {
      set({ isLoading: true });
      const serverTasks = await taskApi.getChannelTasks(channelId);
      set((state) => {
        const otherChannelTasks = state.tasks.filter((t) => t.channelId !== channelId);
        return { tasks: [...serverTasks, ...otherChannelTasks], isLoading: false };
      });
    } catch (err) {
      console.warn('Could not fetch tasks from server:', err);
      set({ isLoading: false });
    }
  },

  addTask: async (newTaskData) => {
    // Optimistic creation
    const tempId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticTask: TaskItem = {
      ...newTaskData,
      id: tempId,
      status: newTaskData.status ?? TaskItemStatus.Todo,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      tasks: [optimisticTask, ...state.tasks],
      isCreateModalOpen: false,
      createInitialData: null,
    }));

    try {
      if (newTaskData.channelId) {
        const serverTask = await taskApi.createTask({
          channelId: newTaskData.channelId,
          title: newTaskData.title,
          note: newTaskData.note,
          attachmentUrl: newTaskData.attachmentUrl,
          priority: newTaskData.priority,
          dueDate: newTaskData.dueDate,
          assigneeId: newTaskData.assigneeId,
          sourceMessageId: newTaskData.sourceMessageId,
        });

        // Replace temp task with real server task
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === tempId ? serverTask : t)),
        }));

        return serverTask;
      }
    } catch (err) {
      console.error('Failed to create task on server:', err);
    }

    return optimisticTask;
  },

  toggleTaskStatus: async (taskId: string, targetStatus?: TaskItemStatus, completionNote?: string | null) => {
    // Optimistic toggle
    let channelId: string | undefined;
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        channelId = task.channelId;
        const isCurrentlyDone = task.status === TaskItemStatus.Done;
        const nextStatus = targetStatus !== undefined ? targetStatus : isCurrentlyDone ? TaskItemStatus.Todo : TaskItemStatus.Done;
        return {
          ...task,
          status: nextStatus,
          completionNote: nextStatus === TaskItemStatus.Done && completionNote !== undefined ? completionNote : task.completionNote,
          completedAt: nextStatus === TaskItemStatus.Done ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    try {
      if (channelId && !taskId.startsWith('task-')) {
        const updated = await taskApi.toggleTaskStatus(taskId, targetStatus, completionNote);
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
      }
    } catch (err) {
      console.error('Failed to sync toggleTaskStatus to server:', err);
    }
  },

  updateTask: async (taskId: string, updates: Partial<TaskItem>) => {
    let channelId: string | undefined;
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        channelId = task.channelId;
        return {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }),
      taskToEdit: null,
    }));

    try {
      if (channelId && !taskId.startsWith('task-')) {
        const updated = await taskApi.updateTask(taskId, {
          title: updates.title || '',
          note: updates.note,
          attachmentUrl: updates.attachmentUrl,
          priority: updates.priority ?? TaskPriority.Normal,
          dueDate: updates.dueDate,
          assigneeId: updates.assigneeId,
          completionNote: updates.completionNote,
        });

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
      }
    } catch (err) {
      console.error('Failed to sync updateTask to server:', err);
    }
  },

  deleteTask: async (taskId: string, channelId?: string) => {
    let targetChannelId = channelId;
    set((state) => {
      const found = state.tasks.find((t) => t.id === taskId);
      if (found && !targetChannelId) targetChannelId = found.channelId;
      return {
        tasks: state.tasks.filter((t) => t.id !== taskId),
        taskToEdit: null,
      };
    });

    try {
      if (targetChannelId && !taskId.startsWith('task-')) {
        await taskApi.deleteTask(taskId, targetChannelId);
      }
    } catch (err) {
      console.error('Failed to delete task on server:', err);
    }
  },

  handleTaskCreated: (task: TaskItem) => {
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) return state;
      return { tasks: [task, ...state.tasks] };
    });
  },

  handleTaskUpdated: (task: TaskItem) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },

  handleTaskStatusChanged: (task: TaskItem) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },

  handleTaskDeleted: (payload: { taskId: string }) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== payload.taskId),
    }));
  },
}));
