import { Message } from '@/types';
import { getSocket } from './connection';
import { SocketEvents } from './events';

// Send a message via socket
export const sendMessage = (message: Message): void => {
  const socket = getSocket();
  if (socket) {
    socket.emit(SocketEvents.NEW_MESSAGE, message);
  }
};

// Notify typing status
export const sendTypingNotification = (
  conversationId: string,
  userId: string,
  isTyping: boolean
): void => {
  const socket = getSocket();
  if (socket) {
    const event = isTyping
      ? SocketEvents.USER_TYPING
      : SocketEvents.USER_STOP_TYPING;

    socket.emit(event, { conversationId, userId });
  }
};

// Mark message as read
export const markMessageAsRead = (
  messageId: string,
  conversationId: string
): void => {
  const socket = getSocket();
  if (socket) {
    socket.emit(SocketEvents.MESSAGE_READ, { messageId, conversationId });
  }
};

// Mark message as delivered
export const markMessageAsDelivered = (
  messageId: string,
  conversationId: string
): void => {
  const socket = getSocket();
  if (socket) {
    socket.emit(SocketEvents.MESSAGE_DELIVERED, { messageId, conversationId });
  }
};
