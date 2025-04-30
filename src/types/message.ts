/**
 * Message related types
 */
export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date | string;
  status: 'sent' | 'delivered' | 'read';
  isAI?: boolean;
}
