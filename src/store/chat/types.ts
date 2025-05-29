import { Conversation, Message } from '@/types';

export interface ChatStoreState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

export type SetFn<T> = (fn: (draft: T) => T | void) => void;

export interface FirebaseError {
  code?: string;
  message?: string;
}
