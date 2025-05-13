import { useEffect, useRef } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { Conversation, Message } from '@/types';

// Static tracking to prevent multiple listeners across hook instances
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

  // Add refs to track if listeners are already initialized
  const conversationsListenerInitialized = useRef(false);
  const messagesListenerInitialized = useRef<string | null>(null);
  const conversationsUnsubscribe = useRef<(() => void) | null>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);
  const hookInstanceId = useRef(`useChat-${Date.now()}`);

  // Initialize conversation listener when user is authenticated
  useEffect(() => {
    // Clean up function to ensure listeners are properly removed
    const cleanup = () => {
      if (conversationsUnsubscribe.current) {
        console.log(
          `[${hookInstanceId.current}] Cleaning up conversations listener`
        );
        conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;

        // Clear from static tracking if this is the one that set it
        if (user?.id && conversationsListenerInitialized.current) {
          activeListeners.conversations.delete(user.id);
        }
      }
      conversationsListenerInitialized.current = false;
    };

    // Skip if no user or already initialized
    if (!user || !user.id) {
      cleanup();
      return;
    }

    // Check if there's already an active listener for this user globally
    const isGloballyActive = activeListeners.conversations.get(user.id);

    // Set up listener if not already initialized (both locally and globally)
    if (!conversationsListenerInitialized.current && !isGloballyActive) {
      console.log(
        `[${hookInstanceId.current}] Initializing conversations listener for user: ${user.id}`
      );

      // Mark as active globally
      activeListeners.conversations.set(user.id, true);

      // Initialize locally
      conversationsListenerInitialized.current = true;
      conversationsUnsubscribe.current = initConversationsListener(user.id);
    } else if (isGloballyActive) {
      console.log(
        `[${hookInstanceId.current}] Skipping conversation listener - already active for user ${user.id}`
      );
    }

    // Always return cleanup function
    return cleanup;
  }, [user, initConversationsListener]);

  // Initialize messages listener when active conversation changes
  useEffect(() => {
    // Clean up function to ensure listeners are properly removed
    const cleanup = () => {
      if (messagesUnsubscribe.current) {
        const convId = messagesListenerInitialized.current;
        console.log(
          `[${hookInstanceId.current}] Cleaning up messages listener for conversation: ${convId}`
        );
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;

        // Clear from static tracking if this is the one that set it
        if (convId) {
          activeListeners.messages.delete(convId);
        }
      }
      messagesListenerInitialized.current = null;
    };

    // Skip if no active conversation
    if (!activeConversation) {
      cleanup();
      return;
    }

    // Check if there's already a global listener for this conversation
    const convId = activeConversation.id;
    const isGloballyActive = activeListeners.messages.get(convId);

    // If already listening to this conversation (locally or globally), don't reinitialize
    if (messagesListenerInitialized.current === convId || isGloballyActive) {
      if (isGloballyActive && messagesListenerInitialized.current !== convId) {
        console.log(
          `[${hookInstanceId.current}] Skipping messages listener - already active for conversation ${convId}`
        );
      }
      return;
    }

    // Clean up previous listener if switching conversations
    cleanup();

    // Fetch initial messages - this is fine to do even if another hook instance already did it
    console.log(
      `[${hookInstanceId.current}] Fetching initial messages for conversation: ${convId}`
    );
    fetchAllMessages(convId);

    // Set up listener for real-time updates
    console.log(
      `[${hookInstanceId.current}] Initializing messages listener for conversation: ${convId}`
    );

    // Mark as active globally
    activeListeners.messages.set(convId, true);

    // Initialize locally
    messagesListenerInitialized.current = convId;
    messagesUnsubscribe.current = initMessagesListener(convId);

    // Always return cleanup function
    return cleanup;
  }, [activeConversation, fetchAllMessages, initMessagesListener]);

  // Cleanup all listeners when component unmounts
  useEffect(() => {
    return () => {
      console.log(
        `[${hookInstanceId.current}] Cleaning up all listeners on unmount`
      );

      if (conversationsUnsubscribe.current) {
        conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;

        // Clear from static tracking
        if (user?.id && conversationsListenerInitialized.current) {
          activeListeners.conversations.delete(user.id);
        }
      }

      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;

        // Clear from static tracking
        if (messagesListenerInitialized.current) {
          activeListeners.messages.delete(messagesListenerInitialized.current);
        }
      }

      conversationsListenerInitialized.current = false;
      messagesListenerInitialized.current = null;
    };
  }, [user]);

  // Fetch conversations - modified to prevent duplicate calls
  const fetchConversations = async () => {
    if (user) {
      console.log(
        `[${hookInstanceId.current}] Manual fetchConversations called for user: ${user.id}`
      );
      await fetchAllConversations(user.id);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async () => {
    if (activeConversation) {
      try {
        // Create a wrapper function that protects against empty results
        // that might be caused by temporary Firebase errors
        const safelyFetchMessages = async () => {
          // Store current messages count for comparison
          const currentMessageCount = messages.length;

          // Attempt to fetch messages
          await fetchAllMessages(activeConversation.id);

          // If we had messages before but now have zero, and it's the same conversation,
          // log a warning as this may indicate a Firebase glitch
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

        // Execute the safe fetch function
        await safelyFetchMessages();
      } catch (error) {
        console.error('Error fetching messages in useChat:', error);
      }
    }
  };

  // Send message in active conversation
  const sendMessage = async (content: string) => {
    if (user && activeConversation) {
      await sendMessageToConversation(activeConversation.id, user.id, content);
    }
  };

  // Send message to AI in active conversation
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
