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
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { ConversationFirestore } from './types';
import { db } from '../config';
import { Conversation } from '@/types';

/**
 * Create or get a conversation between users with a deterministic ID
 */
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

    let isExistingConversation = false;
    let existingData: ConversationFirestore | null = null;

    if (conversationSnap.exists()) {
      isExistingConversation = true;
      existingData = conversationSnap.data() as ConversationFirestore;
      // Continue with the function to create userConversation records if needed
    }

    // Create new conversation or update existing one with deterministic ID
    const conversationData: ConversationFirestore = {
      participants: sortedParticipants,
      createdAt:
        isExistingConversation && existingData?.createdAt
          ? existingData.createdAt
          : serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    };

    // If the lastMessage field exists in the existing conversation, preserve it
    if (isExistingConversation && existingData?.lastMessage) {
      conversationData.lastMessage = existingData.lastMessage;
    }

    // Set or update the conversation document
    await setDoc(conversationRef, conversationData, { merge: true });

    // Check for existing userConversation records and create them if missing
    for (const userId of sortedParticipants) {
      // Skip creating userConversation for AI assistant
      if (userId === 'ai-assistant') continue;

      const otherParticipantId = sortedParticipants.find((id) => id !== userId);

      // Check if userConversation record exists
      const userConversationId = `${userId}_${conversationId}`;
      const userConversationRef = doc(
        db,
        'userConversations',
        userConversationId
      );
      const userConversationSnap = await getDoc(userConversationRef);

      // If userConversation doesn't exist, create it
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
        // Update the lastReadTimestamp and ensure otherParticipantId is set correctly
        await updateDoc(userConversationRef, {
          updatedAt: serverTimestamp(),
          otherParticipantId:
            otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
        });
      }
    }

    // Return the conversation object
    return {
      id: conversationId,
      participants: sortedParticipants,
      lastMessage:
        isExistingConversation && existingData?.lastMessage
          ? {
              content: existingData.lastMessage.content,
              sender: existingData.lastMessage.sender,
              timestamp:
                existingData.lastMessage.timestamp instanceof Timestamp
                  ? existingData.lastMessage.timestamp.toDate()
                  : existingData.lastMessage.timestamp instanceof Date
                  ? existingData.lastMessage.timestamp
                  : new Date(),
            }
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

/**
 * Create a new conversation
 */
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

/**
 * Get conversation by participants
 */
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
          lastMessage: data.lastMessage
            ? {
                content: data.lastMessage.content,
                sender: data.lastMessage.sender,
                timestamp:
                  data.lastMessage.timestamp instanceof Timestamp
                    ? data.lastMessage.timestamp.toDate()
                    : data.lastMessage.timestamp instanceof Date
                    ? data.lastMessage.timestamp
                    : new Date(),
              }
            : undefined,
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt instanceof Date
              ? data.createdAt.toISOString()
              : new Date().toISOString(),
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate().toISOString()
              : data.updatedAt instanceof Date
              ? data.updatedAt.toISOString()
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
          participants: conversation.participants,
          lastMessage: conversation.lastMessage
            ? {
                content: conversation.lastMessage.content,
                sender: conversation.lastMessage.sender,
                timestamp:
                  conversation.lastMessage.timestamp instanceof Timestamp
                    ? conversation.lastMessage.timestamp.toDate()
                    : conversation.lastMessage.timestamp instanceof Date
                    ? conversation.lastMessage.timestamp
                    : new Date(),
              }
            : undefined,
          createdAt: conversation.createdAt
            ? conversation.createdAt.toString()
            : new Date().toISOString(),
          updatedAt: conversation.updatedAt
            ? conversation.updatedAt.toString()
            : new Date().toISOString(),
          isAIChat: conversation.isAIChat || false,
        };
      }
    }

    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user conversations
 */
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
          where('userId', '==', userId),
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
              lastMessage: data.lastMessage
                ? {
                    content: data.lastMessage.content,
                    sender: data.lastMessage.sender,
                    timestamp:
                      data.lastMessage.timestamp instanceof Timestamp
                        ? data.lastMessage.timestamp.toDate()
                        : data.lastMessage.timestamp instanceof Date
                        ? data.lastMessage.timestamp
                        : new Date(),
                  }
                : undefined,
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
