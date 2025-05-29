import { MessageSliceState } from './baseSlice';
import { getConversationMessages } from '@/lib/firebase/chat';
import { shouldProceed } from '../../utils/throttleUtils';
import { SetFn } from '@/store/chat/types';
import { handleMessageError, isCollectionNotFoundError } from './baseSlice';

export interface FetchMessagesOperations {
  fetchMessages: (conversationId: string) => Promise<void>;
}

export const createFetchMessagesOperations = <T extends MessageSliceState>(
  set: SetFn<T>,
  get: () => T,
  setLoadingWithTimeout: (loading: boolean, source: string) => void
): FetchMessagesOperations => ({
  fetchMessages: async (conversationId: string) => {
    try {
      if (!shouldProceed(`fetchMessages:${conversationId}`)) return;

      console.log(
        `Starting fetchMessages in store for conversation: ${conversationId}`
      );
      setLoadingWithTimeout(true, `fetchMessages:${conversationId}`);

      try {
        const currentState = get();
        const currentMessages = currentState.messages || [];

        const messages = await getConversationMessages(conversationId);

        if (messages.length === 0 && currentMessages.length > 0) {
          console.log(
            `Warning: Firebase returned 0 messages for conversation ${conversationId} but we previously had ${currentMessages.length} messages. This may be a temporary error.`
          );

          set((state) => {
            state.messagesLoading = false;
            return state;
          });

          return;
        }

        set((state) => {
          state.messages = messages;
          state.messagesLoading = false;
          return state;
        });
      } catch (fetchError: unknown) {
        if (isCollectionNotFoundError(fetchError)) {
          console.log(
            'Firebase messages collection may not exist yet, setting empty messages'
          );
          set((state) => {
            state.messages = [];
            state.messagesLoading = false;
            return state;
          });
          return;
        }

        throw fetchError;
      }
    } catch (error) {
      handleMessageError(set, error, 'Failed to fetch messages');
    }
  },
});
