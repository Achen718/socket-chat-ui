'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { Send, Paperclip, Mic, Smile } from 'lucide-react';
import { Conversation } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Props interface for ChatInput
interface ChatInputProps {
  activeConversation: Conversation | null;
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  sendAIMessage: (message: string, aiRecipientId: string) => Promise<void>;
}

// Use memo to prevent re-renders from parent
export const ChatInput = memo(function ChatInput({
  activeConversation,
  loading,
  sendMessage,
  sendAIMessage,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // isFocused is used in the focus handler logic
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusTime = useRef(Date.now());
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  // Track if we're currently reapplying focus to avoid loops
  const isReapplyingFocus = useRef(false);

  // Focus input on mount and when conversation changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation?.id]);

  // Keep track of focus state to help us re-apply focus when needed
  const handleFocus = () => {
    setIsFocused(true);
    lastFocusTime.current = Date.now();

    // Clear any existing focus interval when manually focused
    if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }

    // Store the fact that we're focused in sessionStorage to maintain focus across re-renders
    try {
      sessionStorage.setItem('chatInputFocused', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const handleBlur = () => {
    // Don't update state if we're in the middle of programmatically reapplying focus
    if (isReapplyingFocus.current) return;

    setIsFocused(false);

    // Clear the focused flag
    try {
      sessionStorage.removeItem('chatInputFocused');
    } catch {
      // Ignore storage errors
    }
  };

  // Check if we were previously focused when component mounts
  useEffect(() => {
    try {
      const wasFocused = sessionStorage.getItem('chatInputFocused') === 'true';
      if (wasFocused && inputRef.current) {
        inputRef.current.focus();
        setIsFocused(true);
      }
    } catch {
      // Ignore storage errors
    }

    // Clean up all intervals and observers on unmount
    return () => {
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
        focusIntervalRef.current = null;
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
    };
  }, []);

  // Maintain focus when loading state changes
  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    // When loading completes, check if we should be focused
    try {
      const shouldBeFocused =
        sessionStorage.getItem('chatInputFocused') === 'true';
      if (
        shouldBeFocused &&
        inputRef.current &&
        document.activeElement !== inputRef.current
      ) {
        // Use requestAnimationFrame to ensure DOM is settled
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }, [loading]);

  // Determine if this is an AI chat
  const isAIChat = activeConversation?.isAIChat === true;
  const aiUserId = 'ai-assistant';

  // Handle message submission
  const handleSendMessage = async () => {
    if (!message.trim() || loading || !activeConversation || isSending) return;

    const trimmedMessage = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      console.log(
        `Sending message to ${
          isAIChat ? 'AI' : 'user'
        }: ${trimmedMessage.substring(0, 20)}...`
      );

      if (isAIChat) {
        // For AI chats, use the special sendAIMessage function
        try {
          await sendAIMessage(trimmedMessage, aiUserId);
        } catch (aiError) {
          console.error('Error with AI response:', aiError);
          // The message was still sent, but the AI response failed
          // This is handled by the sendAIMessage function with fallback responses
        }
      } else {
        // For regular chats, use the normal sendMessage function
        await sendMessage(trimmedMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Allow user to try again by restoring the message text
      if (error && typeof error === 'object' && 'message' in error) {
        if (
          (error.message as string).includes('network') ||
          (error.message as string).includes('timeout')
        ) {
          setMessage(trimmedMessage);
        }
      }
    } finally {
      setIsSending(false);
      // Make sure we keep focus after sending
      if (inputRef.current) {
        inputRef.current.focus();
        // Update last focus time to ensure our focus retention logic continues
        lastFocusTime.current = Date.now();
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto resize textarea
  const handleInput = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  // Handle typing status
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Update last focus time since user is actively typing
    lastFocusTime.current = Date.now();

    if (!isTyping && e.target.value) {
      setIsTyping(true);
      // Here you would notify the server that user is typing
      // socketService.sendTypingNotification(true)
    } else if (isTyping && !e.target.value) {
      setIsTyping(false);
      // Notify server user stopped typing
      // socketService.sendTypingNotification(false)
    }
  };

  return (
    <div className='border-t bg-background p-4'>
      <div className='flex items-end gap-2'>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='h-9 w-9 rounded-full'
        >
          <Paperclip className='h-5 w-5' />
          <span className='sr-only'>Attach file</span>
        </Button>

        <div className='relative flex-1'>
          <Textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={
              isAIChat ? 'Ask the AI assistant...' : 'Type a message...'
            }
            className={cn(
              'min-h-[40px] w-full resize-none border rounded-full py-3 pr-16 pl-4',
              'max-h-32 overflow-y-auto',
              isFocused && 'ring-2 ring-ring ring-offset-1'
            )}
            rows={1}
            disabled={loading || !activeConversation || isSending}
          />
          <div className='absolute right-1 bottom-1 flex items-center gap-1'>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='h-8 w-8 rounded-full text-muted-foreground'
            >
              <Smile className='h-5 w-5' />
              <span className='sr-only'>Add emoji</span>
            </Button>

            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='h-8 w-8 rounded-full text-muted-foreground mr-0.5'
            >
              <Mic className='h-5 w-5' />
              <span className='sr-only'>Voice message</span>
            </Button>
          </div>
        </div>

        <Button
          type='button'
          size='icon'
          className='h-10 w-10 rounded-full'
          disabled={
            !message.trim() || loading || !activeConversation || isSending
          }
          onClick={handleSendMessage}
        >
          {isSending ? (
            <div className='h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin' />
          ) : (
            <Send className='h-5 w-5' />
          )}
          <span className='sr-only'>Send message</span>
        </Button>
      </div>

      {isAIChat && (
        <div className='text-xs text-muted-foreground mt-2 text-center'>
          AI responses may take a few moments to generate
        </div>
      )}
    </div>
  );
});
