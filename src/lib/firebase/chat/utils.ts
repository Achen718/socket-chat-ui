import { Timestamp, FieldValue } from 'firebase/firestore';
import { ConversationFirestore } from './types';
import { Conversation } from '@/types';

/**
 * Converts a Firestore timestamp to an ISO string date
 * Handles FieldValue, Timestamp, Date, or string inputs
 */
export function toISOString(
  timestamp: FieldValue | Timestamp | Date | string | undefined
): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  if (typeof timestamp === 'string') {
    return timestamp;
  }

  // For FieldValue (like serverTimestamp()) or other types, return current date
  return new Date().toISOString();
}

/**
 * Converts a Firestore timestamp to a Date object
 * Handles FieldValue, Timestamp, Date, or string inputs
 */
export function toDate(
  timestamp: FieldValue | Timestamp | Date | string | undefined
): Date {
  if (!timestamp) {
    return new Date();
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // For FieldValue (like serverTimestamp()) or other types, return current date
  return new Date();
}

/**
 * Converts a Firestore conversation document to the application Conversation type
 */
export function mapConversationFromFirestore(
  id: string,
  data: ConversationFirestore
): Conversation {
  return {
    id,
    participants: data.participants,
    lastMessage: data.lastMessage
      ? {
          content: data.lastMessage.content,
          sender: data.lastMessage.sender,
          timestamp: toDate(data.lastMessage.timestamp),
        }
      : undefined,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
    isAIChat: data.isAIChat || false,
  };
}
