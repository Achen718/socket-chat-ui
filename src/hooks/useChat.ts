import { useEffect, useRef } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { Conversation, Message } from '@/types';

const activeListeners = {
  conversations: new Map<string, boolean>(),
  messages: new Map<string, boolean>(),
};

interface UseChatReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  createNewConversation: (
    participants: string[],
    isAIChat?: boolean
  ) => Promise<Conversation>;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendAIMessage: (message: string, aiRecipientId: string) => Promise<void>;
}

export const useChat = (): UseChatReturn => {
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    activeConversation,
    messages,
    conversationsLoading,
    messagesLoading,
    error,
    fetchConversations: fetchAllConversations,
    setActiveConversation,
    createNewConversation,
    fetchMessages: fetchAllMessages,
    sendMessage: sendMessageToConversation,
    sendAIMessage: sendAIMessageToConversation,
    initConversationsListener,
    initMessagesListener,
  } = useChatStore();

  const conversationsListenerInitialized = useRef(false);
  const messagesListenerInitialized = useRef<string | null>(null);
  const conversationsUnsubscribe = useRef<(() => void) | null>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);
  const hookInstanceId = useRef(`useChat-${Date.now()}`);
  useEffect(() => {
    const cleanup = () => {
      if (conversationsUnsubscribe.current) {
        console.log(
          `[${hookInstanceId.current}] Cleaning up conversations listener`
        );
        conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;

        if (user?.id && conversationsListenerInitialized.current) {
          activeListeners.conversations.delete(user.id);
        }
      }
      conversationsListenerInitialized.current = false;
    };

    if (!user || !user.id) {
      cleanup();
      return;
    }

    const isGloballyActive = activeListeners.conversations.get(user.id);

    if (!conversationsListenerInitialized.current && !isGloballyActive) {
      console.log(
        `[${hookInstanceId.current}] Initializing conversations listener for user: ${user.id}`
      );

      activeListeners.conversations.set(user.id, true);

      conversationsListenerInitialized.current = true;
      conversationsUnsubscribe.current = initConversationsListener(user.id);
    } else if (isGloballyActive) {
      console.log(
        `[${hookInstanceId.current}] Skipping conversation listener - already active for user ${user.id}`
      );
    }

    return cleanup;
  }, [user, initConversationsListener]);
  useEffect(() => {
    const cleanup = () => {
      if (messagesUnsubscribe.current) {
        const convId = messagesListenerInitialized.current;
        console.log(
          `[${hookInstanceId.current}] Cleaning up messages listener for conversation: ${convId}`
        );
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;

        if (convId) {
          activeListeners.messages.delete(convId);
        }
      }
      messagesListenerInitialized.current = null;
    };

    if (!activeConversation) {
      cleanup();
      return;
    }

    const convId = activeConversation.id;
    const isGloballyActive = activeListeners.messages.get(convId);

    if (messagesListenerInitialized.current === convId || isGloballyActive) {
      if (isGloballyActive && messagesListenerInitialized.current !== convId) {
        console.log(
          `[${hookInstanceId.current}] Skipping messages listener - already active for conversation ${convId}`
        );
      }
      return;
    }

    cleanup();

    console.log(
      `[${hookInstanceId.current}] Fetching initial messages for conversation: ${convId}`
    );
    fetchAllMessages(convId);

    console.log(
      `[${hookInstanceId.current}] Initializing messages listener for conversation: ${convId}`
    );

    activeListeners.messages.set(convId, true);

    messagesListenerInitialized.current = convId;
    messagesUnsubscribe.current = initMessagesListener(convId);

    return cleanup;
  }, [activeConversation, fetchAllMessages, initMessagesListener]);
  useEffect(() => {
    const currentHookInstanceId = hookInstanceId.current;

    return () => {
      console.log(
        `[${currentHookInstanceId}] Cleaning up all listeners on unmount`
      );

      if (conversationsUnsubscribe.current) {
        conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;

        if (user?.id && conversationsListenerInitialized.current) {
          activeListeners.conversations.delete(user.id);
        }
      }

      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;

        if (messagesListenerInitialized.current) {
          activeListeners.messages.delete(messagesListenerInitialized.current);
        }
      }

      conversationsListenerInitialized.current = false;
      messagesListenerInitialized.current = null;
    };
  }, [user]);

  const fetchConversations = async () => {
    if (user) {
      console.log(
        `[${hookInstanceId.current}] Manual fetchConversations called for user: ${user.id}`
      );
      await fetchAllConversations(user.id);
    }
  };
  const fetchMessages = async () => {
    if (activeConversation) {
      try {
        const safelyFetchMessages = async () => {
          const currentMessageCount = messages.length;

          await fetchAllMessages(activeConversation.id);

          if (
            currentMessageCount > 0 &&
            messages.length === 0 &&
            activeConversation
          ) {
            console.warn(
              `useChat: Possible Firebase glitch - had ${currentMessageCount} messages but got 0 after fetch for conversation ${activeConversation.id}`
            );
          }
        };

        await safelyFetchMessages();
      } catch (error) {
        console.error('Error fetching messages in useChat:', error);
      }
    }
  };
  const sendMessage = async (content: string) => {
    if (user && activeConversation) {
      await sendMessageToConversation(activeConversation.id, user.id, content);
    }
  };

  const sendAIMessage = async (message: string, aiRecipientId: string) => {
    if (user && activeConversation) {
      await sendAIMessageToConversation(
        activeConversation.id,
        message,
        aiRecipientId
      );
    }
  };

  return {
    conversations,
    activeConversation,
    messages,
    conversationsLoading,
    messagesLoading,
    error,
    fetchConversations,
    setActiveConversation,
    createNewConversation,
    fetchMessages,
    sendMessage,
    sendAIMessage,
  };
};

export default useChat;
