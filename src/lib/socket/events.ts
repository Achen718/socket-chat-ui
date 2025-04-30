export const SocketEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  NEW_MESSAGE: 'new_message',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  MESSAGE_READ: 'message_read',
  MESSAGE_DELIVERED: 'message_delivered',

  // New events for conversation/messages
  SEND_MESSAGE: 'send_message',
  MESSAGES_UPDATED: 'messages_updated',
  GET_CONVERSATIONS: 'get_conversations',
  CONVERSATIONS_UPDATED: 'conversations_updated',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
} as const;

// Type for type safety
export type SocketEventType = (typeof SocketEvents)[keyof typeof SocketEvents];
