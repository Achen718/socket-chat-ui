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
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { Conversation, Message } from '@/types';

interface ConversationFirestore
  extends Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: FieldValue | Date | string;
  updatedAt: FieldValue | Date | string;
}

interface MessageFirestore extends Omit<Message, 'id' | 'timestamp'> {
  timestamp: FieldValue | Date | string;
}

export const createOrGetConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  try {
    const sortedParticipants = [...participants].sort();

    let conversationId = '';

    if (isAIChat) {
      const userId = sortedParticipants.find((id) => id !== 'ai-assistant');
      if (userId) {
        conversationId = `${userId}_ai-assistant`;
      } else {
        conversationId = sortedParticipants.join('_');
      }
    } else {
      conversationId = sortedParticipants.join('_');
    }

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    let isExistingConversation = false;
    let existingData: ConversationFirestore | null = null;

    if (conversationSnap.exists()) {
      isExistingConversation = true;
      existingData = conversationSnap.data() as ConversationFirestore;
    }
    const conversationData: ConversationFirestore = {
      participants: sortedParticipants,
      createdAt:
        isExistingConversation && existingData?.createdAt
          ? existingData.createdAt
          : serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    };
    if (isExistingConversation && existingData?.lastMessage) {
      conversationData.lastMessage = existingData.lastMessage;
    }

    await setDoc(conversationRef, conversationData, { merge: true });

    for (const userId of sortedParticipants) {
      if (userId === 'ai-assistant') continue;

      const otherParticipantId = sortedParticipants.find((id) => id !== userId);
      const userConversationId = `${userId}_${conversationId}`;
      const userConversationRef = doc(
        db,
        'userConversations',
        userConversationId
      );
      const userConversationSnap = await getDoc(userConversationRef);

      if (!userConversationSnap.exists()) {
        console.log(
          `Creating missing userConversation record: ${userConversationId}`
        );
        await setDoc(userConversationRef, {
          userId,
          conversationId,
          otherParticipantId:
            otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
          lastReadTimestamp: serverTimestamp(),
        });
      } else {
        await updateDoc(userConversationRef, {
          updatedAt: serverTimestamp(),
          otherParticipantId:
            otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
        });
      }
    }
    return {
      id: conversationId,
      participants: sortedParticipants,
      lastMessage:
        isExistingConversation && existingData?.lastMessage
          ? existingData.lastMessage
          : undefined,
      createdAt:
        isExistingConversation && existingData?.createdAt
          ? existingData.createdAt.toString()
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAIChat,
    };
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw error;
  }
};

export const createConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  try {
    if (isAIChat) {
      return await createOrGetConversation(participants, true);
    }

    if (participants.length === 2 && !isAIChat) {
      const existingConversation = await getConversationByParticipants(
        participants
      );
      if (existingConversation) {
        return existingConversation;
      }
    }

    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    });

    for (const userId of participants) {
      const otherParticipantIds = participants.filter((id) => id !== userId);
      const otherParticipantId =
        otherParticipantIds.length > 0
          ? otherParticipantIds[0]
          : isAIChat
          ? 'ai-assistant'
          : '';

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

export const getConversationByParticipants = async (
  participants: string[]
): Promise<Conversation | null> => {
  try {
    const sortedParticipants = [...participants].sort();

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
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains-any', participants)
    );

    const querySnapshot = await getDocs(q);

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

export const getUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  if (!userId) {
    console.error('Invalid userId provided to getUserConversations');
    return [];
  }
  const requestId = `get-conversations-${userId}-${Date.now()}`;

  try {
    const timeoutPromise = new Promise<Conversation[]>((resolve) => {
      setTimeout(() => {
        console.warn(
          `getUserConversations [${requestId}] timed out - forcing empty result`
        );
        resolve([]);
      }, 5000);
    });
    const queryPromise = (async () => {
      try {
        console.log(
          `Starting getUserConversations [${requestId}] for user: ${userId}`
        );
        const q = query(
          collection(db, 'userConversations'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          console.log(
            `No conversations found in getUserConversations [${requestId}] for user: ${userId}`
          );
          return [];
        }
        const conversationIds = querySnapshot.docs.map(
          (doc) => doc.data().conversationId
        );
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
    return Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    console.error(`Error in getUserConversations [${requestId}]:`, error);
    return [];
  }
};

export const onUserConversationsUpdate = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  if (!userId) {
    console.warn('[Chat] Invalid userId provided to onUserConversationsUpdate');
    callback([]);
    return () => {};
  }
  const listenerId = `conversations-${userId}-${Date.now()}`;
  console.log(
    `[Chat] Setting up Firebase conversations listener ${listenerId}`
  );

  let isFirstCallback = true;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const q = query(
      collection(db, 'userConversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    timeoutId = setTimeout(() => {
      console.warn(
        `[Chat] Conversations listener ${listenerId} timed out - forcing empty result`
      );
      callback([]);
    }, 5000);

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      async (snapshot: QuerySnapshot<DocumentData>) => {
        clearTimeout(timeoutId);

        if (snapshot.empty && isFirstCallback) {
          console.log(
            `[Chat] No conversations found in listener ${listenerId} for user: ${userId}`
          );
          callback([]);
          isFirstCallback = false;
          return;
        }
        try {
          const startTime = performance.now();

          const source = snapshot.metadata.hasPendingWrites
            ? 'Local'
            : 'Server';
          console.log(
            `[Chat] Conversations update source (${listenerId}): ${source} - ${snapshot.docs.length} conversations`
          );

          const conversationIds = snapshot.docs.map(
            (doc) => doc.data().conversationId as string
          );

          const conversations: Conversation[] = [];

          const fetchPromises = conversationIds.map(async (conversationId) => {
            try {
              const conversationDoc = await getDoc(
                doc(db, 'conversations', conversationId)
              );
              if (conversationDoc.exists()) {
                const data = conversationDoc.data() as ConversationFirestore;

                let createdAtStr: string;
                let updatedAtStr: string;

                if (data.createdAt instanceof Timestamp) {
                  createdAtStr = data.createdAt.toDate().toISOString();
                } else if (typeof data.createdAt === 'string') {
                  createdAtStr = data.createdAt;
                } else {
                  createdAtStr = new Date().toISOString();
                }
                if (data.updatedAt instanceof Timestamp) {
                  updatedAtStr = data.updatedAt.toDate().toISOString();
                } else if (typeof data.updatedAt === 'string') {
                  updatedAtStr = data.updatedAt;
                } else {
                  updatedAtStr = new Date().toISOString();
                }

                conversations.push({
                  id: conversationId,
                  participants: data.participants,
                  lastMessage: data.lastMessage,
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
          await Promise.all(fetchPromises);

          conversations.sort((a, b) => {
            const aTime = a.lastMessage?.timestamp
              ? a.lastMessage.timestamp instanceof Timestamp
                ? a.lastMessage.timestamp.toDate().getTime()
                : new Date(a.lastMessage.timestamp).getTime()
              : new Date(a.updatedAt).getTime();

            const bTime = b.lastMessage?.timestamp
              ? b.lastMessage.timestamp instanceof Timestamp
                ? b.lastMessage.timestamp.toDate().getTime()
                : new Date(b.lastMessage.timestamp).getTime()
              : new Date(b.updatedAt).getTime();

            return bTime - aTime;
          });

          const duration = performance.now() - startTime;
          console.log(
            `[Chat] Processed ${
              conversations.length
            } conversations in ${duration.toFixed(1)}ms`
          );

          callback(conversations);
          isFirstCallback = false;
        } catch (error) {
          console.error(
            `[Chat] Error in conversations listener ${listenerId}:`,
            error
          );
          if (isFirstCallback) {
            callback([]);
            isFirstCallback = false;
          }
        }
      },
      (error) => {
        clearTimeout(timeoutId);

        console.error(
          `[Chat] Error in conversations listener ${listenerId}:`,
          error
        );
        if (isFirstCallback) {
          callback([]);
          isFirstCallback = false;
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      console.log(
        `[Chat] Removing Firebase conversations listener ${listenerId}`
      );
      unsubscribe();
    };
  } catch (error) {
    console.error(
      `[Chat] Error setting up conversations listener ${listenerId}:`,
      error
    );
    clearTimeout(timeoutId);
    callback([]);
    return () => {};
  }
};

export const migrateToNewStructure = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('Starting migration to new data structure...');
    const batch = writeBatch(db);

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

    for (const conversationDoc of querySnapshot.docs) {
      const conversation = conversationDoc.data() as ConversationFirestore;
      const conversationId = conversationDoc.id;

      for (const userId of conversation.participants) {
        if (userId === 'ai-assistant') continue;

        const otherParticipantIds = conversation.participants.filter(
          (id) => id !== userId
        );
        const otherParticipantId =
          otherParticipantIds.length > 0
            ? otherParticipantIds[0]
            : conversation.isAIChat
            ? 'ai-assistant'
            : '';
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

    await batch.commit();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

export const deleteAllUserData = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('Starting deletion of all user data...');
    const userConversationsQuery = query(
      collection(db, 'userConversations'),
      where('userId', '==', currentUserId)
    );

    const userConversationsSnapshot = await getDocs(userConversationsQuery);

    const batch = writeBatch(db);
    const conversationIds = new Set<string>();

    userConversationsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);

      const data = doc.data();
      conversationIds.add(data.conversationId);
    });

    for (const conversationId of conversationIds) {
      batch.delete(doc(db, 'conversations', conversationId));

      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
    }
    await batch.commit();
    console.log('All user data deleted successfully');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
};

export const sendMessage = async (
  conversationId: string,
  sender: string,
  content: string,
  isAI: boolean = false
): Promise<Message> => {
  try {
    const messageData: MessageFirestore = {
      conversationId,
      sender,
      content,
      timestamp: serverTimestamp(),
      status: 'sent',
      isAI,
    };

    const docRef = await addDoc(
      collection(db, 'conversations', conversationId, 'messages'),
      messageData
    );

    const messageToReturn: Message = {
      id: docRef.id,
      ...messageData,
      timestamp: new Date(),
    };

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
            // Skip AI assistant
            if (participantId === 'ai-assistant') continue;

            // Create the userConversation reference
            const userConversationRef = doc(
              db,
              'userConversations',
              `${participantId}_${conversationId}`
            );

            // Always update the updatedAt timestamp for all participants
            // This ensures consistent ordering in queries
            batch.set(
              userConversationRef,
              {
                updatedAt: serverTimestamp(),
                // If this is the sender, also update lastReadTimestamp
                ...(participantId === sender
                  ? { lastReadTimestamp: serverTimestamp() }
                  : {}),
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
