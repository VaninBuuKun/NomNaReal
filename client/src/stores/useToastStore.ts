import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

let lastToastSignature = '';
let lastToastTime = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toastData) => {
    const signature = `${toastData.variant || 'info'}:${toastData.title}:${toastData.description || ''}`;
    const now = Date.now();
    if (signature === lastToastSignature && now - lastToastTime < 2000) {
      // Suppress duplicate toasts fired within 2 seconds
      return 'duplicate';
    }
    lastToastSignature = signature;
    lastToastTime = now;

    const id = toastData.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = {
      ...toastData,
      id,
      duration: toastData.duration ?? 4500,
    };

    set((state) => ({
      // Keep maximum 4 active toasts, most recent first
      toasts: [newToast, ...state.toasts.filter((t) => t.id !== id)].slice(0, 4),
    }));

    return id;
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));

/**
 * Universal imperative Toast dispatcher accessible anywhere in the application.
 */
export const toast = {
  show: (item: Omit<ToastItem, 'id' | 'variant'> & { variant?: ToastVariant; id?: string }) =>
    useToastStore.getState().addToast({ variant: 'info', ...item }),

  info: (title: string, description?: string, options?: Partial<ToastItem>) =>
    useToastStore.getState().addToast({
      variant: 'info',
      title,
      description,
      ...options,
    }),

  success: (title: string, description?: string, options?: Partial<ToastItem>) =>
    useToastStore.getState().addToast({
      variant: 'success',
      title,
      description,
      ...options,
    }),

  warning: (title: string, description?: string, options?: Partial<ToastItem>) =>
    useToastStore.getState().addToast({
      variant: 'warning',
      title,
      description,
      ...options,
    }),

  error: (title: string, description?: string, options?: Partial<ToastItem>) =>
    useToastStore.getState().addToast({
      variant: 'error',
      title,
      description,
      ...options,
    }),

  dismiss: (id: string) => useToastStore.getState().dismissToast(id),
};

