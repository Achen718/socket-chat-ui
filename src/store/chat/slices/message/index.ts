import { Message } from '@/types';
import { SetFn } from '@/store/chat/types';
import { initialMessageState, MessageSliceState } from './baseSlice';
import { createFetchMessagesOperations } from './fetchMessages';
import { createSendMessagesOperations } from './sendMessages';
import { createAiMessagesOperations } from './aiMessages';
import { createListenerOperations } from './listeners';
import { createSocketOperations } from './socketEvents';

export interface MessageSlice {
  messages: Message[];
  messagesLoading: boolean;

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

export const createMessageSlice = <T extends MessageSliceState>(
  set: SetFn<T>,
  get: () => T,
  setLoadingWithTimeout: (loading: boolean, source: string) => void
): MessageSlice => {
  const fetchOps = createFetchMessagesOperations<T>(
    set,
    get,
    setLoadingWithTimeout
  );
  const sendOps = createSendMessagesOperations<T>(set);
  const aiOps = createAiMessagesOperations<T>(set, get);
  const listenerOps = createListenerOperations<T>(set);
  const socketOps = createSocketOperations();

  return {
    ...initialMessageState,
    ...fetchOps,
    ...sendOps,
    ...aiOps,
    ...listenerOps,
    ...socketOps,
  };
};
