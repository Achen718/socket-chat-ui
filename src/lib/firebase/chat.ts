import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  FieldValue,
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './config';
import { Conversation, Message, User } from '@/types';

// Interfaces for Firestore data
interface ConversationFirestore
  extends Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: FieldValue | Date | string;
  updatedAt: FieldValue | Date | string;
}

interface MessageFirestore extends Omit<Message, 'id' | 'timestamp'> {
  timestamp: FieldValue | Date | string;
}

// Create or get a conversation between users with a deterministic ID
export const createOrGetConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  try {
    // Sort participants to ensure consistent ID generation
    const sortedParticipants = [...participants].sort();

    // Generate a unique conversation ID based on sorted participants
    // This ensures only one conversation can exist between the same set of users
    const conversationId = sortedParticipants.join('_');

    // Check if conversation already exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      // Return existing conversation
      const data = conversationSnap.data() as ConversationFirestore;
      return {
        id: conversationId,
        participants: data.participants,
        lastMessage: data.lastMessage || undefined,
        createdAt: data.createdAt
          ? data.createdAt.toString()
          : new Date().toISOString(),
        updatedAt: data.updatedAt
          ? data.updatedAt.toString()
          : new Date().toISOString(),
        isAIChat: data.isAIChat || false,
      };
    }

    // Create new conversation with deterministic ID
    const conversationData: ConversationFirestore = {
      participants: sortedParticipants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    };

    await setDoc(conversationRef, conversationData);

    return {
      id: conversationId,
      participants: sortedParticipants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAIChat,
    };
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw error;
  }
};

// Create a new conversation
export const createConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  // Remove unused startTime
  // const startTime = performance.now();
  // console.log(
  //   `Starting createConversation: participants=${participants.join(
  //     ','
  //   )}, isAIChat=${isAIChat}`
  // );

  try {
    // Check if conversation already exists between these participants
    if (participants.length === 2 && !isAIChat) {
      // console.log('Checking for existing conversation...');
      const existingConversation = await getConversationByParticipants(
        participants
      );
      if (existingConversation) {
        // console.log(`Found existing conversation: ${existingConversation.id}`);
        return existingConversation;
      }
    }

    // console.log('Creating new conversation in Firestore...');
    const conversationData: ConversationFirestore = {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    };

    try {
      const docRef = await addDoc(
        collection(db, 'conversations'),
        conversationData
      );

      // console.log(`Conversation created successfully with ID: ${docRef.id}`);

      const result = {
        id: docRef.id,
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAIChat,
      };

      // Remove unused endTime
      // const endTime = performance.now();
      // console.log(
      //   `createConversation completed in ${(endTime - startTime).toFixed(2)}ms`
      // );

      return result;
    } catch (innerError: unknown) {
      // Check specifically for permission errors
      if (
        innerError &&
        typeof innerError === 'object' &&
        'code' in innerError
      ) {
        const errorObj = innerError as { code: string; message?: string };

        if (errorObj.code === 'permission-denied') {
          // console.error(
          //   'Firebase permission denied. Please check your security rules.'
          // );
          throw new Error(
            `Firebase permission denied: ${errorObj.message || 'Unknown error'}`
          );
        }

        // Check for other common Firebase errors
        if (errorObj.code === 'unavailable') {
          // console.error(
          //   'Firebase service is currently unavailable. Please try again later.'
          // );
          throw new Error('Firebase service is unavailable');
        }
      }

      throw innerError;
    }
  } catch (error) {
    // Remove unused endTime
    // const endTime = performance.now();
    // console.error(
    //   `Error in createConversation (${(endTime - startTime).toFixed(2)}ms):`,
    //   error
    // );
    throw error;
  }
};

// Get conversation by participants
export const getConversationByParticipants = async (
  participants: string[]
): Promise<Conversation | null> => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains-any', participants)
    );

    const querySnapshot = await getDocs(q);

    // Find a conversation with exactly these participants
    for (const doc of querySnapshot.docs) {
      const conversation = doc.data() as ConversationFirestore;
      const participantsMatch =
        participants.length === conversation.participants.length &&
        participants.every((p) => conversation.participants.includes(p));

      if (participantsMatch) {
        return {
          id: doc.id,
          ...conversation,
          createdAt: conversation.createdAt
            ? conversation.createdAt.toString()
            : new Date().toISOString(),
          updatedAt: conversation.updatedAt
            ? conversation.updatedAt.toString()
            : new Date().toISOString(),
        };
      }
    }

    return null;
  } catch (error) {
    throw error;
  }
};

// Get user conversations
export const getUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  // Validate userId
  if (!userId) {
    console.error('Invalid userId provided to getUserConversations');
    return [];
  }

  // Create a unique identifier for this request for debugging
  const requestId = `get-conversations-${userId}-${Date.now()}`;

  try {
    // Create a Promise that resolves after a timeout to handle Firebase being slow
    const timeoutPromise = new Promise<Conversation[]>((resolve) => {
      setTimeout(() => {
        console.warn(
          `getUserConversations [${requestId}] timed out - forcing empty result`
        );
        resolve([]);
      }, 5000); // 5 second timeout
    });

    // Actual Firebase query
    const queryPromise = (async () => {
      try {
        console.log(
          `Starting getUserConversations [${requestId}] for user: ${userId}`
        );

        const q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', userId),
          orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);

        // Return empty array if no documents found
        if (querySnapshot.empty) {
          console.log(
            `No conversations found in getUserConversations [${requestId}] for user: ${userId}`
          );
          return [];
        }

        const conversations = querySnapshot.docs.map((doc) => {
          const data = doc.data() as ConversationFirestore;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt
              ? data.createdAt.toString()
              : new Date().toISOString(),
            updatedAt: data.updatedAt
              ? data.updatedAt.toString()
              : new Date().toISOString(),
          };
        });

        console.log(
          `getUserConversations [${requestId}] completed, found ${conversations.length} conversations`
        );
        return conversations;
      } catch (error) {
        // Check for specific Firebase errors
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'permission-denied' || error.code === 'not-found')
        ) {
          console.log(
            `Firebase collection may not exist yet in getUserConversations [${requestId}], returning empty array`
          );
          return [];
        }
        console.error(`Error in getUserConversations [${requestId}]:`, error);
        throw error;
      }
    })();

    // Race between the timeout and the actual query
    return Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    console.error(`Error in getUserConversations [${requestId}]:`, error);
    return []; // Return empty array instead of throwing, to avoid blocking UI
  }
};

// Listen to user conversations
export const onUserConversationsUpdate = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  // Skip setting up listener if userId is not valid
  if (!userId) {
    console.error('Invalid userId provided to onUserConversationsUpdate');
    callback([]);
    return () => {}; // Return empty cleanup function
  }

  // Create a unique identifier for this listener for debugging
  const listenerId = `conversations-${userId}-${Date.now()}`;
  console.log(`Setting up Firebase conversations listener ${listenerId}`);

  // Add a flag to track if this is the first callback
  let isFirstCallback = true;

  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    // Add a timeout to handle cases where Firebase might be slow or collections don't exist
    // This ensures the UI doesn't stay in loading state indefinitely
    const timeoutId = setTimeout(() => {
      console.warn(
        `Conversations listener ${listenerId} timed out - forcing empty result`
      );
      callback([]);
    }, 5000); // 5 second timeout

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          // Clear the timeout since we received a response
          clearTimeout(timeoutId);

          // If snapshot exists but is empty, that's a valid state (no conversations)
          if (querySnapshot.empty) {
            // Only log this once to avoid console spam
            if (isFirstCallback) {
              console.log(
                `No conversations found for user: ${userId} (listener ${listenerId})`
              );
              isFirstCallback = false;
            }
            callback([]);
            return;
          }

          // After first callback, stop logging
          isFirstCallback = false;

          const conversations = querySnapshot.docs.map((doc) => {
            const data = doc.data() as ConversationFirestore;
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt
                ? data.createdAt.toString()
                : new Date().toISOString(),
              updatedAt: data.updatedAt
                ? data.updatedAt.toString()
                : new Date().toISOString(),
            };
          });

          callback(conversations);
        } catch (error) {
          console.error(
            `Error processing conversation data (listener ${listenerId}):`,
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
            `Firebase collection may not exist yet for listener ${listenerId}, returning empty array`
          );
          callback([]);
          return;
        }

        console.error(`Error in conversations listener ${listenerId}:`, error);
        // Still call the callback with an empty array to avoid UI being stuck in loading state
        callback([]);
      }
    );

    // Return a function that both clears the timeout and unsubscribes
    return () => {
      console.log(`Cleaning up Firebase conversations listener ${listenerId}`);
      clearTimeout(timeoutId);
      unsubscribe();
    };
  } catch (error) {
    console.error(
      `Error setting up conversations listener ${listenerId}:`,
      error
    );
    callback([]);
    return () => {
      console.log(
        `Cleaning up stub Firebase conversations listener ${listenerId} (after error)`
      );
    }; // Return empty cleanup function
  }
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  sender: string,
  content: string,
  isAI: boolean = false
): Promise<Message> => {
  try {
    const messageData: MessageFirestore = {
      conversationId, // Keep this for backward compatibility
      sender,
      content,
      timestamp: serverTimestamp(),
      status: 'sent',
      isAI,
    };

    // Use a subcollection for messages instead of root collection
    const docRef = await addDoc(
      collection(db, 'conversations', conversationId, 'messages'),
      messageData
    );

    // Update the last message in the conversation
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        content,
        timestamp: serverTimestamp(),
        sender,
      },
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...messageData,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get all messages for a conversation
export const getConversationMessages = async (conversationId: string) => {
  // Create a unique ID for this call for better debugging
  const callId = `get-messages-${conversationId}-${Date.now()}`;
  console.log(
    `Starting getConversationMessages [${callId}] for conversation: ${conversationId}`
  );

  // Increase timeout duration to reduce frequency of timeouts
  const timeoutDuration = 8000; // 8 seconds instead of 5

  // Return empty array after timeout
  const timeoutPromise = new Promise<Message[]>((_, reject) => {
    setTimeout(() => {
      const timeoutError = new Error(
        `getConversationMessages [${callId}] timed out - forcing empty result`
      );
      console.warn(timeoutError.message);
      // Use a special error that won't trigger UI state changes
      const error = new Error('timeout-not-fatal');
      error.name = 'TIMEOUT_NON_FATAL';
      reject(error);
    }, timeoutDuration);
  });

  try {
    // Use subcollection for messages instead of root collection with filter
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    // Race between the query and the timeout
    const queryPromise = getDocs(q).then((querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        // Handle Firestore timestamp properly
        let timestamp: Date;
        if (
          messageData.timestamp &&
          typeof messageData.timestamp.toDate === 'function'
        ) {
          timestamp = messageData.timestamp.toDate();
        } else {
          timestamp = new Date();
        }

        messages.push({
          id: doc.id,
          conversationId, // Make sure this is explicitly set
          ...messageData,
          timestamp,
        } as Message);
      });

      console.log(
        `getConversationMessages [${callId}] completed, found ${messages.length} messages`
      );
      return messages;
    });

    // Use the result of whichever finishes first
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    // Only log and propagate errors other than our special non-fatal timeout
    if (
      !error ||
      typeof error !== 'object' ||
      (error as Error).name !== 'TIMEOUT_NON_FATAL'
    ) {
      console.error(`Error in getConversationMessages [${callId}]:`, error);
      throw error;
    }

    // For timeout errors, return an empty array but don't trigger state updates
    console.log(`Returning empty array for timeout in [${callId}]`);
    return [];
  }
};

// Listen to messages in a conversation
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

// Update message status
export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> => {
  try {
    // Use the messages subcollection instead of root collection
    await updateDoc(
      doc(db, 'conversations', conversationId, 'messages', messageId),
      {
        status,
      }
    );
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
};
