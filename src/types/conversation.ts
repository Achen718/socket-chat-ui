/**
 * Conversation related types
 */
export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Date | string;
    sender: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  isAIChat?: boolean;
}
