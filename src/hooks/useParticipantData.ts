import { useState, useEffect } from 'react';
import { formatUserDisplayName } from '@/lib/firebase/user';
import { Conversation, User } from '@/types';

export function useParticipantData(
  conversations: Conversation[],
  currentUserId?: string
) {
  const [participantUsers, setParticipantUsers] = useState<Map<string, User>>(
    new Map()
  );

  // Fetch user data for conversation participants
  useEffect(() => {
    const fetchParticipantUsers = async () => {
      if (!conversations.length) return;

      try {
        // Collect all participant IDs
        const participantIds = new Set<string>();

        conversations.forEach((conversation) => {
          conversation.participants.forEach((id) => {
            if (id !== 'ai-assistant' && id !== currentUserId) {
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
  }, [conversations, currentUserId]);

  // Preload user data on mount
  useEffect(() => {
    const preloadUserData = async () => {
      try {
        // Check localStorage first
        if (
          typeof window !== 'undefined' &&
          localStorage.getItem('userCache')
        ) {
          console.log('User data already preloaded from localStorage');
          return;
        }

        if (currentUserId) {
          console.log('Preloading user data in background');
          const { getUsersByIds } = await import('@/lib/firebase/user');
          const { collection, query, orderBy, limit, getDocs } = await import(
            'firebase/firestore'
          );
          const { db } = await import('@/lib/firebase/config');

          // Get recent users
          try {
            const usersRef = collection(db, 'users');
            const recentUsersQuery = query(
              usersRef,
              orderBy('updatedAt', 'desc'),
              limit(20)
            );
            const snapshot = await getDocs(recentUsersQuery);
            const userIds = snapshot.docs.map((doc) => doc.id);

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
  }, [currentUserId]);

  const getOtherParticipant = (participantIds: string[]) => {
    if (!currentUserId) return null;
    return participantIds.find((id) => id !== currentUserId) || null;
  };

  const getParticipantDisplayName = (userId: string | null): string => {
    if (!userId) return 'Unknown User';

    const cachedUser = participantUsers.get(userId);
    if (cachedUser) {
      return formatUserDisplayName(cachedUser);
    }

    if (userId === 'ai-assistant') {
      return 'AI Assistant';
    }

    return userId;
  };

  const getInitials = (name: string = 'User') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return {
    participantUsers,
    getOtherParticipant,
    getParticipantDisplayName,
    getInitials,
  };
}
