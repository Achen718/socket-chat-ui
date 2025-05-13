'use client';

import { useAuth } from '@/hooks/useAuth';
import { useSideNav } from '@/context/SideNavContext';
import { ConversationList } from './ConversationList';
import { Separator } from '@/components/ui/separator';
import { SideNavHeader } from './SideNavHeader';
import { UserSearchDialog } from '../user/UserSearchDialog';

interface SideNavProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export function SideNav({ isMobile = false, onItemClick }: SideNavProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationsLoading,
    forceShowEmpty,
    participantUsers,
    isCreatingAIChat,
    showUserSearch,
    setShowUserSearch,
    handleConversationClick,
    handleNewChat,
    handleNewAiChat,
    handleSelectUser,
    getConversationName,
    getOtherParticipant,
    getInitials,
  } = useSideNav();

  const handleConversationClickWrapper = (id: string) => {
    handleConversationClick(id);
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <>
      <div
        className={`flex flex-col h-full bg-background border-r ${
          isMobile ? 'w-full' : 'w-64'
        }`}
      >
        <SideNavHeader
          onNewChat={handleNewChat}
          onNewAiChat={() => handleNewAiChat(onItemClick)}
          isCreatingAIChat={isCreatingAIChat}
        />
        <Separator />
        <ConversationList
          conversations={conversations}
          activeConversation={activeConversation}
          conversationsLoading={conversationsLoading} // Changed from loading to conversationsLoading
          forceShowEmpty={forceShowEmpty}
          currentUserId={user?.id}
          participantUsers={participantUsers}
          onConversationClick={handleConversationClickWrapper}
          getParticipantDisplayName={getConversationName}
          getOtherParticipant={getOtherParticipant}
          getInitials={getInitials}
        />
      </div>

      {user && (
        <UserSearchDialog
          open={showUserSearch}
          onOpenChange={setShowUserSearch}
          onSelectUser={(selectedUser) =>
            handleSelectUser(selectedUser, onItemClick)
          }
          currentUserId={user.id}
        />
      )}
    </>
  );
}
