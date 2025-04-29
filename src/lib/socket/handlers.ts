import { Socket } from 'socket.io-client';
import { SocketEvents } from './events';

// Setup socket event handlers for centralized socket event management
export const setupSocketEventHandlers = (socket: Socket): void => {
  // Connection events
  socket.on(SocketEvents.CONNECT, () => {
    console.log('Socket connected successfully');
  });

  socket.on(SocketEvents.DISCONNECT, (reason) => {
    console.log(`Socket disconnected: ${reason}`);
  });

  socket.on(SocketEvents.ERROR, (error) => {
    console.error('Socket error:', error);
  });

  // Chat-related events (these will dispatch to your state management)
  socket.on(SocketEvents.NEW_MESSAGE, (message) => {
    console.log('New message received:', message);
    // Dispatch to your message store/context
    // Example: messageStore.addMessage(message);
  });

  socket.on(SocketEvents.USER_TYPING, ({ userId, conversationId }) => {
    console.log(`User ${userId} is typing in conversation ${conversationId}`);
    // Update UI to show typing indicator
    // Example: typingIndicatorStore.setTyping(userId, conversationId);
  });

  socket.on(SocketEvents.USER_STOP_TYPING, ({ userId, conversationId }) => {
    console.log(
      `User ${userId} stopped typing in conversation ${conversationId}`
    );
    // Example: typingIndicatorStore.clearTyping(userId, conversationId);
  });

  // User presence events
  socket.on(SocketEvents.USER_ONLINE, (userId) => {
    console.log(`User ${userId} is online`);
    // Example: presenceStore.setUserStatus(userId, 'online');
  });

  socket.on(SocketEvents.USER_OFFLINE, (userId) => {
    console.log(`User ${userId} is offline`);
    // Example: presenceStore.setUserStatus(userId, 'offline');
  });

  // Message status events
  socket.on(SocketEvents.MESSAGE_READ, ({ messageId, userId }) => {
    console.log(`Message ${messageId} was read by ${userId}`);
    // Example: messageStore.markAsRead(messageId, userId);
  });

  socket.on(SocketEvents.MESSAGE_DELIVERED, ({ messageId, userId }) => {
    console.log(`Message ${messageId} was delivered to ${userId}`);
    // Example: messageStore.markAsDelivered(messageId, userId);
  });
};
