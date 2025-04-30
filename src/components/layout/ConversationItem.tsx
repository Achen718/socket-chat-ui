'use client';

import { Conversation, User } from '@/types';
import { Button } from '@/components/ui/button';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId?: string;
  participantUsers: Map<string, User>;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  participantUsers,
  onClick,
}: ConversationItemProps) {
  // Localized name logic
  const getConversationName = () => {
    // AI chat handling
    if (conversation.isAIChat) {
      return 'AI Assistant';
    }

    // Find other participant
    const otherParticipantId = conversation.participants.find(
      (id) => id !== currentUserId
    );

    if (otherParticipantId) {
      const participant = participantUsers.get(otherParticipantId);
      return participant?.displayName || 'Unknown User';
    }

    return 'Chat';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = getConversationName();

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className='w-full justify-start gap-2 h-auto py-2 px-3'
      onClick={onClick}
    >
      <div className='flex items-center gap-2 w-full'>
        <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs'>
          {getInitials(displayName)}
        </div>

        <div className='flex-1 truncate'>
          <p className='truncate'>{displayName}</p>
          <p className='text-xs text-muted-foreground truncate'>
            {conversation.lastMessage?.content || 'No messages yet'}
          </p>
        </div>
      </div>
    </Button>
  );
}
