/**
 * UI related types
 */
export interface UIState {
  darkMode: boolean;
  mobileSidebarOpen: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'message' | 'system' | 'error';
  content: string;
  timestamp: Date | string;
  read: boolean;
}
