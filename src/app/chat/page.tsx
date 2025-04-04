'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle initial load and auth state
  useEffect(() => {
    // Set a small timeout to allow for smoother transitions
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 500);

    // If we're not authenticated after loading completes, redirect to login
    if (!authLoading && !user) {
      router.push('/login');
    }

    return () => clearTimeout(timer);
  }, [authLoading, user, router]);

  // For debugging - log auth state changes
  useEffect(() => {
    console.log(
      `ChatPage: Auth state - user: ${!!user}, loading: ${authLoading}, initialLoad: ${isInitialLoad}`
    );
  }, [user, authLoading, isInitialLoad]);

  // Show ChatContainer immediately if authenticated and initial load complete
  if (user && !isInitialLoad) {
    return <ChatContainer />;
  }

  // Show appropriate loading message
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900'>
      <LoadingSpinner size='large' />
      <h2 className='mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300'>
        {authLoading ? 'Checking authentication...' : 'Preparing your chats...'}
      </h2>
    </div>
  );
}
