import { io, Socket } from 'socket.io-client';
import { User } from '@/types';
import { setupSocketEventHandlers } from './handlers';
import { initializeMockSocket } from './mockSocket';

// Socket instance singleton
let socket: Socket | null = null;
let mockMode = false;

// Initialize Socket.IO connection
export const initializeSocket = (user: User): Socket => {
  if (socket) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (!socketUrl) {
    console.error('Missing NEXT_PUBLIC_SOCKET_URL environment variable');
    // Enable mock mode when URL is missing
    mockMode = true;

    // Initialize and return mock socket
    return initializeMockSocket(user);
  }

  // Normal socket initialization with real URL
  console.log(`Initializing socket connection to ${socketUrl}`);

  socket = io(socketUrl, {
    auth: {
      userId: user.id,
      displayName: user.displayName,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Handle socket events
  setupSocketEventHandlers(socket);

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

// Check if socket is connected
export const isConnected = (): boolean => {
  return !!(socket && socket.connected);
};

// Expose whether we're in mock mode
export const isMockMode = (): boolean => {
  return mockMode;
};
