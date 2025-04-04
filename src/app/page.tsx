'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks';

export default function HomePage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        redirect('/chat');
      } else {
        redirect('/auth/login');
      }
    }
  }, [user, loading]);

  return (
    <div className='h-screen flex items-center justify-center'>
      <div className='text-center'>
        <div className='text-lg font-medium'>Loading...</div>
        <div className='text-sm text-muted-foreground'>
          Please wait while we redirect you
        </div>
      </div>
    </div>
  );
}
