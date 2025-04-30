'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Bot } from 'lucide-react';
import { useAuth, useChat } from '@/hooks';
import { sendMessage as sendFirestoreMessage } from '@/lib/firebase/chat';
import { formatUserDisplayName } from '@/lib/firebase/user';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserSearchDialog } from '@/components/user/UserSearchDialog';
import { User } from '@/types';

interface SideNavProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export function SideNav({ isMobile = false, onItemClick }: SideNavProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    loading,
    fetchConversations,
    createNewConversation,
  } = useChat();

  const [isCreatingAIChat, setIsCreatingAIChat] = useState(false);
  const [forceShowEmpty, setForceShowEmpty] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [participantUsers, setParticipantUsers] = useState<Map<string, User>>(
    new Map()
  );

  // Add a ref to track if we've already fetched conversations for this user
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading && conversations.length === 0) {
      timeoutId = setTimeout(() => {
        setForceShowEmpty(true);
      }, 5000);
    } else {
      setForceShowEmpty(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, conversations.length]);

  // Only fetch conversations once per user
  useEffect(() => {
    if (user && user.id && fetchedForUser.current !== user.id) {
      console.log(
        `SideNav: Fetching conversations for user ${user.id} (first time)`
      );
      fetchedForUser.current = user.id;
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Reset fetched flag when user changes
  useEffect(() => {
    if (!user) {
      fetchedForUser.current = null;
    }
  }, [user]);

  // Preload user data on mount
  useEffect(() => {
    const preloadUserData = async () => {
      try {
        // Check localStorage first to see if we already have data
        if (
          typeof window !== 'undefined' &&
          localStorage.getItem('userCache')
        ) {
          console.log('User data already preloaded from localStorage');
          return;
        }

        // This will trigger a background fetch of all users
        if (user && user.id) {
          console.log('Preloading user data in background');

          // Import function dynamically to avoid circular dependencies
          const { getUsersByIds } = await import('@/lib/firebase/user');

          // Get a list of most recent users from the Firestore "users" collection
          // This ensures we have display names ready for common contacts
          try {
            const { collection, query, orderBy, limit, getDocs } = await import(
              'firebase/firestore'
            );
            const usersRef = collection(db, 'users');
            const recentUsersQuery = query(
              usersRef,
              orderBy('updatedAt', 'desc'),
              limit(20)
            );
            const snapshot = await getDocs(recentUsersQuery);

            // Get IDs of users to preload
            const userIds = snapshot.docs.map((doc) => doc.id);

            // Fetch all user data (will be cached internally)
            if (userIds.length > 0) {
              await getUsersByIds(userIds);
              console.log(`Preloaded data for ${userIds.length} users`);
            }
          } catch (error) {
            console.error('Error preloading user data:', error);
          }
        }
      } catch (error) {
        console.error('Error in preloadUserData:', error);
      }
    };

    preloadUserData();
  }, [user?.id]);

  // Add effect to refresh conversations periodically to ensure side nav is up to dat

  // Fetch user data for conversation participants
  useEffect(() => {
    const fetchParticipantUsers = async () => {
      if (!conversations.length) return;

      try {
        // Collect all participant IDs
        const participantIds = new Set<string>();

        conversations.forEach((conversation) => {
          // Skip AI participants
          conversation.participants.forEach((id) => {
            if (id !== 'ai-assistant' && id !== user?.id) {
              participantIds.add(id);
            }
          });
        });

        // Convert to array and fetch
        if (participantIds.size > 0) {
          const { getUsersByIds } = await import('@/lib/firebase/user');
          const users = await getUsersByIds(Array.from(participantIds));
          setParticipantUsers(users);
        }
      } catch (error) {
        console.error('Error fetching participant user data:', error);
      }
    };

    fetchParticipantUsers();
  }, [conversations, user?.id]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  const getInitials = (name: string = 'User') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getOtherParticipant = (participantIds: string[]) => {
    if (!user) return null;
    return participantIds.find((id) => id !== user.id) || null;
  };

  // Get a display name for a user ID
  const getParticipantDisplayName = (userId: string | null): string => {
    if (!userId) return 'Unknown User';

    // Return from cache if available
    const cachedUser = participantUsers.get(userId);
    if (cachedUser) {
      return formatUserDisplayName(cachedUser);
    }

    // For AI assistant
    if (userId === 'ai-assistant') {
      return 'AI Assistant';
    }

    // Return the userId as a fallback while we're fetching the user data
    return userId;
  };

  const handleConversationClick = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      if (onItemClick) onItemClick();
    }
  };

  const handleNewChat = () => {
    // Show user search dialog instead of creating an AI chat
    setShowUserSearch(true);
  };

  const handleSelectUser = async (selectedUser: User) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const conversation = await createNewConversation(
        [user.id, selectedUser.id],
        false // Not an AI chat
      );

      setActiveConversation(conversation);
      if (onItemClick) onItemClick();

      // Close the dialog
      setShowUserSearch(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleNewAiChat = async () => {
    if (!user) {
      console.error('Cannot create AI chat: No user is logged in');
      return;
    }

    // Set loading state
    setIsCreatingAIChat(true);
    const startTime = performance.now();

    try {
      const aiUserId = 'ai-assistant';

      // First, look for an existing AI conversation
      const existingAiChat = conversations.find(
        (conv) =>
          conv.isAIChat &&
          conv.participants.includes(user.id) &&
          conv.participants.includes(aiUserId)
      );

      let conversation;
      let isNewConversation = false;

      if (existingAiChat) {
        // Use existing conversation
        console.log(`Using existing AI conversation: ${existingAiChat.id}`);
        conversation = existingAiChat;
      } else {
        // Create new conversation only if one doesn't exist
        console.log('Creating new AI conversation...');
        conversation = await createNewConversation([user.id, aiUserId], true);
        console.log(`AI conversation created with ID: ${conversation.id}`);
        isNewConversation = true;

        // Add a small delay to make sure the conversation is fully created
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Set active conversation - do this early so we can access messages
      setActiveConversation(conversation);

      // Only send a welcome message if this is a new conversation OR
      // if the conversation exists but has no messages
      if (isNewConversation || !conversation.lastMessage) {
        // First check if there are any existing messages
        try {
          const { getConversationMessages } = await import(
            '@/lib/firebase/chat'
          );
          const existingMessages = await getConversationMessages(
            conversation.id
          );

          // Only send welcome message if there are no existing messages
          if (existingMessages.length === 0) {
            console.log(
              'No existing messages found, adding AI welcome message...'
            );

            // Manually trigger a welcome message from the AI
            const welcomeMessage =
              "Hello! I'm your AI assistant. How can I help you today?";

            try {
              await sendFirestoreMessage(
                conversation.id,
                aiUserId,
                welcomeMessage,
                true // Mark as AI message
              );
              console.log('AI welcome message added successfully');

              // Force a refresh of messages
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (msgError) {
              console.error('Error adding welcome message:', msgError);
            }
          } else {
            console.log(
              `Found ${existingMessages.length} existing messages, skipping welcome message`
            );
          }
        } catch (checkError) {
          console.error('Error checking for existing messages:', checkError);
        }
      }

      if (onItemClick) {
        onItemClick();
      }
    } catch (error) {
      const endTime = performance.now();
      console.error(
        `Error handling AI conversation (${(endTime - startTime).toFixed(
          2
        )}ms):`,
        error
      );

      // Log detailed error
      if (error instanceof Error) {
        console.error({
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
    } finally {
      // Reset loading state
      setIsCreatingAIChat(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col h-full bg-background border-r ${
          isMobile ? 'w-full' : 'w-64'
        }`}
      >
        <div className='p-4'>
          <Button
            variant='default'
            className='w-full justify-start gap-2'
            onClick={handleNewChat}
          >
            <Plus className='h-4 w-4' />
            New Chat
          </Button>

          <Button
            variant='outline'
            className='w-full justify-start gap-2 mt-2'
            onClick={handleNewAiChat}
            disabled={isCreatingAIChat}
          >
            {isCreatingAIChat ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                Creating...
              </>
            ) : (
              <>
                <Bot className='h-4 w-4' />
                Chat with AI
              </>
            )}
          </Button>
        </div>

        <Separator />

        <div className='flex-1 overflow-auto py-2'>
          <div className='px-3 py-2'>
            <h2 className='text-sm font-semibold'>Recent Chats</h2>
          </div>

          {loading && conversations.length === 0 && !forceShowEmpty ? (
            <div className='space-y-2 px-4'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : (
            <div className='space-y-1 px-1'>
              {sortedConversations.length === 0 ? (
                <div className='px-4 py-2 text-sm text-muted-foreground'>
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                sortedConversations.map((conversation) => {
                  const isActive = activeConversation?.id === conversation.id;
                  const isAI = conversation.isAIChat;
                  const otherParticipantId = getOtherParticipant(
                    conversation.participants
                  );

                  // Check if we're still loading this participant's data
                  const isParticipantLoading =
                    !isAI &&
                    otherParticipantId &&
                    !participantUsers.has(otherParticipantId) &&
                    otherParticipantId !== 'ai-assistant';

                  // Use the participant display name function to get a user-friendly name
                  const otherParticipantName = isAI
                    ? 'AI Assistant'
                    : getParticipantDisplayName(otherParticipantId);

                  // Get the formatted message text
                  const lastMessageText = conversation.lastMessage
                    ? conversation.lastMessage.content
                    : 'No messages yet';

                  return (
                    <Button
                      key={conversation.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className='w-full justify-start gap-2 h-auto py-2 px-3'
                      onClick={() => handleConversationClick(conversation.id)}
                    >
                      <Avatar className='h-6 w-6'>
                        {isAI ? (
                          <Bot className='h-4 w-4' />
                        ) : (
                          <>
                            <AvatarImage src='' alt={otherParticipantName} />
                            <AvatarFallback>
                              {getInitials(otherParticipantName)}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className='flex flex-col items-start flex-1 truncate'>
                        {isParticipantLoading ? (
                          <Skeleton className='h-4 w-24 my-0.5' />
                        ) : (
                          <span className='text-sm font-medium truncate w-full'>
                            {otherParticipantName}
                          </span>
                        )}
                        <span className='text-xs text-muted-foreground truncate w-full'>
                          {lastMessageText.substring(0, 30)}
                          {lastMessageText.length > 30 ? '...' : ''}
                        </span>
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Search Dialog */}
      {user && (
        <UserSearchDialog
          open={showUserSearch}
          onOpenChange={setShowUserSearch}
          onSelectUser={handleSelectUser}
          currentUserId={user.id}
        />
      )}
    </>
  );
}
