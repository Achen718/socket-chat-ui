'use client';

import { useAuth } from '@/hooks';
import { useSideNav } from '@/context/SideNavContext';
import { Separator } from '@/components/ui/separator';
import { SideNavHeader } from '@/components/layout/SideNavHeader';
import { ConversationList } from '@/components/layout/ConversationList';
import { UserSearchDialog } from '@/components/user/UserSearchDialog';

interface SideNavProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export function SideNav({ isMobile = false, onItemClick }: SideNavProps) {
  const { user } = useAuth();
  const {
    // Extract everything we need from the context
    conversations,
    activeConversation,
    loading,
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
          loading={loading}
          forceShowEmpty={forceShowEmpty}
          currentUserId={user?.id}
          participantUsers={participantUsers}
          onConversationClick={(id) => handleConversationClick(id, onItemClick)}
          getParticipantDisplayName={getConversationName}
          getOtherParticipant={getOtherParticipant}
          getInitials={getInitials}
        />
      </div>

      {/* User Search Dialog */}
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
