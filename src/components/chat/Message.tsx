'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, Bot } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types';
import { useAuth } from '@/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageProps {
  message: MessageType;
  isLastMessage?: boolean;
}

export function Message({ message, isLastMessage = false }: MessageProps) {
  const { user } = useAuth();
  const [showTime, setShowTime] = useState(false);

  const isSentByCurrentUser = user?.id === message.sender;
  const isAI = message.isAI;

  // Format message timestamp with validation to prevent invalid date errors
  const formattedTime = (() => {
    try {
      // First, ensure we have a timestamp
      if (!message.timestamp) return '';

      // Parse the timestamp
      const timestamp =
        typeof message.timestamp === 'string'
          ? new Date(message.timestamp)
          : message.timestamp;

      // Validate the date is valid
      if (isNaN(timestamp.getTime())) {
        console.warn(
          `Invalid timestamp in message ${message.id}:`,
          message.timestamp
        );
        return 'Recently';
      }

      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error, message);
      return 'Recently';
    }
  })();

  // Get status icon based on message status
  const getStatusIcon = () => {
    if (isSentByCurrentUser) {
      switch (message.status) {
        case 'sent':
          return <Check className='h-3 w-3 text-muted-foreground' />;
        case 'delivered':
          return <CheckCheck className='h-3 w-3 text-muted-foreground' />;
        case 'read':
          return <CheckCheck className='h-3 w-3 text-primary' />;
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 py-2',
        isSentByCurrentUser && 'justify-end'
      )}
      onClick={() => setShowTime(!showTime)}
    >
      {!isSentByCurrentUser && (
        <Avatar className='h-8 w-8'>
          {isAI ? (
            <Bot className='h-5 w-5' />
          ) : (
            <>
              <AvatarImage src={user?.photoURL || ''} alt='User' />
              <AvatarFallback>A</AvatarFallback>
            </>
          )}
        </Avatar>
      )}

      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%] text-sm',
          isSentByCurrentUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className='break-words'>
          <MarkdownContent content={message.content} isAI={isAI} />
        </div>

        <div
          className={cn(
            'flex items-center mt-1 text-xs opacity-0 transition-opacity',
            (showTime || isLastMessage) && 'opacity-70 group-hover:opacity-100'
          )}
        >
          <span className='mr-1'>{formattedTime}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
}
