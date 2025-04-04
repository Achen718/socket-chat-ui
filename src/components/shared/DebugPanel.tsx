'use client';

import { useState } from 'react';
import { useChatStore, useAuthStore } from '@/store';
import { setupAuthPersistence } from '@/lib/firebase/auth';

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);

  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);
  const initAuthListener = useAuthStore((state) => state.initAuthListener);

  const chatState = useChatStore();
  const { conversations, activeConversation, messages, loading, error } =
    chatState;

  // Get current time when rendering - no need for state updates
  const currentTime = new Date().toLocaleTimeString();

  // Function to manually refresh auth state
  const handleRefreshAuth = () => {
    // Prevent triggering infinite loops with a timestamp check
    const lastRefreshKey = 'last_auth_refresh';
    const now = Date.now();
    const lastRefresh = parseInt(
      localStorage.getItem(lastRefreshKey) || '0',
      10
    );

    // Only allow refresh every 5 seconds
    if (now - lastRefresh < 5000) {
      console.log(
        'Auth refresh throttled. Please wait a few seconds before trying again.'
      );
      return;
    }

    // Store the refresh timestamp
    localStorage.setItem(lastRefreshKey, now.toString());

    console.log(
      'Manual auth refresh requested at',
      new Date().toLocaleTimeString()
    );
    setupAuthPersistence()
      .then(() => {
        // Create a fresh listener which will replace the existing one
        initAuthListener();

        // We don't need to store the unsubscribe since the hook handles cleanup
        console.log('Manual auth refresh completed');
      })
      .catch((err) => {
        console.error('Error during manual auth refresh:', err);
      });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className='fixed right-4 bottom-4 bg-gray-800 text-white p-2 rounded z-50 text-xs'
      >
        Debug
      </button>
    );
  }

  return (
    <div className='fixed right-4 bottom-4 bg-gray-800 text-white p-4 rounded max-w-sm z-50 text-xs overflow-auto max-h-80'>
      <div className='flex justify-between mb-2'>
        <h3 className='font-bold'>Debug Info</h3>
        <button
          onClick={() => setIsVisible(false)}
          className='text-gray-400 hover:text-white'
        >
          Close
        </button>
      </div>

      <div className='mb-2'>
        <div>Last Update: {currentTime}</div>
        <div className='flex justify-between'>
          <span>
            User: {user ? user.id.substring(0, 6) + '...' : 'Not logged in'}
          </span>
          {user && <span className='text-green-400'>✓ Authenticated</span>}
        </div>
        <div className={authLoading ? 'text-yellow-400 font-bold' : ''}>
          Auth Loading: {authLoading ? 'TRUE' : 'false'}
        </div>
        {authError && (
          <div className='text-red-400'>Auth Error: {authError}</div>
        )}
        <div className={loading ? 'text-yellow-400 font-bold' : ''}>
          Chat Loading: {loading ? 'TRUE' : 'false'}
        </div>
        {error && <div className='text-red-400'>Chat Error: {error}</div>}
      </div>

      <div className='mb-2'>
        <div>Conversations: {conversations.length}</div>
        <div>Active Conv: {activeConversation?.id || 'none'}</div>
        <div>Messages: {messages.length}</div>
      </div>

      {user && (
        <div className='mb-2'>
          <h4 className='font-bold mt-2'>User Details:</h4>
          <div>Email: {user.email}</div>
          <div>Name: {user.displayName}</div>
          <div>Status: {user.status}</div>
        </div>
      )}

      {conversations.length > 0 && (
        <div>
          <h4 className='font-bold mt-2'>Conversations:</h4>
          <ul className='pl-4'>
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={
                  activeConversation?.id === conv.id ? 'text-green-400' : ''
                }
              >
                {conv.id.substring(0, 6)}... ({conv.participants.length} users)
                {conv.isAIChat ? ' (AI)' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className='mt-4 flex gap-2'>
        <button
          onClick={() => {
            useChatStore.setState((state) => ({ ...state, loading: false }));
          }}
          className='bg-red-600 text-white px-2 py-1 rounded text-xs'
        >
          Reset Chat Loading
        </button>
        <button
          onClick={handleRefreshAuth}
          className='bg-blue-600 text-white px-2 py-1 rounded text-xs'
        >
          Refresh Auth
        </button>
      </div>
    </div>
  );
}
