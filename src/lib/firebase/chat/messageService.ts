import {
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  getDoc,
  writeBatch,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from '../config';
import { Message } from '@/types';

// Message interface for Firestore
interface MessageFirestore extends Omit<Message, 'id' | 'timestamp'> {
  timestamp: FieldValue | Timestamp | Date;
}

/**
 * Send a new message to a conversation
 */
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

    // Use a subcollection for messages
    const docRef = await addDoc(
      collection(db, 'conversations', conversationId, 'messages'),
      messageData
    );

    // Create the message object to return
    const messageToReturn: Message = {
      id: docRef.id,
      ...messageData,
      timestamp: new Date(),
    };

    // Update the last message in the conversation
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        content,
        timestamp: serverTimestamp(),
        sender,
      },
      updatedAt: serverTimestamp(),
    });

    // Update userConversation records
    await updateUserConversations(conversationId, sender);

    return messageToReturn;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Update userConversation records when a message is sent
 */
async function updateUserConversations(
  conversationId: string,
  sender: string
): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      console.error(`Conversation ${conversationId} not found`);
      return;
    }

    const conversationData = conversationSnap.data();
    const participants = conversationData.participants || [];
    const isAIChat = conversationData.isAIChat || false;

    const batch = writeBatch(db);

    if (isAIChat) {
      // Handle AI chat userConversation updates
      const userId = participants.find((id: string) => id !== 'ai-assistant');

      if (userId) {
        if (sender === 'ai-assistant') {
          // AI message
          const userConversationRef = doc(
            db,
            'userConversations',
            `${userId}_${conversationId}`
          );
          batch.set(
            userConversationRef,
            { updatedAt: serverTimestamp() },
            { merge: true }
          );
        } else if (sender === userId) {
          // User message
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
    } else {
      // Regular chat between users
      // Update all participants' userConversation docs
      for (const participantId of participants) {
        if (participantId === 'ai-assistant') continue;

        const userConversationRef = doc(
          db,
          'userConversations',
          `${participantId}_${conversationId}`
        );

        batch.set(
          userConversationRef,
          {
            updatedAt: serverTimestamp(),
            ...(participantId === sender
              ? { lastReadTimestamp: serverTimestamp() }
              : {}),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
  } catch (err) {
    console.error(
      `Error updating userConversations for conversation ${conversationId}:`,
      err
    );
  }
}

/**
 * Get all messages for a conversation
 */
export const getConversationMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const callId = `get-messages-${conversationId}-${Date.now()}`;
  console.log(`Starting getConversationMessages [${callId}]`);

  const timeoutDuration = 8000;

  const timeoutPromise = new Promise<Message[]>((_, reject) => {
    setTimeout(() => {
      const error = new Error('timeout-not-fatal');
      error.name = 'TIMEOUT_NON_FATAL';
      reject(error);
    }, timeoutDuration);
  });

  try {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const queryPromise = getDocs(q).then((querySnapshot) => {
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        const messageData = doc.data();

        // Handle Firestore timestamp
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
          conversationId,
          ...messageData,
          timestamp,
        } as Message);
      });

      console.log(
        `getConversationMessages [${callId}] found ${messages.length} messages`
      );
      return messages;
    });

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    if ((error as Error)?.name !== 'TIMEOUT_NON_FATAL') {
      console.error(`Error in getConversationMessages [${callId}]:`, error);
      throw error;
    }
    return [];
  }
};

/**
 * Update the status of a message
 */
export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> => {
  try {
    await updateDoc(
      doc(db, 'conversations', conversationId, 'messages', messageId),
      { status }
    );
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
};
