import { MessageSliceState } from './baseSlice';
import { onConversationMessagesUpdate } from '@/lib/firebase/chat';
import { SetFn } from '@/store/chat/types';

export interface ListenerOperations {
  initMessagesListener: (conversationId: string) => () => void;
}

export const createListenerOperations = <T extends MessageSliceState>(
  set: SetFn<T>
): ListenerOperations => ({
  initMessagesListener: (conversationId: string) => {
    console.log(
      'Setting up Firebase messages listener for conversation:',
      conversationId
    );

    return onConversationMessagesUpdate(conversationId, (messages) => {
      console.log(
        `Messages update received at ${new Date().toLocaleTimeString()} - ${
          messages.length
        } messages`
      );

      // Always update the state with the latest messages
      set((state) => {
        if (messages.length > 0) {
          // Log only if we received actual messages
          console.log(
            `Updating state with ${messages.length} messages for conversation ${conversationId}`
          );

          // Check if we've actually received new messages
          if (state.messages.length !== messages.length) {
            console.log(
              `Message count changed: ${state.messages.length} -> ${messages.length}`
            );
          }
        }

        // Always update the state to ensure UI reflects the latest data
        state.messages = messages;
        state.messagesLoading = false;

        // If we have an active conversation but it's not loaded in the state yet,
        // try to find it in the conversations array and set it
        if (
          !state.activeConversation &&
          conversationId &&
          state.conversations.length > 0
        ) {
          const targetConversation = state.conversations.find(
            (c) => c.id === conversationId
          );
          if (targetConversation) {
            console.log(
              `Auto-setting active conversation to ${conversationId}`
            );
            state.activeConversation = targetConversation;
          }
        }

        return state;
      });
    });
  },
});
