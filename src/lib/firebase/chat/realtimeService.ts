import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { Conversation, Message } from '@/types';
import { ConversationFirestore } from './types';

/**
 * Listen to user conversations with real-time updates
 * @param userId User ID to track conversations for
 * @param callback Function called with updated conversation list
 * @returns Cleanup function to unsubscribe from updates
 */
export const onUserConversationsUpdate = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  // Skip setting up listener if userId is not valid
  if (!userId) {
    console.warn('[Chat] Invalid userId provided to onUserConversationsUpdate');
    callback([]);
    return () => {};
  }

  // Create a unique identifier for this listener for debugging
  const listenerId = `conversations-${userId}-${Date.now()}`;
  console.log(
    `[Chat] Setting up Firebase conversations listener ${listenerId}`
  );

  // Add a flag to track if this is the first callback
  let isFirstCallback = true;

  // Declare timeoutId at function level to be available in both try and catch blocks
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    // Listen to userConversations collection
    const q = query(
      collection(db, 'userConversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    // Add a timeout to handle cases where Firebase might be slow
    timeoutId = setTimeout(() => {
      console.warn(
        `[Chat] Conversations listener ${listenerId} timed out - forcing empty result`
      );
      callback([]);
    }, 5000);

    // Set up the listener with better error handling
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      async (snapshot: QuerySnapshot<DocumentData>) => {
        // Clear the timeout as we got a response
        clearTimeout(timeoutId);

        // Handle empty results
        if (snapshot.empty && isFirstCallback) {
          console.log(
            `[Chat] No conversations found in listener ${listenerId} for user: ${userId}`
          );
          callback([]);
          isFirstCallback = false;
          return;
        }

        try {
          // Performance measurement
          const startTime = performance.now();

          // Check if this is a local change (faster updates)
          const source = snapshot.metadata.hasPendingWrites
            ? 'Local'
            : 'Server';
          console.log(
            `[Chat] Conversations update source (${listenerId}): ${source} - ${snapshot.docs.length} conversations`
          );

          // Get all conversation IDs
          const conversationIds = snapshot.docs.map(
            (doc) => doc.data().conversationId as string
          );

          // Fetch all conversation documents
          const conversations: Conversation[] = [];

          // Track promises for all conversation fetches
          const fetchPromises = conversationIds.map(async (conversationId) => {
            try {
              const conversationDoc = await getDoc(
                doc(db, 'conversations', conversationId)
              );

              if (conversationDoc.exists()) {
                const data = conversationDoc.data() as ConversationFirestore;

                // Handle timestamps properly
                let createdAtStr: string;
                let updatedAtStr: string;

                // Handle createdAt timestamp
                if (data.createdAt instanceof Timestamp) {
                  createdAtStr = data.createdAt.toDate().toISOString();
                } else if (typeof data.createdAt === 'string') {
                  createdAtStr = data.createdAt;
                } else {
                  createdAtStr = new Date().toISOString();
                }

                // Handle updatedAt timestamp
                if (data.updatedAt instanceof Timestamp) {
                  updatedAtStr = data.updatedAt.toDate().toISOString();
                } else if (typeof data.updatedAt === 'string') {
                  updatedAtStr = data.updatedAt;
                } else {
                  updatedAtStr = new Date().toISOString();
                }

                // Handle lastMessage timestamp if it exists
                let lastMessage = undefined;
                if (data.lastMessage) {
                  let timestamp: Date | string;

                  if (data.lastMessage.timestamp instanceof Timestamp) {
                    timestamp = data.lastMessage.timestamp.toDate();
                  } else if (typeof data.lastMessage.timestamp === 'string') {
                    timestamp = data.lastMessage.timestamp;
                  } else {
                    timestamp = new Date();
                  }

                  lastMessage = {
                    content: data.lastMessage.content,
                    sender: data.lastMessage.sender,
                    timestamp,
                  };
                }

                conversations.push({
                  id: conversationId,
                  participants: data.participants,
                  lastMessage,
                  createdAt: createdAtStr,
                  updatedAt: updatedAtStr,
                  isAIChat: data.isAIChat || false,
                });
              }
            } catch (err) {
              console.error(
                `[Chat] Error fetching conversation ${conversationId}:`,
                err
              );
            }
          });

          // Wait for all conversation fetches to complete
          await Promise.all(fetchPromises);

          // Sort by latest activity - either last message timestamp or updatedAt
          conversations.sort((a, b) => {
            // First try to use lastMessage timestamp
            const aTime = a.lastMessage?.timestamp
              ? typeof a.lastMessage.timestamp === 'string'
                ? new Date(a.lastMessage.timestamp).getTime()
                : a.lastMessage.timestamp.getTime()
              : new Date(a.updatedAt).getTime();

            const bTime = b.lastMessage?.timestamp
              ? typeof b.lastMessage.timestamp === 'string'
                ? new Date(b.lastMessage.timestamp).getTime()
                : b.lastMessage.timestamp.getTime()
              : new Date(b.updatedAt).getTime();

            return bTime - aTime;
          });

          // Log performance metrics
          const duration = performance.now() - startTime;
          console.log(
            `[Chat] Processed ${
              conversations.length
            } conversations in ${duration.toFixed(1)}ms`
          );

          // Send to callback
          callback(conversations);
          isFirstCallback = false;
        } catch (error) {
          console.error(
            `[Chat] Error in conversations listener ${listenerId}:`,
            error
          );
          // Don't break the UI - provide empty array on error
          if (isFirstCallback) {
            callback([]);
            isFirstCallback = false;
          }
        }
      },
      (error) => {
        // Clear the timeout since we received an error response
        clearTimeout(timeoutId);

        console.error(
          `[Chat] Error in conversations listener ${listenerId}:`,
          error
        );
        // Still call the callback with an empty array to avoid UI being stuck in loading state
        if (isFirstCallback) {
          callback([]);
          isFirstCallback = false;
        }
      }
    );

    // Return unsubscribe function
    return () => {
      clearTimeout(timeoutId);
      console.log(
        `[Chat] Removing Firebase conversations listener ${listenerId}`
      );
      unsubscribe();
    };
  } catch (error) {
    // Handle errors in setting up the listener
    console.error(
      `[Chat] Error setting up conversations listener ${listenerId}:`,
      error
    );
    clearTimeout(timeoutId);
    callback([]);
    return () => {}; // Return empty cleanup function
  }
};

/**
 * Listen to messages in a conversation with real-time updates
 * @param conversationId Conversation ID to track messages for
 * @param callback Function called with updated message list
 * @returns Cleanup function to unsubscribe from updates
 */
export const onConversationMessagesUpdate = (
  conversationId: string,
  callback: (messages: Message[]) => void
) => {
  // Skip setting up listener if conversationId is not valid
  if (!conversationId) {
    console.error(
      'Invalid conversationId provided to onConversationMessagesUpdate'
    );
    callback([]);
    return () => {}; // Return empty cleanup function
  }

  // Create a unique identifier for this listener for debugging
  const listenerId = `messages-${conversationId}-${Date.now()}`;
  console.log(`Setting up Firebase messages listener ${listenerId}`);

  // Add a flag to track if this is the first callback
  let isFirstCallback = true;

  try {
    // Use subcollection for messages instead of root collection with filter
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    // Add a shorter timeout for real-time messages
    const timeoutId = setTimeout(() => {
      console.warn(
        `Messages listener ${listenerId} timed out - forcing empty result`
      );
      callback([]); // Call with empty array to exit loading state
    }, 3000); // Reduced to 3 second timeout for faster response

    // Use onSnapshot with includeMetadataChanges to get faster updates
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (querySnapshot) => {
        try {
          // Clear the timeout since we received a response
          clearTimeout(timeoutId);

          // If snapshot exists but is empty, that's a valid state (no messages yet)
          if (querySnapshot.empty) {
            // Only log this once to avoid console spam
            if (isFirstCallback) {
              console.log(
                `No messages found for conversation: ${conversationId} (listener ${listenerId})`
              );
              isFirstCallback = false;
            }
            callback([]);
            return;
          }

          // Check if this is a local change (faster updates)
          const source = querySnapshot.metadata.hasPendingWrites
            ? 'Local'
            : 'Server';
          console.log(
            `Message update source (${listenerId}): ${source} - ${querySnapshot.docs.length} messages`
          );

          // After first callback, stop logging details
          isFirstCallback = false;

          const messages = querySnapshot.docs.map((doc) => {
            const data = doc.data();

            // Properly handle timestamp conversion to avoid invalid date errors
            let timestamp: Date;
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp instanceof Date) {
              timestamp = data.timestamp;
            } else {
              timestamp = new Date();
            }

            return {
              id: doc.id,
              conversationId, // Make sure this is explicitly set
              ...data,
              timestamp,
            } as Message;
          });

          // Log message count changes for debugging
          console.log(
            `Messages updated for conversation ${conversationId}: ${messages.length} messages (listener ${listenerId})`
          );

          // Always call the callback with the latest messages
          callback(messages);
        } catch (error) {
          console.error(
            `Error processing message data (listener ${listenerId}):`,
            error
          );
          callback([]); // Ensure callback is always called
        }
      },
      (error) => {
        // Clear the timeout since we received an error response
        clearTimeout(timeoutId);

        // Check specifically for "collection not found" type errors
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'permission-denied' || error.code === 'not-found')
        ) {
          console.log(
            `Firebase messages collection may not exist yet for listener ${listenerId}, returning empty array`
          );
          callback([]);
          return;
        }

        console.error(`Error in messages listener ${listenerId}:`, error);
        // Still call the callback with an empty array to avoid UI being stuck in loading state
        callback([]);
      }
    );

    // Return a function that both clears the timeout and unsubscribes
    return () => {
      console.log(`Cleaning up Firebase messages listener ${listenerId}`);
      clearTimeout(timeoutId);
      unsubscribe();
    };
  } catch (error) {
    console.error(`Error setting up messages listener ${listenerId}:`, error);
    callback([]);
    return () => {
      console.log(
        `Cleaning up stub Firebase messages listener ${listenerId} (after error)`
      );
    }; // Return empty cleanup function
  }
};
