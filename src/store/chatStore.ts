import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage as sendFirestoreMessage,
  onUserConversationsUpdate,
  onConversationMessagesUpdate,
} from '@/lib/firebase/chat';
import {
  sendMessage as sendSocketMessage,
  sendTypingNotification,
  markMessageAsRead,
} from '@/lib/socket';
import { generateAIResponse } from '@/lib/api/ai';
import { Conversation, ChatState } from '@/types';

interface ChatStore extends ChatState {
  // Conversation actions
  fetchConversations: (userId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  createNewConversation: (
    participants: string[],
    isAIChat?: boolean
  ) => Promise<Conversation>;

  // Message actions
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

  // Typing indicators
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;

  // Listeners
  initConversationsListener: (userId: string) => () => void;
  initMessagesListener: (conversationId: string) => () => void;
}

// Create chat store with Zustand and Immer
export const useChatStore = create<ChatStore>()(
  immer((set, get) => {
    // Track active timeouts to prevent duplicates
    const activeTimeouts: { [key: string]: NodeJS.Timeout } = {};

    // Track recent fetchConversations calls to prevent duplicates
    const recentFetches: { [userId: string]: number } = {};
    const FETCH_COOLDOWN = 3000; // 3 seconds

    // Add a utility function to prevent loading state from getting stuck
    const setLoadingWithTimeout = (
      loading: boolean,
      source: string = 'unknown'
    ) => {
      // Always clear any existing timeout first to prevent duplicate warnings
      const timeoutKey = `loading_${source}`;
      if (activeTimeouts[timeoutKey]) {
        clearTimeout(activeTimeouts[timeoutKey]);
        delete activeTimeouts[timeoutKey];
      }

      set((state) => {
        state.loading = loading;
        if (loading) {
          state.error = null; // Clear error when starting loading
        }
      });

      // If we're setting loading to true, also set a timeout to clear it
      if (loading) {
        // Set a longer timeout (8 seconds) to account for slower operations
        activeTimeouts[timeoutKey] = setTimeout(() => {
          const currentState = get();
          if (currentState.loading) {
            console.warn(
              `Loading state from "${source}" was active for too long, forcing it to false`
            );
            set((state) => {
              state.loading = false;
            });
          }

          // Clear timeout reference
          delete activeTimeouts[timeoutKey];
        }, 8000); // 8 second timeout
      }
    };

    return {
      // Initial state
      conversations: [],
      activeConversation: null,
      messages: [],
      loading: false,
      error: null,

      // Fetch user conversations
      fetchConversations: async (userId: string) => {
        try {
          // Add throttling to prevent repeated calls
          const now = Date.now();
          const lastFetch = recentFetches[userId] || 0;

          if (now - lastFetch < FETCH_COOLDOWN) {
            console.log(
              `Throttling fetchConversations for user ${userId} - called too frequently`
            );
            return; // Skip if called recently
          }

          // Record this fetch time
          recentFetches[userId] = now;

          // Log the fetch for debugging
          console.log(
            `Starting fetchConversations in store for user: ${userId}`
          );
          setLoadingWithTimeout(true, `fetchConversations:${userId}`);

          try {
            const conversations = await getUserConversations(userId);

            set((state) => {
              state.conversations = conversations;
              state.loading = false;
            });
          } catch (fetchError) {
            // Check if the error is due to missing collections (common for new users)
            if (
              fetchError &&
              typeof fetchError === 'object' &&
              'code' in fetchError &&
              (fetchError.code === 'permission-denied' ||
                fetchError.code === 'not-found' ||
                fetchError.code === 'resource-exhausted')
            ) {
              console.log(
                'Firebase collection may not exist yet, setting empty conversations'
              );
              set((state) => {
                state.conversations = [];
                state.loading = false;
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
            state.loading = false;
          });
        }
      },

      // Set active conversation
      setActiveConversation: (conversation) => {
        // console.log('Setting active conversation:', conversation?.id || 'null');

        // First clear messages and set the active conversation
        set((state) => {
          state.activeConversation = conversation;

          // Clear messages when switching conversations
          if (
            conversation &&
            conversation.id !== state.activeConversation?.id
          ) {
            state.messages = [];
          }
        });

        // Then fetch messages only if we have a conversation
        if (conversation) {
          // console.log(
          //   'Fetching messages for newly active conversation:',
          //   conversation.id
          // );
          get().fetchMessages(conversation.id);
        } else {
          // Make sure loading is false if we're clearing the active conversation
          set((state) => {
            state.loading = false;
          });
        }
      },

      // Create new conversation
      createNewConversation: async (participants, isAIChat = false) => {
        try {
          setLoadingWithTimeout(true, 'createNewConversation');

          const conversation = await createConversation(participants, isAIChat);

          set((state) => {
            // Add to conversations if not already there
            if (!state.conversations.some((c) => c.id === conversation.id)) {
              state.conversations = [conversation, ...state.conversations];
            }
            state.loading = false;
          });

          return conversation;
        } catch (error) {
          const errorMessage =
            (error as Error).message || 'Failed to create conversation';

          set((state) => {
            state.error = errorMessage;
            state.loading = false;
          });

          throw error;
        }
      },

      // Fetch messages for a conversation
      fetchMessages: async (conversationId: string) => {
        try {
          // Add throttling to prevent repeated calls
          const now = Date.now();
          const lastFetch = recentFetches[conversationId] || 0;

          if (now - lastFetch < FETCH_COOLDOWN) {
            console.log(
              `Throttling fetchMessages for conversation ${conversationId} - called too frequently`
            );
            return; // Skip if called recently
          }

          // Record this fetch time
          recentFetches[conversationId] = now;

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
                state.loading = false;
              });

              return;
            }

            // Normal case - update with the new messages
            set((state) => {
              state.messages = messages;
              state.loading = false;
            });
          } catch (fetchError) {
            // Check if the error is due to missing collections (common for new conversations)
            if (
              fetchError &&
              typeof fetchError === 'object' &&
              'code' in fetchError &&
              (fetchError.code === 'permission-denied' ||
                fetchError.code === 'not-found' ||
                fetchError.code === 'resource-exhausted')
            ) {
              console.log(
                'Firebase messages collection may not exist yet, setting empty messages'
              );
              set((state) => {
                state.messages = [];
                state.loading = false;
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
            state.loading = false;
          });
        }
      },

      // Send a message
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
          const errorMessage =
            (error as Error).message || 'Failed to send message';

          set((state) => {
            state.error = errorMessage;
          });

          throw error;
        }
      },

      // Send a message to AI and get response
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
          });

          throw error;
        }
      },

      // Mark message as read
      markMessageAsRead: (messageId: string, conversationId: string) => {
        // Use Socket.IO to send read receipt
        markMessageAsRead(messageId, conversationId);
      },

      // Set typing indicator
      setTyping: (
        conversationId: string,
        userId: string,
        isTyping: boolean
      ) => {
        // Use Socket.IO to notify typing status
        sendTypingNotification(conversationId, userId, isTyping);
      },

      // Initialize conversations listener
      initConversationsListener: (userId: string) => {
        // console.log(
        //   'Setting up Firebase conversations listener for user:',
        //   userId
        // );

        return onUserConversationsUpdate(userId, (conversations) => {
          // console.log('Conversations update received:', conversations.length);

          set((state) => {
            state.conversations = conversations;
            state.loading = false; // Ensure loading is set to false when conversations are updated
          });
        });
      },

      // Initialize messages listener
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
            state.loading = false; // Ensure loading is set to false when messages are updated

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
          });
        });
      },
    };
  })
);
