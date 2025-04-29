// Socket event types
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
