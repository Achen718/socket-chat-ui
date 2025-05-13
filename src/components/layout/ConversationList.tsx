import { Conversation, User } from '@/types';
import { Button } from '@/components/ui/button';
import MarkdownContent from '../shared/MarkdownContent';
import { Bot } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  conversationsLoading: boolean;
  forceShowEmpty: boolean;
  currentUserId?: string;
  participantUsers: Map<string, User>;
  onConversationClick: (id: string) => void;
  getParticipantDisplayName: (conversation: Conversation) => string;
  getOtherParticipant: (participants: string[]) => string | null;
  getInitials: (name: string) => string;
}

export function ConversationList({
  conversations,
  activeConversation,
  conversationsLoading,
  forceShowEmpty,
  onConversationClick,
  getParticipantDisplayName,
  getInitials,
}: ConversationListProps) {
  return (
    <div className='flex-1 overflow-auto py-2'>
      <div className='px-3 py-2'>
        <h2 className='text-sm font-semibold'>Recent Chats</h2>
      </div>

      {conversationsLoading && (
        <div className='p-4 text-center'>
          <p className='text-sm text-muted-foreground'>
            Loading conversations...
          </p>
        </div>
      )}

      {!conversationsLoading &&
        (conversations.length === 0 || forceShowEmpty) && (
          <div className='p-4 text-center'>
            <p className='text-sm text-muted-foreground'>
              No conversations yet
            </p>
          </div>
        )}

      {!conversationsLoading && conversations.length > 0 && !forceShowEmpty && (
        <div className='space-y-1 px-1'>
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant={
                activeConversation?.id === conversation.id
                  ? 'secondary'
                  : 'ghost'
              }
              className='w-full justify-start gap-2 h-auto py-2 px-3'
              onClick={() => onConversationClick(conversation.id)}
            >
              {/* Render conversation item content here */}
              <div className='flex items-center gap-2 w-full'>
                {/* Avatar or initials */}
                <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs'>
                  {getParticipantDisplayName(conversation) ===
                  'AI Assistant' ? (
                    <Bot className='h-5 w-5' />
                  ) : (
                    // Display initials of the participants
                    getInitials(getParticipantDisplayName(conversation))
                  )}
                </div>

                {/* Name and last message */}
                <div className='flex-1 truncate'>
                  <p className='truncate'>
                    {getParticipantDisplayName(conversation)}
                  </p>
                  <span className='text-xs text-muted-foreground truncate'>
                    <MarkdownContent
                      content={
                        conversation.lastMessage?.content || 'No messages yet'
                      }
                      isAI={conversation.isAIChat}
                    />
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
