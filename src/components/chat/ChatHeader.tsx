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
import { useEffect, useState } from 'react';
import {
  getUserById,
  formatUserDisplayName,
  subscribeToUserStatus,
} from '@/lib/firebase/user';
import { User } from '@/types';

export function ChatHeader() {
  const { activeConversation } = useChat();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [otherUserStatus, setOtherUserStatus] = useState<string>('offline');

  // Find the other participant in the conversation
  const otherParticipantId = activeConversation?.participants.find(
    (id) => id !== user?.id
  );

  // Check if this is an AI chat
  const isAIChat = activeConversation?.isAIChat;

  // Fetch other user's details when otherParticipantId changes
  useEffect(() => {
    console.log('Dependencies changed:', { otherParticipantId, isAIChat });
    let isMounted = true;
    let statusUnsubscribe: (() => void) | undefined;

    const fetchUserDetails = async () => {
      if (!otherParticipantId || isAIChat) return;

      try {
        const userData = await getUserById(otherParticipantId);
        if (isMounted) {
          setOtherUser(userData);
          // Initial status
          setOtherUserStatus(userData?.status || 'offline');

          // Set up real-time status listener
          statusUnsubscribe = subscribeToUserStatus(
            otherParticipantId,
            (status) => {
              if (isMounted) {
                console.log(`Status updated: ${status}`);
                setOtherUserStatus(status);
              }
            }
          );
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();

    return () => {
      isMounted = false;
      if (statusUnsubscribe) statusUnsubscribe();
    };
  }, [otherParticipantId, isAIChat]);

  if (!activeConversation) {
    return (
      <div className='h-16 border-b flex items-center px-4'>
        <div className='text-xl font-semibold'>Messages</div>
      </div>
    );
  }

  // Get the display name
  const displayName = isAIChat
    ? 'AI Assistant'
    : otherUser
    ? formatUserDisplayName(otherUser)
    : 'Loading...';

  return (
    <div className='h-16 border-b bg-background flex items-center justify-between px-4'>
      <div className='flex items-center gap-3'>
        <Avatar>
          {isAIChat ? (
            <Bot className='h-5 w-5' />
          ) : (
            <>
              <AvatarImage src={otherUser?.photoURL || ''} alt={displayName} />
              <AvatarFallback>
                {displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div>
          <div className='font-semibold'>{displayName}</div>
          <div className='text-xs text-muted-foreground'>
            {isAIChat
              ? 'AI Powered Assistant'
              : otherUserStatus || 'Loading...'}
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
