import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.SOCKET_PORT || 4000;
const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Initialize Express app
const app = express();
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO events
enum SocketEvents {
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

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

// Socket connection handlers
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Get userId from handshake query
  const userId = socket.handshake.query.userId as string;

  if (userId) {
    // Track user as online
    onlineUsers.set(userId, socket.id);

    // Notify others that user is online
    io.emit(SocketEvents.USER_ONLINE, { userId });

    console.log(`User ${userId} is online`);
  }

  // Handle new messages
  socket.on(SocketEvents.NEW_MESSAGE, (message) => {
    console.log('New message:', message);
    // Broadcast message to all clients
    io.emit(SocketEvents.NEW_MESSAGE, message);
  });

  // Handle typing indicator
  socket.on(SocketEvents.USER_TYPING, ({ conversationId, userId }) => {
    console.log(`User ${userId} is typing in conversation ${conversationId}`);
    // Broadcast typing status to all clients
    io.emit(SocketEvents.USER_TYPING, { conversationId, userId });
  });

  // Handle stop typing indicator
  socket.on(SocketEvents.USER_STOP_TYPING, ({ conversationId, userId }) => {
    console.log(
      `User ${userId} stopped typing in conversation ${conversationId}`
    );
    // Broadcast stop typing status to all clients
    io.emit(SocketEvents.USER_STOP_TYPING, { conversationId, userId });
  });

  // Handle message read
  socket.on(SocketEvents.MESSAGE_READ, ({ messageId, conversationId }) => {
    console.log(
      `Message ${messageId} was read in conversation ${conversationId}`
    );
    // Broadcast message read to all clients
    io.emit(SocketEvents.MESSAGE_READ, { messageId, conversationId });
  });

  // Handle message delivered
  socket.on(SocketEvents.MESSAGE_DELIVERED, ({ messageId, conversationId }) => {
    console.log(
      `Message ${messageId} was delivered in conversation ${conversationId}`
    );
    // Broadcast message delivered to all clients
    io.emit(SocketEvents.MESSAGE_DELIVERED, { messageId, conversationId });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    if (userId) {
      // Remove user from online users
      onlineUsers.delete(userId);

      // Notify others that user is offline
      io.emit(SocketEvents.USER_OFFLINE, { userId });

      console.log(`User ${userId} is offline`);
    }
  });
});

// Basic health check route
app.get('/health', (req: express.Request, res: express.Response) => {
  res
    .status(200)
    .json({ status: 'OK', message: 'Socket.IO server is running' });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Accepting connections from: ${CLIENT_URL}`);
});
