'use client';

import { useEffect } from 'react';
import { useAuthStore, useSocketStore } from '@/store';
import { ErrorLogger } from '@/components/shared/ErrorLogger';
import { DebugPanel } from '@/components/shared/DebugPanel';
import { ThemeProvider } from './ThemeProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const initAuthListener = useAuthStore((state) => state.initAuthListener);
  const user = useAuthStore((state) => state.user);
  const connect = useSocketStore((state) => state.connect);
  const disconnect = useSocketStore((state) => state.disconnect);

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => {
      unsubscribe();
    };
  }, [initAuthListener]);

  useEffect(() => {
    if (user) {
      connect(user);
    } else {
      disconnect();
    }
  }, [user, connect, disconnect]);

  return (
    <ThemeProvider>
      <ErrorLogger />
      {process.env.NODE_ENV === 'development' && <DebugPanel />}
      {children}
    </ThemeProvider>
  );
}
