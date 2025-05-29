import {
  sendTypingNotification,
  markMessageAsRead as markSocketMessageAsRead,
} from '@/lib/socket';

export interface SocketOperations {
  markMessageAsRead: (messageId: string, conversationId: string) => void;
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;
}

export const createSocketOperations = (): SocketOperations => ({
  markMessageAsRead: (messageId: string, conversationId: string) => {
    markSocketMessageAsRead(messageId, conversationId);
  },

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    sendTypingNotification(conversationId, userId, isTyping);
  },
});
