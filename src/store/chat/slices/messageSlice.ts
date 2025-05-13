import { Conversation, Message } from '@/types';
import {
  getConversationMessages,
  onConversationMessagesUpdate,
  sendMessage as sendFirestoreMessage,
} from '@/lib/firebase/chat';
import {
  sendMessage as sendSocketMessage,
  sendTypingNotification,
  markMessageAsRead as markSocketMessageAsRead,
} from '@/lib/socket';
import { generateAIResponse } from '@/lib/api/ai';
import { shouldProceed } from '../utils/throttleUtils';

// Core state shared across slices
interface ChatStoreState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

// Define what this slice manages
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

// Combined type for what this slice can access
type SliceState = ChatStoreState;

// Define the set function type (compatible with immer)
type SetFn<T> = (fn: (draft: T) => T | void) => void;

export const createMessageSlice = <T extends SliceState>(
  set: SetFn<T>,
  get: () => T,
  setLoadingWithTimeout: (loading: boolean, source: string) => void
): MessageSlice => ({
  messages: [],
  messagesLoading: false,

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
        // and there's no clear reason (like a collection not existing),
        // we should consider this a temporary glitch and keep the old messages
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
        const error = fetchError as { code?: string };
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'permission-denied' ||
            error.code === 'not-found' ||
            error.code === 'resource-exhausted')
        ) {
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
      const errorMessage =
        (error as Error).message || 'Failed to fetch messages';

      set((state) => {
        state.error = errorMessage;
        state.messagesLoading = false;
        return state;
      });
    }
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string
  ) => {
    try {
      // Send message to Firestore
      const message = await sendFirestoreMessage(
        conversationId,
        senderId,
        content
      );

      // Send message via Socket.IO for real-time delivery
      sendSocketMessage(message);

      return;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to send message';

      set((state) => {
        state.error = errorMessage;
        return state;
      });

      throw error;
    }
  },

  sendAIMessage: async (
    conversationId: string,
    message: string,
    aiRecipientId: string
  ) => {
    try {
      const currentState = get();
      const user = currentState.activeConversation?.participants.find(
        (id: string) => id !== aiRecipientId
      );

      if (!user) {
        throw new Error('No user found in conversation');
      }

      console.log(`Sending message to AI: ${message.substring(0, 20)}...`);

      // First send the user's message - use the human user's ID as sender
      await sendFirestoreMessage(conversationId, user, message);

      // Add a small delay to make sure the message is delivered and indexed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get latest messages for context
      const messageHistory = await getConversationMessages(conversationId);

      console.log(
        `Generating AI response with ${messageHistory.length} messages of context`
      );

      try {
        // Generate AI response
        const aiResponse = await generateAIResponse({
          message,
          conversationId,
          messageHistory,
        });

        console.log(
          `Got AI response: ${aiResponse.content.substring(0, 20)}...`
        );

        // Then send the AI's response message
        await sendFirestoreMessage(
          conversationId,
          aiRecipientId,
          aiResponse.content,
          true // Mark as AI message
        );
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);

        // Send a fallback message from the AI
        const fallbackMessage =
          "I'm sorry, I encountered an error while processing your request. Please try again later.";

        await sendFirestoreMessage(
          conversationId,
          aiRecipientId,
          fallbackMessage,
          true // Mark as AI message
        );

        // Still throw the error for upstream handling
        throw aiError;
      }

      return;
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

  markMessageAsRead: (messageId: string, conversationId: string) => {
    // Use Socket.IO to send read receipt
    markSocketMessageAsRead(messageId, conversationId);
  },

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    // Use Socket.IO to notify typing status
    sendTypingNotification(conversationId, userId, isTyping);
  },

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
