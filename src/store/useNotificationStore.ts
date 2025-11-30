import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, newNotification.duration);
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

// Helper functions for easy use
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: "success",
      title,
      message,
      duration,
    });
  },

  error: (title: string, message?: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: "error",
      title,
      message,
      duration,
    });
  },

  warning: (title: string, message?: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: "warning",
      title,
      message,
      duration,
    });
  },

  info: (title: string, message?: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: "info",
      title,
      message,
      duration,
    });
  },
};
