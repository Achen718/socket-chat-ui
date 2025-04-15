import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  FieldValue,
  onSnapshot,
  getDoc,
  setDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { Conversation, Message } from '@/types';

// Interfaces for Firestore data
interface ConversationFirestore
  extends Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: FieldValue | Date | string;
  updatedAt: FieldValue | Date | string;
}

// Message interface for Firestore
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

    let conversationId = '';

    // For AI chats, ensure we always use a consistent ID pattern
    if (isAIChat) {
      // Find the user ID (non-AI participant)
      const userId = sortedParticipants.find((id) => id !== 'ai-assistant');
      if (userId) {
        // Always use the same format for AI chats: userId_ai-assistant
        conversationId = `${userId}_ai-assistant`;
      } else {
        // Fallback to regular ID generation if somehow both participants are AI
        conversationId = sortedParticipants.join('_');
      }
    } else {
      // Regular conversation - generate ID based on sorted participants
      conversationId = sortedParticipants.join('_');
    }

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

    // Create userConversation records for each participant
    for (const userId of sortedParticipants) {
      const otherParticipantId = sortedParticipants.find((id) => id !== userId);

      // Skip creating userConversation for AI chats if the other participant is AI
      if (isAIChat && otherParticipantId === 'ai-assistant') continue;

      const userConversationRef = doc(
        db,
        'userConversations',
        `${userId}_${conversationId}`
      );
      await setDoc(userConversationRef, {
        userId,
        conversationId,
        otherParticipantId:
          otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
        lastReadTimestamp: serverTimestamp(),
      });
    }

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
  try {
    // For AI chats, always use the deterministic ID approach
    if (isAIChat) {
      return await createOrGetConversation(participants, true);
    }

    // Check if conversation already exists between these participants
    if (participants.length === 2 && !isAIChat) {
      const existingConversation = await getConversationByParticipants(
        participants
      );
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create new conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    });

    // Create userConversation records for each participant
    for (const userId of participants) {
      // Find the other participant
      const otherParticipantIds = participants.filter((id) => id !== userId);
      const otherParticipantId =
        otherParticipantIds.length > 0
          ? otherParticipantIds[0]
          : isAIChat
          ? 'ai-assistant'
          : '';

      // Skip creating userConversation for AI assistant
      if (userId === 'ai-assistant') continue;

      await setDoc(
        doc(db, 'userConversations', `${userId}_${conversationRef.id}`),
        {
          userId,
          conversationId: conversationRef.id,
          otherParticipantId,
          lastReadTimestamp: serverTimestamp(),
        }
      );
    }

    return {
      id: conversationRef.id,
      participants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAIChat,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Get conversation by participants
export const getConversationByParticipants = async (
  participants: string[]
): Promise<Conversation | null> => {
  try {
    // Sort participants to ensure consistent querying
    const sortedParticipants = [...participants].sort();

    // Generate deterministic ID if there are exactly 2 participants
    if (sortedParticipants.length === 2) {
      const conversationId = sortedParticipants.join('_');
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
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
    }

    // Otherwise, do a more general query
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

        // Query userConversations collection instead
        const q = query(
          collection(db, 'userConversations'),
          where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);

        // Return empty array if no documents found
        if (querySnapshot.empty) {
          console.log(
            `No conversations found in getUserConversations [${requestId}] for user: ${userId}`
          );
          return [];
        }

        // Get all conversation IDs
        const conversationIds = querySnapshot.docs.map(
          (doc) => doc.data().conversationId
        );

        // Fetch all conversation documents
        const conversations: Conversation[] = [];
        for (const conversationId of conversationIds) {
          const conversationDoc = await getDoc(
            doc(db, 'conversations', conversationId)
          );
          if (conversationDoc.exists()) {
            const data = conversationDoc.data() as ConversationFirestore;
            conversations.push({
              id: conversationDoc.id,
              participants: data.participants,
              lastMessage: data.lastMessage || undefined,
              createdAt: data.createdAt
                ? data.createdAt.toString()
                : new Date().toISOString(),
              updatedAt: data.updatedAt
                ? data.updatedAt.toString()
                : new Date().toISOString(),
              isAIChat: data.isAIChat || false,
            });
          }
        }

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
    return [];
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

  // Declare timeoutId at function level to be available in both try and catch blocks
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    // Listen to userConversations collection
    const q = query(
      collection(db, 'userConversations'),
      where('userId', '==', userId)
    );

    // Add a timeout to handle cases where Firebase might be slow or collections don't exist
    // This ensures the UI doesn't stay in loading state indefinitely
    timeoutId = setTimeout(() => {
      console.warn(
        `Conversations listener ${listenerId} timed out - forcing empty result`
      );
      callback([]);
    }, 5000);

    // Set up the listener
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true }, // Include metadata changes to get faster updates
      async (snapshot) => {
        // Clear the timeout as we got a response
        clearTimeout(timeoutId);

        // Handle empty results
        if (snapshot.empty && isFirstCallback) {
          console.log(
            `No conversations found in listener ${listenerId} for user: ${userId}`
          );
          callback([]);
          isFirstCallback = false;
          return;
        }

        try {
          // Check if this is a local change (faster updates)
          const source = snapshot.metadata.hasPendingWrites
            ? 'Local'
            : 'Server';
          console.log(
            `Conversations update source (${listenerId}): ${source} - ${snapshot.docs.length} conversations`
          );

          // Get all conversation IDs
          const conversationIds = snapshot.docs.map(
            (doc) => doc.data().conversationId
          );

          // Fetch all conversation documents
          const conversations: Conversation[] = [];

          // Track promises for all conversation fetches
          const fetchPromises = conversationIds.map(async (conversationId) => {
            try {
              // Get the conversation document
              const conversationDoc = await getDoc(
                doc(db, 'conversations', conversationId)
              );

              if (conversationDoc.exists()) {
                const data = conversationDoc.data() as ConversationFirestore;

                // If we need to ensure real-time updates for lastMessage
                // Get the most recent message manually
                let lastMessage = data.lastMessage;

                try {
                  // Get the most recent message from the messages subcollection
                  const recentMessagesQuery = query(
                    collection(db, 'conversations', conversationId, 'messages'),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                  );

                  const recentMessagesSnapshot = await getDocs(
                    recentMessagesQuery
                  );

                  if (!recentMessagesSnapshot.empty) {
                    const mostRecentMessage =
                      recentMessagesSnapshot.docs[0].data();

                    // Format timestamp for lastMessage
                    let timestamp: Date | string;
                    if (
                      mostRecentMessage.timestamp &&
                      typeof mostRecentMessage.timestamp.toDate === 'function'
                    ) {
                      timestamp = mostRecentMessage.timestamp.toDate();
                    } else {
                      timestamp = new Date();
                    }

                    // Update the lastMessage with the most recent one from subcollection
                    lastMessage = {
                      content: mostRecentMessage.content,
                      sender: mostRecentMessage.sender,
                      timestamp,
                    };
                  }
                } catch (err) {
                  console.error(
                    `Error fetching recent messages for conversation ${conversationId}:`,
                    err
                  );
                  // Keep using the lastMessage from the conversation document
                }

                conversations.push({
                  id: conversationDoc.id,
                  participants: data.participants,
                  lastMessage: lastMessage || undefined,
                  createdAt: data.createdAt
                    ? data.createdAt.toString()
                    : new Date().toISOString(),
                  updatedAt: data.updatedAt
                    ? data.updatedAt.toString()
                    : new Date().toISOString(),
                  isAIChat: data.isAIChat || false,
                });
              }
            } catch (err) {
              console.error(
                `Error fetching conversation ${conversationId}:`,
                err
              );
            }
          });

          // Wait for all conversation fetches to complete
          await Promise.all(fetchPromises);

          // Sort by updatedAt
          conversations.sort((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
          });

          console.log(
            `Listener ${listenerId} update: ${conversations.length} conversations`
          );
          callback(conversations);
          isFirstCallback = false;
        } catch (error) {
          console.error(
            `Error in conversations listener ${listenerId}:`,
            error
          );
          if (isFirstCallback) {
            callback([]);
            isFirstCallback = false;
          }
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
            `Firebase conversations collection may not exist yet for listener ${listenerId}, returning empty array`
          );
          callback([]);
          return;
        }

        console.error(`Error in conversations listener ${listenerId}:`, error);
        // Still call the callback with an empty array to avoid UI being stuck in loading state
        callback([]);
      }
    );

    // Return unsubscribe function
    return () => {
      clearTimeout(timeoutId);
      console.log(`Removing Firebase conversations listener ${listenerId}`);
      unsubscribe();
    };
  } catch (error) {
    // Handle errors in setting up the listener
    console.error(
      `Error setting up conversations listener ${listenerId}:`,
      error
    );
    clearTimeout(timeoutId);
    callback([]);
    return () => {}; // Return empty cleanup function
  }
};

// Add a function to migrate existing data to new structure
export const migrateToNewStructure = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('Starting migration to new data structure...');
    const batch = writeBatch(db);

    // Get all conversations for this user
    const oldQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const querySnapshot = await getDocs(oldQuery);

    if (querySnapshot.empty) {
      console.log('No conversations to migrate');
      return;
    }

    console.log(`Found ${querySnapshot.docs.length} conversations to migrate`);

    // For each conversation, create userConversation records
    for (const conversationDoc of querySnapshot.docs) {
      const conversation = conversationDoc.data() as ConversationFirestore;
      const conversationId = conversationDoc.id;

      // For each participant, create a userConversation document
      for (const userId of conversation.participants) {
        // Skip AI assistant
        if (userId === 'ai-assistant') continue;

        // Find other participant
        const otherParticipantIds = conversation.participants.filter(
          (id) => id !== userId
        );
        const otherParticipantId =
          otherParticipantIds.length > 0
            ? otherParticipantIds[0]
            : conversation.isAIChat
            ? 'ai-assistant'
            : '';

        // Create userConversation record
        const userConversationRef = doc(
          db,
          'userConversations',
          `${userId}_${conversationId}`
        );
        batch.set(userConversationRef, {
          userId,
          conversationId,
          otherParticipantId,
          lastReadTimestamp: conversation.updatedAt || serverTimestamp(),
        });
      }
    }

    // Commit the batch
    await batch.commit();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Delete all data for testing purposes
export const deleteAllUserData = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('Starting deletion of all user data...');

    // Get all userConversations for this user
    const userConversationsQuery = query(
      collection(db, 'userConversations'),
      where('userId', '==', currentUserId)
    );

    const userConversationsSnapshot = await getDocs(userConversationsQuery);

    // Delete each userConversation and related conversation
    const batch = writeBatch(db);
    const conversationIds = new Set<string>();

    userConversationsSnapshot.forEach((doc) => {
      // Delete userConversation
      batch.delete(doc.ref);

      // Track conversationId for later deletion
      const data = doc.data();
      conversationIds.add(data.conversationId);
    });

    // Delete all conversations
    for (const conversationId of conversationIds) {
      batch.delete(doc(db, 'conversations', conversationId));

      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
    }

    // Commit the batch
    await batch.commit();
    console.log('All user data deleted successfully');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
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

    // Create the actual message object to return with a Date rather than FieldValue
    const messageToReturn: Message = {
      id: docRef.id,
      ...messageData,
      timestamp: new Date(),
    };

    // Update the last message in the conversation with more detailed information
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        content,
        timestamp: serverTimestamp(),
        sender,
      },
      updatedAt: serverTimestamp(),
    });

    // Get the conversation participants to update both users' references
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        const participants = conversationData.participants || [];
        const isAIChat = conversationData.isAIChat || false;

        // Create a batch to update both users' userConversations
        const batch = writeBatch(db);

        // First, check if this is an AI chat to handle the userConversation IDs correctly
        if (isAIChat) {
          // For AI chats, the non-AI user should have userConversation doc with ID: userID_conversationId
          const userId = participants.find(
            (id: string) => id !== 'ai-assistant'
          );

          if (userId) {
            // For messages from the AI, update the user's last read timestamp
            if (sender === 'ai-assistant') {
              const userConversationRef = doc(
                db,
                'userConversations',
                `${userId}_${conversationId}`
              );

              // Use set with merge for safety - if doc doesn't exist, create it
              batch.set(
                userConversationRef,
                {
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
            // For messages from the user, update their last read timestamp
            else if (sender === userId) {
              const userConversationRef = doc(
                db,
                'userConversations',
                `${userId}_${conversationId}`
              );

              batch.set(
                userConversationRef,
                {
                  lastReadTimestamp: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
          }
        }
        // Regular chat between users
        else {
          // Update lastReadTimestamp for sender (they've obviously read their own message)
          const senderConversationRef = doc(
            db,
            'userConversations',
            `${sender}_${conversationId}`
          );

          // Use set with merge instead of update for safety
          batch.set(
            senderConversationRef,
            {
              lastReadTimestamp: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Force an update to ALL participants' userConversation docs to ensure
          // the sidebar will refresh for all users
          for (const participantId of participants) {
            // Skip if this is the sender (already updated above)
            if (participantId === sender) continue;

            // Skip AI assistant
            if (participantId === 'ai-assistant') continue;

            // Create a reference to this participant's userConversation document
            const userConversationRef = doc(
              db,
              'userConversations',
              `${participantId}_${conversationId}`
            );

            // Use set with merge instead of update for safety
            batch.set(
              userConversationRef,
              {
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        }

        // Commit all the updates
        await batch.commit();
      }
    } catch (err) {
      // Just log the error but don't fail the whole operation
      console.error(
        `Error updating userConversations for conversation ${conversationId}:`,
        err
      );
    }

    return messageToReturn;
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
