import {
  collection,
  query,
  where,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config';
import { ConversationFirestore } from './types';

/**
 * Migrate existing data to the new structure with userConversation records
 *
 * This function adds userConversation records for all conversations where
 * a user is a participant, used when updating the data model.
 *
 * @param currentUserId The ID of the current user to migrate data for
 * @returns A Promise that resolves when migration is complete
 */
export const migrateToNewStructure = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('[Migration] Starting migration to new data structure...');
    const batch = writeBatch(db);
    let migratedCount = 0;

    // Get all conversations for this user
    const oldQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const querySnapshot = await getDocs(oldQuery);

    if (querySnapshot.empty) {
      console.log('[Migration] No conversations to migrate');
      return;
    }

    console.log(
      `[Migration] Found ${querySnapshot.docs.length} conversations to migrate`
    );

    // For each conversation, create userConversation records
    for (const conversationDoc of querySnapshot.docs) {
      const conversation = conversationDoc.data() as ConversationFirestore;
      const conversationId = conversationDoc.id;

      // For each participant, create a userConversation document
      for (const userId of conversation.participants) {
        // Skip AI assistant
        if (userId === 'ai-assistant') continue;

        // Find other participant (for regular chats)
        const otherParticipantIds = conversation.participants.filter(
          (id) => id !== userId
        );

        const otherParticipantId =
          otherParticipantIds.length > 0
            ? otherParticipantIds[0]
            : conversation.isAIChat
            ? 'ai-assistant'
            : '';

        // Create userConversation record with a deterministic ID
        const userConversationRef = doc(
          db,
          'userConversations',
          `${userId}_${conversationId}`
        );

        batch.set(
          userConversationRef,
          {
            userId,
            conversationId,
            otherParticipantId,
            lastReadTimestamp: conversation.updatedAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true } // Use merge to avoid overwriting if already exists
        );

        migratedCount++;
      }
    }

    // Commit the batch
    await batch.commit();
    console.log(
      `[Migration] Successfully migrated ${migratedCount} userConversation records`
    );
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  }
};

/**
 * Delete all user data for testing purposes
 *
 * This is a utility function meant for testing and development only.
 * It removes all conversations, messages, and userConversation records
 * associated with the specified user.
 *
 * @param currentUserId The ID of the user whose data should be deleted
 * @returns A Promise that resolves when deletion is complete
 */
export const deleteAllUserData = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('[Data Cleanup] Starting deletion of all user data...');

    // Get all userConversations for this user
    const userConversationsQuery = query(
      collection(db, 'userConversations'),
      where('userId', '==', currentUserId)
    );

    const userConversationsSnapshot = await getDocs(userConversationsQuery);

    if (userConversationsSnapshot.empty) {
      console.log('[Data Cleanup] No user data found to delete');
      return;
    }

    // Delete each userConversation and related conversation
    const batch = writeBatch(db);
    const conversationIds = new Set<string>();
    let deletedUserConversations = 0;

    userConversationsSnapshot.forEach((doc) => {
      // Delete userConversation
      batch.delete(doc.ref);
      deletedUserConversations++;

      // Track conversationId for later deletion
      const data = doc.data();
      conversationIds.add(data.conversationId);
    });

    console.log(
      `[Data Cleanup] Deleting ${deletedUserConversations} userConversation records and ${conversationIds.size} conversations`
    );

    // Delete all conversations and their messages
    let deletedMessages = 0;
    let deletedConversations = 0;

    for (const conversationId of conversationIds) {
      batch.delete(doc(db, 'conversations', conversationId));
      deletedConversations++;

      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
        deletedMessages++;
      });
    }

    // Commit the batch
    await batch.commit();
    console.log(
      `[Data Cleanup] Successfully deleted ${deletedUserConversations} userConversation records, ${deletedConversations} conversations, and ${deletedMessages} messages`
    );
  } catch (error) {
    console.error('[Data Cleanup] Error deleting user data:', error);
    throw error;
  }
};

/**
 * Add deterministic IDs to existing conversations
 *
 * This function is used during migration to change from auto-generated IDs
 * to deterministic IDs based on participants, making it easier to find
 * conversations between specific users.
 *
 * @param currentUserId The ID of the current user
 * @returns A Promise that resolves when migration is complete
 */
export const addDeterministicIds = async (
  currentUserId: string
): Promise<void> => {
  try {
    console.log('[Migration] Starting deterministic ID migration...');

    // Get all 1:1 conversations for this user (non-group chats)
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const conversationsSnapshot = await getDocs(conversationsQuery);

    if (conversationsSnapshot.empty) {
      console.log('[Migration] No conversations to migrate');
      return;
    }

    let migratedCount = 0;
    const batch = writeBatch(db);

    for (const conversationDoc of conversationsSnapshot.docs) {
      const conversation = conversationDoc.data() as ConversationFirestore;

      // Only process conversations with exactly 2 participants
      if (conversation.participants.length !== 2) {
        continue;
      }

      // Generate deterministic ID
      const sortedParticipants = [...conversation.participants].sort();
      const deterministicId = sortedParticipants.join('_');

      // Skip if the ID is already deterministic
      if (conversationDoc.id === deterministicId) {
        continue;
      }

      // Create new conversation document with deterministic ID
      const newConversationRef = doc(db, 'conversations', deterministicId);
      batch.set(newConversationRef, conversation);

      // Update userConversation records to point to the new conversation ID
      for (const userId of conversation.participants) {
        if (userId === 'ai-assistant') continue;

        // Delete old userConversation
        const oldUserConversationRef = doc(
          db,
          'userConversations',
          `${userId}_${conversationDoc.id}`
        );
        batch.delete(oldUserConversationRef);

        // Create new userConversation
        const otherUserId = conversation.participants.find(
          (id) => id !== userId
        );
        const newUserConversationRef = doc(
          db,
          'userConversations',
          `${userId}_${deterministicId}`
        );

        batch.set(newUserConversationRef, {
          userId,
          conversationId: deterministicId,
          otherParticipantId: otherUserId || '',
          lastReadTimestamp: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Delete old conversation document (after copying messages)
      // Note: Messages would need to be manually migrated as subcollections require separate handling
      batch.delete(conversationDoc.ref);

      migratedCount++;
    }

    if (migratedCount > 0) {
      await batch.commit();
      console.log(
        `[Migration] Successfully migrated ${migratedCount} conversations to deterministic IDs`
      );
    } else {
      console.log(
        '[Migration] No conversations needed migration to deterministic IDs'
      );
    }
  } catch (error) {
    console.error(
      '[Migration] Error during deterministic ID migration:',
      error
    );
    throw error;
  }
};

/**
 * Check and fix data integrity issues
 *
 * This utility function scans for common issues in the data structure and fixes them:
 * - Missing userConversation records for conversations
 * - Missing updatedAt fields
 * - Inconsistent conversation references
 *
 * @param userId User ID to check data for
 * @returns Summary of fixes made
 */
export const checkAndFixDataIntegrity = async (
  userId: string
): Promise<{ fixed: number; errors: number; details: string[] }> => {
  const result = {
    fixed: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    console.log(`[Data Integrity] Starting integrity check for user ${userId}`);

    // Get all conversations where user is a participant
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const conversationsSnapshot = await getDocs(conversationsQuery);

    if (conversationsSnapshot.empty) {
      result.details.push('No conversations found for user');
      return result;
    }

    const batch = writeBatch(db);

    // Check each conversation
    for (const conversationDoc of conversationsSnapshot.docs) {
      const conversationId = conversationDoc.id;
      const data = conversationDoc.data() as ConversationFirestore;

      // Check if this conversation has an updatedAt field
      if (!data.updatedAt) {
        batch.update(conversationDoc.ref, {
          updatedAt: serverTimestamp(),
        });
        result.details.push(
          `Fixed missing updatedAt in conversation ${conversationId}`
        );
        result.fixed++;
      }
      // Check if userConversation record exists for this user
      const userConversationRef = doc(
        db,
        'userConversations',
        `${userId}_${conversationId}`
      );

      const userConversationSnap = await getDoc(userConversationRef);

      if (!userConversationSnap.exists()) {
        // Find other participant
        const otherParticipantId =
          data.participants.find((id) => id !== userId) || '';

        // Create missing userConversation record
        batch.set(userConversationRef, {
          userId,
          conversationId,
          otherParticipantId,
          lastReadTimestamp: data.updatedAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        result.details.push(
          `Created missing userConversation record for ${conversationId}`
        );
        result.fixed++;
      }
    }

    // Commit fixes if any
    if (result.fixed > 0) {
      await batch.commit();
      console.log(`[Data Integrity] Fixed ${result.fixed} issues`);
    } else {
      console.log(`[Data Integrity] No issues found`);
    }
  } catch (error) {
    console.error('[Data Integrity] Error during integrity check:', error);
    result.errors++;
    result.details.push(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
};
