// User related types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Message related types
export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date | string;
  status: 'sent' | 'delivered' | 'read';
  isAI?: boolean;
}

// Conversation related types
export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Date | string;
    sender: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  isAIChat?: boolean;
}

// Auth related types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Chat related types
export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}

// Socket related types
export interface SocketState {
  connected: boolean;
  typing: {
    [userId: string]: boolean;
  };
}

// UI related types
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

// AI chat related types
export interface AIResponse {
  content: string;
  conversationId: string;
  timestamp: Date | string;
}

export interface AIRequestPayload {
  message: string;
  conversationId: string;
  messageHistory: Message[];
}
