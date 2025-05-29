import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UIState, Notification } from '@/types';

interface UIStore extends UIState {
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;

  toggleMobileSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;

  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIStore>()(
  immer((set) => ({
    darkMode: false,
    mobileSidebarOpen: false,
    notifications: [],

    toggleDarkMode: () => {
      set((state) => {
        state.darkMode = !state.darkMode;

        if (state.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    },

    setDarkMode: (darkMode) => {
      set((state) => {
        state.darkMode = darkMode;

        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    },
    toggleMobileSidebar: () => {
      set((state) => {
        state.mobileSidebarOpen = !state.mobileSidebarOpen;
      });
    },

    setMobileSidebar: (open) => {
      set((state) => {
        state.mobileSidebarOpen = open;
      });
    },

    addNotification: (notification) => {
      set((state) => {
        const id = `notification-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        state.notifications.unshift({
          id,
          ...notification,
          timestamp,
          read: false,
        });

        if (state.notifications.length > 20) {
          state.notifications = state.notifications.slice(0, 20);
        }
      });
    },

    markNotificationAsRead: (id) => {
      set((state) => {
        const index = state.notifications.findIndex((n) => n.id === id);
        if (index !== -1) {
          state.notifications[index].read = true;
        }
      });
    },

    clearNotifications: () => {
      set((state) => {
        state.notifications = [];
      });
    },
  }))
);
