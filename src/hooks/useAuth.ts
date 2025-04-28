import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { setupAuthPersistence } from '@/lib/firebase/auth';
import { User } from '@/types';
import { setupPresence } from '@/lib/firebase/user';
import {
  authListenerManager,
  presenceManager,
} from '@/lib/utils/resourceManager';

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

  // Initialize auth listener on mount
  useEffect(() => {
    // Check if auth listener is already initialized
    if (authListenerManager.has('global')) {
      console.log('🔑 Auth Hook: Auth listener already initialized, skipping');
      return;
    }

    console.log('🔑 Auth Hook: Setting up auth persistence and listener');

    const setupAuth = async () => {
      await setupAuthPersistence();

      try {
        const unsubscribe = initAuthListener();

        // Register with manager (which returns the cleanup function)
        return authListenerManager.register('global', () => {
          console.log('🔑 Auth Hook: Cleaning up auth listener');
          unsubscribe();
        });
      } catch (error) {
        console.error('🔑 Auth Hook: Error initializing auth listener', error);
        return () => {}; // Return empty cleanup if setup failed
      }
    };

    setupAuth();

    // Return cleanup function
    return () => {
      authListenerManager.remove('global');
    };
  }, []);

  // Set up presence tracking when user changes
  useEffect(() => {
    // Skip if no user
    if (!user?.id) return;

    console.log('👤 Auth Hook: Setting up presence tracking for', user.id);

    // Actually call setupPresence and register the cleanup function
    const cleanup = setupPresence(user.id);
    presenceManager.register(user.id, cleanup);

    // Return cleanup function to run when effect is cleaned up
    return () => {
      if (user?.id) {
        presenceManager.remove(user.id);
      }
    };
  }, [user?.id]);

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
