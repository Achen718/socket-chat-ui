/**
 * AI related types - index file that re-exports all AI-related types
 */

import { Message } from '@/types/message';

export interface AIResponse {
  content: string;
  conversationId: string;
  timestamp: Date | string;
}

export interface AIRequestPayload {
  message: string;
  conversationId: string;
  messageHistory: Message[];
}
