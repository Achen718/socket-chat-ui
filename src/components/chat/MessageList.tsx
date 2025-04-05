'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '@/hooks';
import { Message } from './Message';
import { Skeleton } from '@/components/ui/skeleton';

export function MessageList() {
  const { messages, loading, activeConversation, fetchMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const lastRefreshTimeRef = useRef(Date.now());
  // This state is used only to trigger component re-renders when needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Helper function to update the refresh time ref and trigger a re-render if needed
  const updateRefreshTime = useCallback(() => {
    lastRefreshTimeRef.current = Date.now();
    setRefreshTrigger((prev) => prev + 1); // Just to trigger re-renders when needed
  }, []); // Empty dependency array since it only uses refs and state updater

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Log message count changes for debugging
    if (previousMessageCount.current !== messages.length) {
      console.log(
        `MessageList: Message count changed from ${previousMessageCount.current} to ${messages.length}`
      );
      previousMessageCount.current = messages.length;
    }
  }, [messages]);

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

      // Fetch messages and update refresh time
      fetchMessages();
      lastRefreshTimeRef.current = Date.now(); // Update directly without state change
    }
  }, [activeConversation, fetchMessages]);

  // Find the auto-refresh effect and modify it to be more reliable
  useEffect(() => {
    if (!activeConversation) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

      // If it's been more than 8 seconds since the last refresh, refresh messages
      if (timeSinceLastRefresh > 8000) {
        // Increased to 8 seconds to match timeout duration
        console.log('MessageList: Starting auto-refresh check');

        // Instead of immediately calling fetchMessages, use a more careful approach
        const checkForNewMessages = async () => {
          try {
            // Store the current messages for comparison
            const currentMessageIds = new Set(messages.map((m) => m.id));
            const currentCount = messages.length;

            // Add a local flag to prevent state updates if no real changes
            let messagesFetched = false;

            // Wrap fetchMessages in a try/catch specifically for this auto-refresh
            try {
              await fetchMessages();
              messagesFetched = true;
            } catch (fetchError) {
              console.error('Error during auto-refresh fetch:', fetchError);
              // Don't update the timestamp on error - this allows us to try again soon
              return;
            }

            // Only update the refresh timestamp if we actually got messages back
            if (messagesFetched) {
              lastRefreshTimeRef.current = now;

              // Log helpful debugging info about what changed
              if (messages.length !== currentCount) {
                console.log(
                  `MessageList: Refresh changed message count: ${currentCount} → ${messages.length}`
                );
              } else {
                // Check if the message IDs are different even if count is the same
                const newMessageIds = new Set(messages.map((m) => m.id));
                const hasNewMessages = [...newMessageIds].some(
                  (id) => !currentMessageIds.has(id)
                );
                const hasMissingMessages = [...currentMessageIds].some(
                  (id) => !newMessageIds.has(id)
                );

                if (hasNewMessages || hasMissingMessages) {
                  console.log(
                    'MessageList: Message IDs changed but count remained the same'
                  );
                } else {
                  console.log(
                    'MessageList: Auto-refresh completed - no changes detected'
                  );
                }
              }
            }
          } catch (error) {
            console.error('Error during auto-refresh handling:', error);
          }
        };

        // Run the check without awaiting it to avoid blocking
        checkForNewMessages();
      }
    }, 10000); // Interval set to 10 seconds to reduce frequency

    return () => clearInterval(intervalId);
  }, [activeConversation, fetchMessages, messages]);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    fetchMessages();
    updateRefreshTime();
  }, [fetchMessages, updateRefreshTime]);

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
  if (loading && messages.length === 0) {
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
  if (messages.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center p-4'>
        <div className='text-center space-y-3'>
          <h3 className='text-lg font-semibold'>No messages yet</h3>
          <p className='text-muted-foreground text-sm'>
            Start the conversation by sending the first message!
          </p>
          <button
            className='mt-2 text-xs text-blue-500 hover:underline'
            onClick={handleManualRefresh}
          >
            Refresh messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 p-4 overflow-y-auto'>
      <div className='space-y-2'>
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLastMessage={index === messages.length - 1}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />

      {messages.length > 0 && (
        <div className='mt-2 text-center'>
          <button
            className='text-xs text-blue-500 hover:underline'
            onClick={handleManualRefresh}
          >
            Refresh messages
          </button>
        </div>
      )}
    </div>
  );
}
