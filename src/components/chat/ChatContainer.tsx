'use client';

import { useState, useCallback, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks';

const StableWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export function ChatContainer() {
  const {
    activeConversation,
    messages,
    messagesLoading,
    fetchMessages,
    sendMessage,
    sendAIMessage,
  } = useChat();
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const stableSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    [sendMessage]
  );

  const stableSendAIMessage = useCallback(
    async (message: string, aiRecipientId: string) => {
      try {
        await sendAIMessage(message, aiRecipientId);
      } catch (error) {
        console.error('Error sending AI message:', error);
      }
    },
    [sendAIMessage]
  );
  const stableFetchMessages = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await fetchMessages();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fetchMessages]);

  return (
    <div className='flex flex-col h-full chat-container'>
      <ChatHeader />

      <div ref={messageListRef} className='flex-1 overflow-auto'>
        <MessageList
          messages={messages}
          loading={messagesLoading}
          isRefreshing={isRefreshing}
          activeConversation={activeConversation}
          fetchMessages={stableFetchMessages}
        />
      </div>

      <div ref={inputContainerRef}>
        <StableWrapper>
          <ChatInput
            activeConversation={activeConversation}
            loading={messagesLoading}
            sendMessage={stableSendMessage}
            sendAIMessage={stableSendAIMessage}
          />
        </StableWrapper>
      </div>
    </div>
  );
}
