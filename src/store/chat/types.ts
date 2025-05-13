import { Conversation, Message } from '@/types';

// Core state shared across all slices
export interface ChatStoreState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

// Define the set function type (compatible with immer)
export type SetFn<T> = (fn: (draft: T) => T | void) => void;

// Firebase error type
export interface FirebaseError {
  code?: string;
  message?: string;
}
