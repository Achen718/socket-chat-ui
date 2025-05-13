import { FieldValue, Timestamp } from 'firebase/firestore';

// Firestore interfaces
export interface ConversationFirestore {
  participants: string[];
  createdAt: FieldValue | Timestamp | Date;
  updatedAt: FieldValue | Timestamp | Date;
  isAIChat?: boolean;
  lastMessage?: {
    content: string;
    timestamp: FieldValue | Timestamp | Date;
    sender: string;
  };
}

export interface MessageFirestore {
  conversationId: string;
  sender: string;
  content: string;
  timestamp: FieldValue | Timestamp | Date;
  status: 'sent' | 'delivered' | 'read';
  isAI?: boolean;
}

// Client interfaces
export interface UserConversation {
  userId: string;
  conversationId: string;
  otherParticipantId: string;
  lastReadTimestamp: Date | string;
  updatedAt?: Date | string;
}
