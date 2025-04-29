// Re-export everything from the socket module
export * from './events';
export * from './connection';
export * from './emitters';

// Provide a default export for the main initialization function
import { initializeSocket } from './connection';
export default initializeSocket;
