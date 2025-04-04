import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UIState, Notification } from '@/types';

interface UIStore extends UIState {
  // Theme actions
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;

  // Sidebar actions
  toggleMobileSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;

  // Notification actions
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

// Create UI store with Zustand and Immer
export const useUIStore = create<UIStore>()(
  immer((set) => ({
    // Initial state
    darkMode: false,
    mobileSidebarOpen: false,
    notifications: [],

    // Theme actions
    toggleDarkMode: () => {
      set((state) => {
        state.darkMode = !state.darkMode;

        // Update document class for Tailwind dark mode
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

        // Update document class for Tailwind dark mode
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    },

    // Sidebar actions
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

    // Notification actions
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

        // Limit to 20 notifications
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
