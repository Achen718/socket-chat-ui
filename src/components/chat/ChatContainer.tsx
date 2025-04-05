'use client';

import { useState, useCallback, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks';

// Create a stabilized wrapper to prevent re-renders
const StableWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export function ChatContainer() {
  const {
    activeConversation,
    messages,
    loading,
    fetchMessages,
    sendMessage,
    sendAIMessage,
  } = useChat();
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Local state to track when a message refresh is happening
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create stabilized message sending functions that won't change on re-renders
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

  // Wrap fetchMessages to track refresh state
  const stableFetchMessages = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent refreshes

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

      {/* Message list contained in its own div with its own React tree */}
      <div ref={messageListRef} className='flex-1 overflow-hidden'>
        <MessageList
          messages={messages}
          loading={loading}
          isRefreshing={isRefreshing}
          activeConversation={activeConversation}
          fetchMessages={stableFetchMessages}
        />
      </div>

      {/* Input area is isolated from message list updates */}
      <div ref={inputContainerRef}>
        <StableWrapper>
          <ChatInput
            activeConversation={activeConversation}
            loading={loading}
            sendMessage={stableSendMessage}
            sendAIMessage={stableSendAIMessage}
          />
        </StableWrapper>
      </div>
    </div>
  );
}
