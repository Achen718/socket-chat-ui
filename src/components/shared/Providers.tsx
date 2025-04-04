'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useSocket } from '@/hooks';
import { ErrorLogger } from './ErrorLogger';
import { DebugPanel } from './DebugPanel';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const initAuthListener = useAuthStore((state) => state.initAuthListener);

  // Initialize the Socket hook to set up socket connection when authenticated
  useSocket();

  // Initialize authentication listener on mount
  useEffect(() => {
    const unsubscribe = initAuthListener();

    return () => {
      unsubscribe();
    };
  }, [initAuthListener]);

  return (
    <>
      <ErrorLogger />
      <DebugPanel />
      {children}
    </>
  );
}
