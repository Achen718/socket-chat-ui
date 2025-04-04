import { io, Socket } from 'socket.io-client';
import { User, Message } from '@/types';

// Socket.IO events
export enum SocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  NEW_MESSAGE = 'new_message',
  USER_TYPING = 'user_typing',
  USER_STOP_TYPING = 'user_stop_typing',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  MESSAGE_READ = 'message_read',
  MESSAGE_DELIVERED = 'message_delivered',
}

// Socket instance
let socket: Socket | null = null;
let mockMode = false;

// Initialize Socket.IO connection
export const initializeSocket = (user: User): Socket => {
  if (socket) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  mockMode = !socketUrl;

  if (mockMode) {
    console.warn(
      'Socket running in mock mode - No NEXT_PUBLIC_SOCKET_URL configured'
    );

    // Create a mock socket that doesn't attempt to connect
    socket = io('http://localhost', {
      autoConnect: false,
    });

    // Simulate connection events after a brief delay
    setTimeout(() => {
      if (socket) {
        socket.connected = true;
        socket.emit(SocketEvents.CONNECT);
      }
    }, 1000);

    // Add mock emit method that logs events instead of sending them
    const originalEmit = socket.emit;
    socket.emit = function mockEmit(event: string, ...args: unknown[]) {
      console.log(`Mock socket emitting: ${event}`, args);

      // For new message events, simulate echo response
      if (event === SocketEvents.NEW_MESSAGE && args[0]) {
        const message = args[0];
        setTimeout(() => {
          // Access internal socket.io callbacks with proper casting
          type SocketCallbacks = Record<string, ((data: unknown) => void)[]>;
          const socketCallbacks = (socket as { _callbacks?: SocketCallbacks })
            ._callbacks;
          const callbacks =
            socketCallbacks?.[`$${SocketEvents.NEW_MESSAGE}`] || [];
          callbacks.forEach((handler) => handler(message));
        }, 500);
      }

      return originalEmit.apply(this, [event, ...args]);
    };

    return socket;
  }

  // Create real socket connection when URL is available
  socket = io(socketUrl, {
    autoConnect: true,
    query: {
      userId: user.id,
    },
    withCredentials: true,
  });

  // Connection events
  socket.on(SocketEvents.CONNECT, () => {
    console.log('Socket connected');
  });

  socket.on(SocketEvents.DISCONNECT, () => {
    console.log('Socket disconnected');
  });

  socket.on(SocketEvents.ERROR, (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Get socket instance
export const getSocket = (): Socket | null => {
  return socket;
};

// Send a message via socket
export const sendMessage = (message: Message): void => {
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
  if (socket) {
    socket.emit(SocketEvents.MESSAGE_READ, { messageId, conversationId });
  }
};

// Mark message as delivered
export const markMessageAsDelivered = (
  messageId: string,
  conversationId: string
): void => {
  if (socket) {
    socket.emit(SocketEvents.MESSAGE_DELIVERED, { messageId, conversationId });
  }
};
