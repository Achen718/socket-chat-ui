'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
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

// Separate component to handle refreshes without affecting parent components
const RefreshController = memo(
  ({
    onRefreshNeeded,
    checkForChanges,
  }: {
    onRefreshNeeded: () => void;
    checkForChanges: () => Promise<boolean>;
  }) => {
    const lastRefreshTimeRef = useRef(Date.now());
    const isCheckingForChangesRef = useRef(false);

    // Set up auto-refresh interval with change detection
    useEffect(() => {
      const intervalId = setInterval(async () => {
        // Prevent multiple concurrent checks
        if (isCheckingForChangesRef.current) return;

        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

        // If it's been more than 8 seconds since the last refresh, check for changes
        if (timeSinceLastRefresh > 8000) {
          try {
            isCheckingForChangesRef.current = true;
            console.log('RefreshController: Checking for changes...');

            // First check if there are any changes
            const hasChanges = await checkForChanges();

            if (hasChanges) {
              console.log(
                'RefreshController: Changes detected, triggering refresh'
              );
              onRefreshNeeded();
            } else {
              console.log(
                'RefreshController: No changes detected, skipping refresh'
              );
            }

            // Update the refresh time regardless of whether changes were found
            lastRefreshTimeRef.current = now;
          } catch (error) {
            console.error('Error checking for changes:', error);
          } finally {
            isCheckingForChangesRef.current = false;
          }
        }
      }, 10000);

      return () => clearInterval(intervalId);
    }, [onRefreshNeeded, checkForChanges]);

    // This component doesn't render anything
    return null;
  }
);

RefreshController.displayName = 'RefreshController';

export function MessageList({
  messages,
  loading,
  isRefreshing,
  activeConversation,
  fetchMessages,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const lastRefreshTimeRef = useRef(Date.now());
  const messageHashRef = useRef<string>('');
  // This state is used only to trigger component re-renders when needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [localMessages, setLocalMessages] = useState(messages);

  // Helper function to update the refresh time ref and trigger a re-render if needed
  const updateRefreshTime = useCallback(() => {
    lastRefreshTimeRef.current = Date.now();
    setRefreshTrigger((prev) => prev + 1); // Just to trigger re-renders when needed
  }, []); // Empty dependency array since it only uses refs and state updater

  // Generate a hash of messages for comparison
  const generateMessagesHash = useCallback((msgs: MessageType[]): string => {
    return msgs.map((m) => `${m.id}:${m.timestamp}`).join('|');
  }, []);

  // Update message hash reference when messages change
  useEffect(() => {
    messageHashRef.current = generateMessagesHash(messages);
  }, [messages, generateMessagesHash]);

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

  // Function to check for changes without updating UI
  const checkForChanges = useCallback(async (): Promise<boolean> => {
    if (!activeConversation) return false;

    try {
      // Store current message hash before fetching
      const oldHash = messageHashRef.current;

      // Quietly fetch messages from Firebase without updating the UI yet
      const { getConversationMessages } = await import('@/lib/firebase/chat');
      const updatedMessages = await getConversationMessages(
        activeConversation.id
      );

      // Generate a hash of the new messages
      const newHash = generateMessagesHash(updatedMessages);

      // Compare hashes to determine if there are any changes
      return oldHash !== newHash;
    } catch (error) {
      console.error('Error checking for message changes:', error);
      return false; // Assume no changes on error
    }
  }, [activeConversation, generateMessagesHash]);

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

  // Handle refreshes without affecting parent components
  const handleRefreshNeeded = useCallback(async () => {
    if (!activeConversation) return;

    console.log('MessageList: Starting refresh');
    try {
      // Store current message count
      const currentCount = localMessages.length;

      // Fetch new messages - this will update the main hook's messages state
      await fetchMessages();

      // Log message change info
      if (messages.length !== currentCount) {
        console.log(
          `MessageList: Refresh changed message count: ${currentCount} → ${messages.length}`
        );
      } else {
        console.log('MessageList: Refresh completed - no changes detected');
      }
    } catch (error) {
      console.error('Error during manual refresh:', error);
    }
  }, [
    activeConversation,
    fetchMessages,
    localMessages.length,
    messages.length,
  ]);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    handleRefreshNeeded();
    updateRefreshTime();
  }, [handleRefreshNeeded, updateRefreshTime]);

  // Show loading indicator if refresh is in progress
  const showRefreshIndicator = isRefreshing && localMessages.length > 0;

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
        <RefreshController
          onRefreshNeeded={handleRefreshNeeded}
          checkForChanges={checkForChanges}
        />
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
      <RefreshController
        onRefreshNeeded={handleRefreshNeeded}
        checkForChanges={checkForChanges}
      />

      {/* Show refresh indicator */}
      {showRefreshIndicator && (
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

      {localMessages.length > 0 && (
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
