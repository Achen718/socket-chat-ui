import { Socket, io } from 'socket.io-client';
import { User } from '@/types';
import { SocketEvents } from './events';

// Socket instance shared with connection.ts
let socket: Socket | null = null;

// Initialize a mock socket for development/testing
export const initializeMockSocket = (user: User): Socket => {
  console.warn(
    'Socket running in mock mode - No NEXT_PUBLIC_SOCKET_URL configured'
  );

  // Create a mock socket that doesn't attempt to connect
  socket = io('http://localhost', {
    autoConnect: false,
    // Add auth property to match real implementation
    auth: {
      userId: user.id,
      displayName: user.displayName,
    },
  });

  console.log(
    `Mock socket initialized for user: ${user.displayName} (${user.id})`
  );
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
};

// Export for type consistency with the real implementation
export const setMockSocket = (mockSocket: Socket): void => {
  socket = mockSocket;
};
