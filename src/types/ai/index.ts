/**
 * AI related types - index file that re-exports all AI-related types
 */

import { Message } from '@/types/message';

// AI response types
export interface AIResponse {
  content: string;
  conversationId: string;
  timestamp: Date | string;
}

// AI request types
export interface AIRequestPayload {
  message: string;
  conversationId: string;
  messageHistory: Message[];
}
