'use client';

import { useEffect, useRef, useState } from 'react';
import { Message as MessageType, Conversation } from '@/types';
import { Message } from './Message';
import { Skeleton } from '@/components/ui/skeleton';

// Props interface for MessageList
interface MessageListProps {
  messages: MessageType[];
  loading: boolean;
  isRefreshing: boolean;
  activeConversation: Conversation | null;
  fetchMessages: () => Promise<void>;
}

export function MessageList({
  messages,
  loading,
  isRefreshing,
  activeConversation,
  fetchMessages,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const [localMessages, setLocalMessages] = useState(messages);

  // Update local messages when messages from hook change
  useEffect(() => {
    setLocalMessages(messages);

    // Log message count changes for debugging
    if (previousMessageCount.current !== messages.length) {
      console.log(
        `MessageList: Message count changed from ${previousMessageCount.current} to ${messages.length}`
      );
      previousMessageCount.current = messages.length;
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // Force refresh messages when active conversation changes
  // Use a ref to track if we've already fetched for this conversation
  const hasInitialFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      activeConversation &&
      activeConversation.id !== hasInitialFetchRef.current
    ) {
      console.log(
        `MessageList: Active conversation changed to ${activeConversation.id}`
      );

      // Update the ref to prevent repeated fetches
      hasInitialFetchRef.current = activeConversation.id;

      // Fetch messages
      fetchMessages();
    }
  }, [activeConversation, fetchMessages]);

  // Handle manual refresh

  // Show loading state ONLY if we don't have an active conversation yet
  if (loading && !activeConversation) {
    return (
      <div className='flex-1 p-4 overflow-y-auto space-y-4'>
        <div className='flex items-start gap-3'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-20 w-[60%] rounded-lg' />
        </div>
        <div className='flex items-start justify-end gap-3'>
          <Skeleton className='h-16 w-[50%] rounded-lg' />
        </div>
        <div className='flex items-start gap-3'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-20 w-[70%] rounded-lg' />
        </div>
      </div>
    );
  }

  // Show empty state if no active conversation
  if (!activeConversation) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-4'>
        <div className='text-center space-y-3'>
          <h3 className='text-lg font-semibold'>Select a conversation</h3>
          <p className='text-muted-foreground text-sm'>
            Choose an existing conversation or start a new one to begin chatting
          </p>
        </div>
      </div>
    );
  }

  // Show loading state for messages if we have an active conversation but no messages yet
  if (loading && localMessages.length === 0) {
    return (
      <div className='flex-1 p-4 overflow-y-auto space-y-4'>
        <div className='flex items-start gap-3'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-20 w-[60%] rounded-lg' />
        </div>
        <div className='flex items-start justify-end gap-3'>
          <Skeleton className='h-16 w-[50%] rounded-lg' />
        </div>
      </div>
    );
  }

  // Show empty conversation state
  if (localMessages.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-4'>
        <div className='text-center space-y-3'>
          <h3 className='text-lg font-semibold'>No messages yet</h3>
          <p className='text-muted-foreground text-sm'>
            Start the conversation by sending the first message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 p-4 overflow-y-auto'>
      {/* Show refresh indicator */}
      {isRefreshing && (
        <div className='text-xs text-center mb-2 text-muted-foreground'>
          <span className='inline-block animate-pulse'>
            Refreshing messages...
          </span>
        </div>
      )}

      <div className='space-y-2'>
        {localMessages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLastMessage={index === localMessages.length - 1}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
