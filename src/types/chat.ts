/**
 * Chat state related types
 */
import { Conversation } from './conversation';
import { Message } from './message';

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}
