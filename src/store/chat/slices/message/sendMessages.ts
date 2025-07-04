import { MessageSliceState } from './baseSlice';
import { SetFn } from '@/store/chat/types';
import { sendMessage as sendFirestoreMessage } from '@/lib/firebase/chat';
import { sendMessage as sendSocketMessage } from '@/lib/socket';
import { handleMessageError } from './baseSlice';

export interface SendMessagesOperations {
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string
  ) => Promise<void>;
}

export const createSendMessagesOperations = <T extends MessageSliceState>(
  set: SetFn<T>
): SendMessagesOperations => ({
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string
  ) => {
    try {
      const message = await sendFirestoreMessage(
        conversationId,
        senderId,
        content
      );

      sendSocketMessage(message);

      return;
    } catch (error) {
      handleMessageError(set, error, 'Failed to send message');
      throw error;
    }
  },
});
