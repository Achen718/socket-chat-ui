'use client';

import { MoreVertical, Phone, Video, Info, Bot } from 'lucide-react';
import { useChat } from '@/hooks';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ChatHeader() {
  const { activeConversation } = useChat();
  const { user } = useAuth();

  if (!activeConversation) {
    return (
      <div className='h-16 border-b flex items-center px-4'>
        <div className='text-xl font-semibold'>Messages</div>
      </div>
    );
  }

  // Find the other participant in the conversation
  const otherParticipantId = activeConversation.participants.find(
    (id) => id !== user?.id
  );

  // Check if this is an AI chat
  const isAIChat = activeConversation.isAIChat;

  // Get the display name (in a real app you would fetch this from the user's profile)
  const displayName = isAIChat ? 'AI Assistant' : otherParticipantId || 'User';

  return (
    <div className='h-16 border-b bg-background flex items-center justify-between px-4'>
      <div className='flex items-center gap-3'>
        <Avatar>
          {isAIChat ? (
            <Bot className='h-5 w-5' />
          ) : (
            <>
              <AvatarImage src='' alt={displayName} />
              <AvatarFallback>
                {displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div>
          <div className='font-semibold'>{displayName}</div>
          <div className='text-xs text-muted-foreground'>
            {isAIChat ? 'AI Powered Assistant' : 'Online'}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-1'>
        {!isAIChat && (
          <>
            <Button size='icon' variant='ghost' className='rounded-full'>
              <Phone className='h-5 w-5' />
              <span className='sr-only'>Call</span>
            </Button>

            <Button size='icon' variant='ghost' className='rounded-full'>
              <Video className='h-5 w-5' />
              <span className='sr-only'>Video call</span>
            </Button>
          </>
        )}

        <Button size='icon' variant='ghost' className='rounded-full'>
          <Info className='h-5 w-5' />
          <span className='sr-only'>Information</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='ghost' className='rounded-full'>
              <MoreVertical className='h-5 w-5' />
              <span className='sr-only'>More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem>View profile</DropdownMenuItem>
            <DropdownMenuItem>Search in conversation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-destructive focus:text-destructive'>
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
