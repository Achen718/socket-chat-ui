/**
 * Chat state related types
 */
import { Conversation } from './conversation';
import { Message } from './message';

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}
