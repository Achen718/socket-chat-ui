import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { setupAuthPersistence } from '@/lib/firebase/auth';
import { User } from '@/types';
import { setupPresence } from '@/lib/firebase/user';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const initAuthListener = useAuthStore((state) => state.initAuthListener);
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const logout = useAuthStore((state) => state.logout);

  // Use a ref to track if the auth listener has been initialized
  const authListenerInitialized = useRef(false);
  const authListenerCleanup = useRef<(() => void) | null>(null);
  const presenceCleanup = useRef<(() => void) | null>(null);

  // Initialize auth listener on mount
  useEffect(() => {
    // Only set up the listener once
    if (authListenerInitialized.current) {
      console.log('🔑 Auth Hook: Auth listener already initialized, skipping');
      return;
    }

    console.log('🔑 Auth Hook: Setting up auth persistence and listener');
    authListenerInitialized.current = true;

    // Ensure persistence is set first
    setupAuthPersistence().then(() => {
      // Then initialize auth listener
      try {
        const unsubscribe = initAuthListener();
        authListenerCleanup.current = unsubscribe;
      } catch (error) {
        console.error('🔑 Auth Hook: Error initializing auth listener', error);
      }
    });

    // Cleanup function
    return () => {
      console.log('🔑 Auth Hook: Cleaning up auth listener');
      if (authListenerCleanup.current) {
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }

      // Also clean up presence
      if (presenceCleanup.current) {
        presenceCleanup.current();
        presenceCleanup.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Set up presence tracking when user changes
  useEffect(() => {
    // Clean up previous presence tracking
    if (presenceCleanup.current) {
      presenceCleanup.current();
      presenceCleanup.current = null;
    }

    // Set up new presence tracking if user is logged in
    if (user?.id) {
      console.log('👤 Auth Hook: Setting up presence tracking for', user.id);
      presenceCleanup.current = setupPresence(user.id);
    }

    return () => {
      if (presenceCleanup.current) {
        presenceCleanup.current();
        presenceCleanup.current = null;
      }
    };
  }, [user?.id]); // Re-run when user ID changes

  // Handle redirects based on auth state
  useEffect(() => {
    // Skip if still loading
    if (loading) {
      console.log('🔑 Auth Hook: Still loading, skipping redirect check');
      return;
    }

    const isLoginPage =
      pathname === '/auth/login' ||
      pathname === '/auth/signup' ||
      pathname === '/auth/register';
    const isAuthRequired = pathname !== '/' && !isLoginPage;

    console.log(
      `🔑 Auth Hook: Checking redirects - user: ${!!user}, isLoginPage: ${isLoginPage}, isAuthRequired: ${isAuthRequired}`
    );

    if (!user && isAuthRequired) {
      console.log('🔑 Auth Hook: Not logged in, redirecting to login');
      router.push('/auth/login');
    } else if (user && isLoginPage) {
      console.log('🔑 Auth Hook: Already logged in, redirecting to chat');
      router.push('/chat');
    }
  }, [user, loading, pathname, router]);

  return {
    user,
    loading,
    error,
    loginWithEmail,
    loginWithGoogle,
    registerWithEmail,
    logout,
  };
}

export default useAuth;
