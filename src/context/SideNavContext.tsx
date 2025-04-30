'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User, Conversation } from '@/types';
import { useChat } from '@/hooks/useChat';
import { useParticipantData } from '@/hooks/useParticipantData';
import { useAuth } from '@/hooks';

// Define the context type
interface SideNavContextType {
  // UI States
  isCreatingAIChat: boolean;
  showUserSearch: boolean;
  setShowUserSearch: (show: boolean) => void;
  loading: boolean;
  forceShowEmpty: boolean;

  // Data
  conversations: Conversation[];
  activeConversation: Conversation | null;
  participantUsers: Map<string, User>;

  // Handlers
  handleConversationClick: (id: string, onItemClick?: () => void) => void;
  handleNewChat: () => void;
  handleNewAiChat: (onItemClick?: () => void) => Promise<void>;
  handleSelectUser: (
    selectedUser: User,
    onItemClick?: () => void
  ) => Promise<void>;

  // Utility functions
  getConversationName: (conversation: Conversation) => string;
  getOtherParticipant: (participants: string[]) => string | null;
  getInitials: (name: string) => string;
}

// Create the context with a default value
const SideNavContext = createContext<SideNavContextType | undefined>(undefined);

// Provider component
export const SideNavProvider = ({ children }: { children: ReactNode }) => {
  // Get the authenticated user
  const { user } = useAuth();

  // Get global chat data from Zustand (via useChat)
  const {
    conversations,
    activeConversation,
    loading: chatLoading,
    setActiveConversation,
    createNewConversation,
  } = useChat();

  // Local UI state
  const [isCreatingAIChat, setIsCreatingAIChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [forceShowEmpty, setForceShowEmpty] = useState(false);

  // Participant data (might still need this hook for data fetching)
  const {
    participantUsers,
    getOtherParticipant,
    getParticipantDisplayName,
    getInitials,
  } = useParticipantData(conversations, user?.id);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (chatLoading && conversations.length === 0) {
      // After 5 seconds of loading with no conversations, show empty state
      timeoutId = setTimeout(() => {
        setForceShowEmpty(true);
      }, 5000);
    } else {
      // Reset when either loading finishes or conversations exist
      setForceShowEmpty(false);
    }

    // Clean up timeout if component unmounts or dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chatLoading, conversations.length]);

  // Handle conversation selection
  const handleConversationClick = useCallback(
    (conversationId: string, onItemClick?: () => void) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setActiveConversation(conversation);
        if (onItemClick) onItemClick();
      }
    },
    [conversations, setActiveConversation]
  );

  // Handle creating a new chat
  const handleNewChat = useCallback(() => {
    setShowUserSearch(true);
  }, []);

  // Handle selecting a user for a new chat
  const handleSelectUser = useCallback(
    async (selectedUser: User, onItemClick?: () => void) => {
      if (!user?.id) return;

      try {
        const conversation = await createNewConversation(
          [user.id, selectedUser.id],
          false
        );
        setActiveConversation(conversation);
        setShowUserSearch(false);
        if (onItemClick) onItemClick();
      } catch (error) {
        console.error('Error creating new conversation:', error);
      }
    },
    [user, createNewConversation, setActiveConversation]
  );

  // Handle creating an AI chat
  const handleNewAiChat = useCallback(
    async (onItemClick?: () => void) => {
      if (!user?.id) return;

      setIsCreatingAIChat(true);
      try {
        const aiUserId = 'ai-assistant';

        // Check for existing AI conversation
        const existingAiChat = conversations.find(
          (conv) =>
            conv.isAIChat &&
            conv.participants.includes(user.id) &&
            conv.participants.includes(aiUserId)
        );

        let conversation;
        if (existingAiChat) {
          conversation = existingAiChat;
        } else {
          conversation = await createNewConversation([user.id, aiUserId], true);

          // Add welcome message logic here if needed
          // This would typically call sendMessage from your chat API
        }

        setActiveConversation(conversation);
        if (onItemClick) onItemClick();
      } catch (error) {
        console.error('Error creating AI chat:', error);
      } finally {
        setIsCreatingAIChat(false);
      }
    },
    [user, conversations, createNewConversation, setActiveConversation]
  );

  // Helper function to get conversation display name
  const getConversationName = useCallback(
    (conversation: Conversation): string => {
      const otherParticipantId = getOtherParticipant(conversation.participants);
      return getParticipantDisplayName(otherParticipantId);
    },
    [getOtherParticipant, getParticipantDisplayName]
  );

  return (
    <SideNavContext.Provider
      value={{
        // States
        isCreatingAIChat,
        showUserSearch,
        setShowUserSearch,
        loading: chatLoading,
        forceShowEmpty,

        // Data
        conversations,
        activeConversation,
        participantUsers,

        // Handlers
        handleConversationClick,
        handleNewChat,
        handleNewAiChat,
        handleSelectUser,

        // Utility functions
        getConversationName,
        getOtherParticipant,
        getInitials,
      }}
    >
      {children}
    </SideNavContext.Provider>
  );
};

// Custom hook to use the context
export const useSideNav = () => {
  const context = useContext(SideNavContext);
  if (context === undefined) {
    throw new Error('useSideNav must be used within a SideNavProvider');
  }
  return context;
};
