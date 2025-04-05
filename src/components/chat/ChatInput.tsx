'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Smile } from 'lucide-react';
import { useChat } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusTime = useRef(Date.now());
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  // Track if we're currently reapplying focus to avoid loops
  const isReapplyingFocus = useRef(false);
  const { activeConversation, sendMessage, sendAIMessage, loading } = useChat();

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
  };

  const handleBlur = () => {
    // Don't update state if we're in the middle of programmatically reapplying focus
    if (isReapplyingFocus.current) return;

    setIsFocused(false);

    // When the input loses focus, start an interval to check if we should restore focus
    if (!focusIntervalRef.current) {
      const timeSinceLastFocus = Date.now() - lastFocusTime.current;
      // Only start the focus keeper if the user recently focused the input (within 10 seconds)
      if (timeSinceLastFocus < 10000) {
        focusIntervalRef.current = setInterval(() => {
          // Don't try to change focus if we're already doing it
          if (isReapplyingFocus.current) return;

          // Check for Firebase timeout messages in console (correlates with focus loss)
          const shouldRestoreFocus =
            document.activeElement !== inputRef.current;
          if (
            shouldRestoreFocus &&
            inputRef.current &&
            !loading &&
            !isSending
          ) {
            // Flag that we're programmatically reapplying focus
            isReapplyingFocus.current = true;

            // Use requestAnimationFrame to ensure we're not fighting the browser
            requestAnimationFrame(() => {
              if (inputRef.current) {
                console.log('ChatInput: Restoring focus to input');
                inputRef.current.focus();

                // Wait a bit before allowing new focus change detection
                setTimeout(() => {
                  isReapplyingFocus.current = false;
                }, 100);
              } else {
                isReapplyingFocus.current = false;
              }
            });
          }

          // Stop trying after 15 seconds of monitoring
          const timeElapsed = Date.now() - lastFocusTime.current;
          if (timeElapsed > 15000 && focusIntervalRef.current) {
            clearInterval(focusIntervalRef.current);
            focusIntervalRef.current = null;
          }
        }, 100); // Check very frequently
      }
    }
  };

  // Intercept focus events at the document level
  useEffect(() => {
    const handleDocumentFocusIn = (e: Event) => {
      const focusEvent = e as FocusEvent;
      // If we were recently focused and focus is moving to another element
      const timeSinceLastFocus = Date.now() - lastFocusTime.current;
      if (
        timeSinceLastFocus < 5000 &&
        inputRef.current &&
        focusEvent.target !== inputRef.current &&
        isFocused
      ) {
        // Only prevent focus change if it's not explicitly initiated by the user (like a direct click)
        // We can detect this by checking if our manual focus process is ongoing
        if (!isReapplyingFocus.current) {
          e.preventDefault();
          e.stopPropagation();

          // Flag that we're programmatically reapplying focus
          isReapplyingFocus.current = true;

          // Delay slightly to ensure we don't fight with other events
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
            isReapplyingFocus.current = false;
          }, 50);

          return false;
        }
      }
      return true;
    };

    // Add global focus event capture - not fully supported in all browsers but helps in many cases
    document.addEventListener('focusin', handleDocumentFocusIn, {
      capture: true,
    });

    return () => {
      document.removeEventListener('focusin', handleDocumentFocusIn, {
        capture: true,
      });
    };
  }, [isFocused]);

  // Set up mutation observer to detect DOM changes that might steal focus
  useEffect(() => {
    if (
      !mutationObserverRef.current &&
      typeof MutationObserver !== 'undefined'
    ) {
      mutationObserverRef.current = new MutationObserver(() => {
        // If we recently had focus and now a DOM change occurred, check focus
        const timeSinceLastFocus = Date.now() - lastFocusTime.current;
        if (
          timeSinceLastFocus < 5000 &&
          inputRef.current &&
          document.activeElement !== inputRef.current &&
          isFocused &&
          !isReapplyingFocus.current
        ) {
          // Flag that we're programmatically reapplying focus
          isReapplyingFocus.current = true;

          // Small delay to let the DOM settle
          setTimeout(() => {
            if (
              inputRef.current &&
              document.activeElement !== inputRef.current
            ) {
              console.log('ChatInput: Restoring focus after DOM change');
              inputRef.current.focus();
            }
            isReapplyingFocus.current = false;
          }, 50);
        }
      });

      // Observe the chat container for changes
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        mutationObserverRef.current.observe(chatContainer, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }
    }

    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }
    };
  }, [isFocused]);

  // Special effect to handle Firebase loading state changes - the main cause of focus loss
  useEffect(() => {
    if (loading) {
      // When loading starts, remember if we were focused
      if (isFocused) {
        lastFocusTime.current = Date.now(); // Update focus time
      }
    } else {
      // When loading finishes, check if we need to restore focus
      const timeSinceLastFocus = Date.now() - lastFocusTime.current;
      if (
        timeSinceLastFocus < 10000 && // Only if we were recently focused
        inputRef.current &&
        document.activeElement !== inputRef.current &&
        !isReapplyingFocus.current
      ) {
        // Flag that we're programmatically reapplying focus
        isReapplyingFocus.current = true;

        // Use a small delay to let the UI settle
        setTimeout(() => {
          if (inputRef.current) {
            console.log(
              'ChatInput: Restoring focus after loading state change'
            );
            inputRef.current.focus();
            setIsFocused(true);
          }
          isReapplyingFocus.current = false;
        }, 100);
      }
    }
  }, [loading, isFocused]);

  // Clean up all intervals and observers on unmount
  useEffect(() => {
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
              'max-h-32 overflow-y-auto'
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
}
