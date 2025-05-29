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

      set((state) => {
        if (messages.length > 0) {
          console.log(
            `Updating state with ${messages.length} messages for conversation ${conversationId}`
          );

          if (state.messages.length !== messages.length) {
            console.log(
              `Message count changed: ${state.messages.length} -> ${messages.length}`
            );
          }
        }

        state.messages = messages;
        state.messagesLoading = false;

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
