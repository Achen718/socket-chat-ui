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
} from 'firebase/firestore';
import { ConversationFirestore } from './types';
import { db } from '../config';
import { Conversation } from '@/types';
import { toISOString, toDate, mapConversationFromFirestore } from './utils';

/**
 * Create or get a conversation between users with a deterministic ID
 */
export const createOrGetConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  try {
    // Validate inputs
    if (!participants || participants.length === 0) {
      throw new Error('Participants array cannot be empty');
    }

    // Sort participants to ensure consistent ID generation
    const sortedParticipants = [...participants].sort();
    const conversationId = generateConversationId(sortedParticipants, isAIChat);

    // Check if conversation already exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    let isExistingConversation = false;
    let existingData: ConversationFirestore | null = null;

    if (conversationSnap.exists()) {
      isExistingConversation = true;
      existingData = conversationSnap.data() as ConversationFirestore;
    }

    // Prepare conversation data
    const conversationData = prepareConversationData(
      sortedParticipants,
      isExistingConversation,
      existingData,
      isAIChat
    );

    // Save conversation document
    await setDoc(conversationRef, conversationData, { merge: true });

    // Ensure userConversation records exist
    await ensureUserConversationRecords(
      sortedParticipants,
      conversationId,
      isAIChat
    );

    // Return formatted conversation object
    return formatConversationResponse(
      conversationId,
      sortedParticipants,
      existingData,
      isExistingConversation,
      isAIChat
    );
  } catch (error) {
    console.error(
      '[ConversationService] Error creating/getting conversation:',
      error
    );
    throw error;
  }
};

/**
 * Generate a deterministic ID for a conversation based on participants
 */
function generateConversationId(
  sortedParticipants: string[],
  isAIChat: boolean
): string {
  // For AI chats, use a special format
  if (isAIChat) {
    const userId = sortedParticipants.find((id) => id !== 'ai-assistant');
    if (userId) {
      return `${userId}_ai-assistant`;
    }
  }

  // For regular chats, join sorted participant IDs
  return sortedParticipants.join('_');
}

/**
 * Prepare conversation data for Firestore
 */
function prepareConversationData(
  participants: string[],
  isExisting: boolean,
  existingData: ConversationFirestore | null,
  isAIChat: boolean
): ConversationFirestore {
  const data: ConversationFirestore = {
    participants,
    createdAt:
      isExisting && existingData?.createdAt
        ? existingData.createdAt
        : serverTimestamp(),
    updatedAt: serverTimestamp(),
    isAIChat,
  };

  // Preserve existing lastMessage if it exists
  if (isExisting && existingData?.lastMessage) {
    data.lastMessage = existingData.lastMessage;
  }

  return data;
}

/**
 * Ensure userConversation records exist for all participants
 */
async function ensureUserConversationRecords(
  participants: string[],
  conversationId: string,
  isAIChat: boolean
): Promise<void> {
  // Process each participant
  for (const userId of participants) {
    // Skip AI assistant
    if (userId === 'ai-assistant') continue;

    const otherParticipantId = participants.find((id) => id !== userId);
    const userConversationId = `${userId}_${conversationId}`;
    const userConversationRef = doc(
      db,
      'userConversations',
      userConversationId
    );

    // Check if record exists
    const userConversationSnap = await getDoc(userConversationRef);

    if (!userConversationSnap.exists()) {
      // Create new record
      console.log(
        `Creating missing userConversation record: ${userConversationId}`
      );
      await setDoc(userConversationRef, {
        userId,
        conversationId,
        otherParticipantId:
          otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
        lastReadTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing record
      await updateDoc(userConversationRef, {
        updatedAt: serverTimestamp(),
        otherParticipantId:
          otherParticipantId || (isAIChat ? 'ai-assistant' : ''),
      });
    }
  }
}

/**
 * Format conversation response for the client
 */
function formatConversationResponse(
  id: string,
  participants: string[],
  existingData: ConversationFirestore | null,
  isExisting: boolean,
  isAIChat: boolean
): Conversation {
  return {
    id,
    participants,
    lastMessage:
      isExisting && existingData?.lastMessage
        ? {
            content: existingData.lastMessage.content,
            sender: existingData.lastMessage.sender,
            timestamp: toDate(existingData.lastMessage.timestamp),
          }
        : undefined,
    createdAt:
      isExisting && existingData?.createdAt
        ? toISOString(existingData.createdAt)
        : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAIChat,
  };
}

/**
 * Create a new conversation
 */
export const createConversation = async (
  participants: string[],
  isAIChat: boolean = false
): Promise<Conversation> => {
  try {
    if (!participants || participants.length === 0) {
      throw new Error('Participants array cannot be empty');
    }

    // For AI chats, always use deterministic IDs
    if (isAIChat) {
      return await createOrGetConversation(participants, true);
    }

    // Check if conversation exists for regular 1:1 chats
    if (participants.length === 2 && !isAIChat) {
      const existingConversation = await getConversationByParticipants(
        participants
      );
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create new conversation with auto-generated ID
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAIChat,
    });

    // Create userConversation records
    await createUserConversationRecords(
      participants,
      conversationRef.id,
      isAIChat
    );

    return {
      id: conversationRef.id,
      participants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAIChat,
    };
  } catch (error) {
    console.error('[ConversationService] Error creating conversation:', error);
    throw error;
  }
};

/**
 * Create userConversation records for all participants
 */
async function createUserConversationRecords(
  participants: string[],
  conversationId: string,
  isAIChat: boolean
): Promise<void> {
  for (const userId of participants) {
    // Skip AI assistant
    if (userId === 'ai-assistant') continue;

    const otherParticipantIds = participants.filter((id) => id !== userId);
    const otherParticipantId =
      otherParticipantIds.length > 0
        ? otherParticipantIds[0]
        : isAIChat
        ? 'ai-assistant'
        : '';

    await setDoc(doc(db, 'userConversations', `${userId}_${conversationId}`), {
      userId,
      conversationId,
      otherParticipantId,
      lastReadTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Get conversation by participants
 */
export const getConversationByParticipants = async (
  participants: string[]
): Promise<Conversation | null> => {
  try {
    if (!participants || participants.length === 0) {
      throw new Error('Participants array cannot be empty');
    }

    // Sort participants to ensure consistent querying
    const sortedParticipants = [...participants].sort();

    // Try using deterministic ID for 1:1 conversations
    if (sortedParticipants.length === 2) {
      const conversationId = sortedParticipants.join('_');
      const conversationDoc = await getDoc(
        doc(db, 'conversations', conversationId)
      );

      if (conversationDoc.exists()) {
        const data = conversationDoc.data() as ConversationFirestore;
        return mapConversationFromFirestore(conversationId, data);
      }
    }

    // Fall back to query-based lookup for conversations without deterministic IDs
    const conversation = await findConversationByParticipants(participants);
    return conversation;
  } catch (error) {
    console.error(
      '[ConversationService] Error getting conversation by participants:',
      error
    );
    throw error;
  }
};

/**
 * Find a conversation by querying for participants
 */
async function findConversationByParticipants(
  participants: string[]
): Promise<Conversation | null> {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains-any', participants)
  );

  const querySnapshot = await getDocs(q);

  // Find first conversation with exactly these participants
  for (const doc of querySnapshot.docs) {
    const conversation = doc.data() as ConversationFirestore;

    const participantsMatch =
      participants.length === conversation.participants.length &&
      participants.every((p) => conversation.participants.includes(p));

    if (participantsMatch) {
      return mapConversationFromFirestore(doc.id, conversation);
    }
  }

  return null;
}

/**
 * Get user conversations with timeout handling
 */
export const getUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  // Validate userId
  if (!userId) {
    console.error(
      '[ConversationService] Invalid userId provided to getUserConversations'
    );
    return [];
  }

  const requestId = `get-conversations-${userId}-${Date.now()}`;

  try {
    // Set up timeout promise
    const timeoutPromise = new Promise<Conversation[]>((resolve) => {
      setTimeout(() => {
        console.warn(
          `[ConversationService] getUserConversations [${requestId}] timed out`
        );
        resolve([]);
      }, 5000);
    });

    // Set up query promise
    const queryPromise = fetchUserConversations(userId, requestId);

    // Race between timeout and query
    return Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    console.error(
      `[ConversationService] Error in getUserConversations [${requestId}]:`,
      error
    );
    return [];
  }
};

/**
 * Fetch user conversations from Firestore
 */
async function fetchUserConversations(
  userId: string,
  requestId: string
): Promise<Conversation[]> {
  try {
    console.log(
      `[ConversationService] Starting getUserConversations [${requestId}] for user: ${userId}`
    );

    // Query userConversations collection
    const q = query(
      collection(db, 'userConversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    // Handle empty results
    if (querySnapshot.empty) {
      console.log(
        `[ConversationService] No conversations found [${requestId}]`
      );
      return [];
    }

    // Get conversation IDs
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
        conversations.push(mapConversationFromFirestore(conversationId, data));
      }
    }

    console.log(
      `[ConversationService] Found ${conversations.length} conversations [${requestId}]`
    );
    return conversations;
  } catch (error) {
    // Handle specific Firebase errors
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'permission-denied' || error.code === 'not-found')
    ) {
      console.log(
        `[ConversationService] Collection may not exist yet [${requestId}]`
      );
      return [];
    }

    throw error;
  }
}
