/**
 * Firebase-specific types
 * These types are specific to the Firebase implementation and extend our domain types
 * to handle Firebase-specific requirements, like handling Firestore timestamps
 */

import { User } from '@/types/user';
import { Message } from '@/types/message';
import { Conversation } from '@/types/conversation';
import { FirebaseApp } from 'firebase/app';
import { Auth, User as FirebaseUser } from 'firebase/auth';
import {
  Firestore,
  FieldValue,
  DocumentData,
  DocumentReference,
} from 'firebase/firestore';

/**
 * Configuration for Firebase initialization
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase services container
 */
export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

/**
 * User data as stored in Firestore
 * Extends our domain User type with Firestore-specific timestamp handling
 */
export interface UserFirestore
  extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
}

/**
 * Message data as stored in Firestore
 */
export interface MessageFirestore extends Omit<Message, 'id' | 'timestamp'> {
  timestamp: FieldValue | Date;
}

/**
 * Conversation data as stored in Firestore
 */
export interface ConversationFirestore
  extends Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'lastMessage'> {
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
  lastMessage?: {
    content: string;
    timestamp: FieldValue | Date;
    sender: string;
  };
}

/**
 * User data after conversion from Firestore
 * This ensures proper type handling when converting from Firestore documents
 */
export interface UserData extends User {
  ref?: DocumentReference<DocumentData>;
}

/**
 * Represents a Firebase authentication result with extended data
 */
export interface AuthResult {
  user: FirebaseUser;
  isNewUser?: boolean;
}
