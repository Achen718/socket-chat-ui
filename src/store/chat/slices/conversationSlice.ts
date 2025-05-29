import { Conversation, Message } from '@/types';
import {
  createConversation,
  getUserConversations,
  onUserConversationsUpdate,
} from '@/lib/firebase/chat';
import { shouldProceed } from '../utils/throttleUtils';

interface ChatStoreState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

interface MessageSliceMethods {
  fetchMessages: (conversationId: string) => Promise<void>;
}

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

type SliceState = ChatStoreState & MessageSliceMethods;

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
      if (!shouldProceed(`fetchConversations:${userId}`)) return;

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
    set((state) => {
      state.activeConversation = conversation;

      if (conversation && conversation.id !== state.activeConversation?.id) {
        state.messages = [];
      }
      return state;
    });

    if (conversation) {
      const store = get();
      store.fetchMessages(conversation.id);
    } else {
      set((state) => {
        state.conversationsLoading = false;
        state.messagesLoading = false;
        return state;
      });
    }
  },

  createNewConversation: async (participants, isAIChat = false) => {
    try {
      setLoadingWithTimeout(true, 'createNewConversation');

      const conversation = await createConversation(participants, isAIChat);
      set((state) => {
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

      if (conversations.length > 0) {
        const currentState = get();

        const hasMessageChanges = conversations.some((newConversation) => {
          const existingConversation = currentState.conversations.find(
            (c) => c.id === newConversation.id
          );

          if (!existingConversation) return true;

          return (
            existingConversation.lastMessage?.content !==
            newConversation.lastMessage?.content
          );
        });

        if (hasMessageChanges) {
          console.log('Detected lastMessage changes in conversations update');
        }
      }

      set((state) => {
        let shouldUpdateActive = false;
        let updatedActiveConversation = null;

        if (state.activeConversation) {
          const updatedConversation = conversations.find(
            (c) => c.id === state.activeConversation?.id
          );

          if (updatedConversation) {
            if (
              state.activeConversation.lastMessage?.content !==
              updatedConversation.lastMessage?.content
            ) {
              shouldUpdateActive = true;
              updatedActiveConversation = updatedConversation;
            }
          }
        }

        state.conversations = conversations;

        if (shouldUpdateActive && updatedActiveConversation) {
          state.activeConversation = updatedActiveConversation;
        }

        state.conversationsLoading = false;
        return state;
      });
    });
  },
});
