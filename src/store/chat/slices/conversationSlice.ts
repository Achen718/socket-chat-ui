import { Conversation, Message } from '@/types';
import {
  createConversation,
  getUserConversations,
  onUserConversationsUpdate,
} from '@/lib/firebase/chat';
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

// Message slice methods that we need to reference
interface MessageSliceMethods {
  fetchMessages: (conversationId: string) => Promise<void>;
}

// Define what this slice manages
export interface ConversationSlice {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  conversationsLoading: boolean;
  fetchConversations: (userId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  createNewConversation: (
    participants: string[],
    isAIChat?: boolean
  ) => Promise<Conversation>;
  initConversationsListener: (userId: string) => () => void;
}

// Combined type for what this slice can access
type SliceState = ChatStoreState & MessageSliceMethods;

// Define the set function type (compatible with immer)
type SetFn<T> = (fn: (draft: T) => T | void) => void;

export const createConversationSlice = <T extends SliceState>(
  set: SetFn<T>,
  get: () => T,
  setLoadingWithTimeout: (loading: boolean, source: string) => void
): ConversationSlice => ({
  conversations: [],
  activeConversation: null,
  conversationsLoading: false,

  fetchConversations: async (userId: string) => {
    try {
      // Add throttling to prevent repeated calls
      if (!shouldProceed(`fetchConversations:${userId}`)) return;

      // Log the fetch for debugging
      console.log(`Starting fetchConversations in store for user: ${userId}`);
      setLoadingWithTimeout(true, `fetchConversations:${userId}`);

      try {
        const conversations = await getUserConversations(userId);

        set((state) => {
          state.conversations = conversations;
          state.conversationsLoading = false;
          return state;
        });
      } catch (fetchError: unknown) {
        // Check if the error is due to missing collections (common for new users)
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
            'Firebase collection may not exist yet, setting empty conversations'
          );
          set((state) => {
            state.conversations = [];
            state.conversationsLoading = false;
            return state;
          });
          return;
        }

        // Re-throw for regular error handling
        throw fetchError;
      }
    } catch (error) {
      const errorMessage =
        (error as Error).message || 'Failed to fetch conversations';

      set((state) => {
        state.error = errorMessage;
        state.conversationsLoading = false;
        return state;
      });
    }
  },

  setActiveConversation: (conversation) => {
    // First clear messages and set the active conversation
    set((state) => {
      state.activeConversation = conversation;

      // Clear messages when switching conversations
      if (conversation && conversation.id !== state.activeConversation?.id) {
        state.messages = [];
      }
      return state;
    });

    // Then fetch messages only if we have a conversation
    if (conversation) {
      // Properly typed access to fetchMessages
      const store = get();
      store.fetchMessages(conversation.id);
    } else {
      // Make sure loading is false if we're clearing the active conversation
      set((state) => {
        state.conversationsLoading = false;
        state.messagesLoading = false; // Now properly typed
        return state;
      });
    }
  },

  createNewConversation: async (participants, isAIChat = false) => {
    try {
      setLoadingWithTimeout(true, 'createNewConversation');

      const conversation = await createConversation(participants, isAIChat);

      set((state) => {
        // Add to conversations if not already there
        if (!state.conversations.some((c) => c.id === conversation.id)) {
          state.conversations = [conversation, ...state.conversations];
        }
        state.conversationsLoading = false;
        return state;
      });

      return conversation;
    } catch (error) {
      const errorMessage =
        (error as Error).message || 'Failed to create conversation';

      set((state) => {
        state.error = errorMessage;
        state.conversationsLoading = false;
        return state;
      });

      throw error;
    }
  },

  initConversationsListener: (userId: string) => {
    console.log('Setting up Firebase conversations listener for user:', userId);

    return onUserConversationsUpdate(userId, (conversations) => {
      console.log('Conversations update received:', conversations.length);

      // Force a refresh of all conversation data when there's an update
      if (conversations.length > 0) {
        // This helps ensure we have the most current data for all conversations
        const currentState = get();

        // Check if any conversation's lastMessage has changed compared to our local state
        const hasMessageChanges = conversations.some((newConversation) => {
          const existingConversation = currentState.conversations.find(
            (c) => c.id === newConversation.id
          );

          if (!existingConversation) return true; // New conversation

          // Check if lastMessage content has changed
          return (
            existingConversation.lastMessage?.content !==
            newConversation.lastMessage?.content
          );
        });

        // If we detected message changes, log it
        if (hasMessageChanges) {
          console.log('Detected lastMessage changes in conversations update');
        }
      }

      // Update the conversations
      set((state) => {
        // Track if we need to update the active conversation
        let shouldUpdateActive = false;
        let updatedActiveConversation = null;

        // If we have an active conversation, find the updated version
        if (state.activeConversation) {
          // Look for the updated version of the active conversation
          const updatedConversation = conversations.find(
            (c) => c.id === state.activeConversation?.id
          );

          // If found and has different lastMessage, update it
          if (updatedConversation) {
            if (
              // Check if lastMessage content has changed
              state.activeConversation.lastMessage?.content !==
              updatedConversation.lastMessage?.content
            ) {
              shouldUpdateActive = true;
              updatedActiveConversation = updatedConversation;
            }
          }
        }

        // Always update the conversations list
        state.conversations = conversations;

        // Also update the active conversation if needed
        if (shouldUpdateActive && updatedActiveConversation) {
          state.activeConversation = updatedActiveConversation;
        }

        state.conversationsLoading = false;
        return state;
      });
    });
  },
});
