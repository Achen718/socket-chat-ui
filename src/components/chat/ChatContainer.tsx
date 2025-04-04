'use client';

import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  return (
    <div className='flex flex-col h-full'>
      <ChatHeader />
      <MessageList />
      <ChatInput />
    </div>
  );
}
