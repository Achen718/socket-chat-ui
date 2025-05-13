import { Message } from '@/types';
import { SetFn } from '@/store/chat/types';
import { initialMessageState, MessageSliceState } from './baseSlice';
import { createFetchMessagesOperations } from './fetchMessages';
import { createSendMessagesOperations } from './sendMessages';
import { createAiMessagesOperations } from './aiMessages';
import { createListenerOperations } from './listeners';
import { createSocketOperations } from './socketEvents';

// Full interface for what this slice exposes
export interface MessageSlice {
  // State
  messages: Message[];
  messagesLoading: boolean;

  // Operations
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string
  ) => Promise<void>;
  sendAIMessage: (
    conversationId: string,
    message: string,
    aiRecipientId: string
  ) => Promise<void>;
  markMessageAsRead: (messageId: string, conversationId: string) => void;
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;
  initMessagesListener: (conversationId: string) => () => void;
}

// Create the full message slice
export const createMessageSlice = <T extends MessageSliceState>(
  set: SetFn<T>,
  get: () => T,
  setLoadingWithTimeout: (loading: boolean, source: string) => void
): MessageSlice => {
  // Create individual operation modules
  const fetchOps = createFetchMessagesOperations<T>(
    set,
    get,
    setLoadingWithTimeout
  );
  const sendOps = createSendMessagesOperations<T>(set);
  const aiOps = createAiMessagesOperations<T>(set, get);
  const listenerOps = createListenerOperations<T>(set);
  const socketOps = createSocketOperations();

  // Combine into a single slice
  return {
    ...initialMessageState,
    ...fetchOps,
    ...sendOps,
    ...aiOps,
    ...listenerOps,
    ...socketOps,
  };
};
