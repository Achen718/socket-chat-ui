export const testUsers = {
  standard: {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    status: 'online',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  google: {
    id: 'google-user-id',
    email: 'google@example.com',
    displayName: 'Google User',
    status: 'online',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const testMessages = [
  {
    id: 'msg-1',
    text: 'Hello world',
    senderId: 'test-user-id',
    timestamp: new Date().toISOString(),
    read: true,
  },
  {
    id: 'msg-2',
    text: 'How are you?',
    senderId: 'other-user-id',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    read: false,
  },
];

export const testChats = {
  direct: {
    id: 'chat-1',
    type: 'direct',
    participants: ['test-user-id', 'other-user-id'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: 'Hello world',
    lastMessageTimestamp: new Date().toISOString(),
  },
  group: {
    id: 'chat-2',
    type: 'group',
    name: 'Test Group',
    participants: ['test-user-id', 'other-user-id', 'third-user-id'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: 'Group message',
    lastMessageTimestamp: new Date().toISOString(),
  },
};
