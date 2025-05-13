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
      // Add throttling to prevent repeated calls
      if (!shouldProceed(`fetchMessages:${conversationId}`)) return;

      // Log the fetch for debugging
      console.log(
        `Starting fetchMessages in store for conversation: ${conversationId}`
      );
      setLoadingWithTimeout(true, `fetchMessages:${conversationId}`);

      try {
        // Get the current state before fetching
        const currentState = get();
        const currentMessages = currentState.messages || [];

        // Fetch new messages
        const messages = await getConversationMessages(conversationId);

        // Safety check: If we previously had messages but got an empty array,
        // and there's no clear reason, keep the old messages
        if (messages.length === 0 && currentMessages.length > 0) {
          console.log(
            `Warning: Firebase returned 0 messages for conversation ${conversationId} but we previously had ${currentMessages.length} messages. This may be a temporary error.`
          );

          // Only update loading state but keep the current messages
          set((state) => {
            state.messagesLoading = false;
            return state;
          });

          return;
        }

        // Normal case - update with the new messages
        set((state) => {
          state.messages = messages;
          state.messagesLoading = false;
          return state;
        });
      } catch (fetchError: unknown) {
        // Check if the error is due to missing collections (common for new conversations)
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

        // Re-throw for regular error handling
        throw fetchError;
      }
    } catch (error) {
      handleMessageError(set, error, 'Failed to fetch messages');
    }
  },
});
