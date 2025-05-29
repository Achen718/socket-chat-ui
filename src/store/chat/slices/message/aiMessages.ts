import { MessageSliceState } from './baseSlice';
import { SetFn } from '@/store/chat/types';
import {
  getConversationMessages,
  sendMessage as sendFirestoreMessage,
} from '@/lib/firebase/chat';
import { generateAIResponse } from '@/lib/api/ai';

export interface AiMessagesOperations {
  sendAIMessage: (
    conversationId: string,
    message: string,
    aiRecipientId: string
  ) => Promise<void>;
}

export const createAiMessagesOperations = <T extends MessageSliceState>(
  set: SetFn<T>,
  get: () => T
): AiMessagesOperations => ({
  sendAIMessage: async (
    conversationId: string,
    message: string,
    aiRecipientId: string
  ) => {
    try {
      const currentState = get();
      const user = currentState.activeConversation?.participants.find(
        (id) => id !== aiRecipientId
      );

      if (!user) {
        throw new Error('No user found in conversation');
      }
      console.log(`Sending message to AI: ${message.substring(0, 20)}...`);

      await sendFirestoreMessage(conversationId, user, message);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const messageHistory = await getConversationMessages(conversationId);

      console.log(
        `Generating AI response with ${messageHistory.length} messages of context`
      );
      try {
        const aiResponse = await generateAIResponse({
          message,
          conversationId,
          messageHistory,
        });

        console.log(
          `Got AI response: ${aiResponse.content.substring(0, 20)}...`
        );

        await sendFirestoreMessage(
          conversationId,
          aiRecipientId,
          aiResponse.content,
          true
        );
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);

        const fallbackMessage =
          "I'm sorry, I encountered an error while processing your request. Please try again later.";

        await sendFirestoreMessage(
          conversationId,
          aiRecipientId,
          fallbackMessage,
          true
        );

        throw aiError;
      }
    } catch (error) {
      const errorMessage =
        (error as Error).message || 'Failed to get AI response';

      console.error('AI message error:', errorMessage);

      set((state) => {
        state.error = errorMessage;
        return state;
      });

      throw error;
    }
  },
});
