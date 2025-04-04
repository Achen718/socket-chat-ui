import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  loginWithGoogle,
  logoutUser,
  onAuthStateChange,
} from '@/lib/firebase/auth';
import { User, AuthState } from '@/types';

interface AuthStore extends AuthState {
  // Auth actions
  loginWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  logout: () => Promise<void>;

  // Auth state management
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth listeners
  initAuthListener: () => () => void;
}

// Create auth store with Zustand and Immer
export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    // Initial state
    user: null,
    loading: true,
    error: null,

    // Auth actions
    loginWithEmail: async (email: string, password: string) => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const user = await loginWithEmailPassword(email, password);

        set((state) => {
          state.user = user;
          state.loading = false;
        });

        return user;
      } catch (error) {
        const errorMessage = (error as Error).message || 'Failed to login';

        set((state) => {
          state.error = errorMessage;
          state.loading = false;
        });

        throw error;
      }
    },

    loginWithGoogle: async () => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const user = await loginWithGoogle();

        set((state) => {
          state.user = user;
          state.loading = false;
        });

        return user;
      } catch (error) {
        const errorMessage =
          (error as Error).message || 'Failed to login with Google';

        set((state) => {
          state.error = errorMessage;
          state.loading = false;
        });

        throw error;
      }
    },

    registerWithEmail: async (
      email: string,
      password: string,
      displayName: string
    ) => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        const user = await registerWithEmailPassword(
          email,
          password,
          displayName
        );

        set((state) => {
          state.user = user;
          state.loading = false;
        });

        return user;
      } catch (error) {
        const errorMessage = (error as Error).message || 'Failed to register';

        set((state) => {
          state.error = errorMessage;
          state.loading = false;
        });

        throw error;
      }
    },

    logout: async () => {
      try {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        await logoutUser();

        set((state) => {
          state.user = null;
          state.loading = false;
        });
      } catch (error) {
        const errorMessage = (error as Error).message || 'Failed to logout';

        set((state) => {
          state.error = errorMessage;
          state.loading = false;
        });

        throw error;
      }
    },

    // Auth state management
    setUser: (user) => {
      set((state) => {
        state.user = user;
      });
    },

    setLoading: (loading) => {
      set((state) => {
        state.loading = loading;
      });
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },

    // Auth listener
    initAuthListener: () => {
      let currentUser = null;
      let isLoading = false;

      // Access current state values
      set((state) => {
        currentUser = state.user;
        isLoading = state.loading;

        // Set loading state while waiting for auth state, but only if user is null
        if (currentUser === null && !isLoading) {
          state.loading = true;
        }

        return state; // Return state unchanged if we didn't modify it
      });

      // Listen for auth state changes
      const unsubscribe = onAuthStateChange((user) => {
        // Get current state values before updating
        let skipUpdate = false;
        let updateLoadingOnly = false;

        set((state) => {
          currentUser = state.user;
          isLoading = state.loading;

          // Skip update if user hasn't actually changed (prevents excessive re-renders)
          if (
            (user === null && currentUser === null) ||
            (user && currentUser && user.id === currentUser.id)
          ) {
            console.log('Auth store: User state unchanged, skipping update');
            skipUpdate = true;

            // Still update loading to false if needed
            if (isLoading) {
              updateLoadingOnly = true;
              state.loading = false;
            }
          }

          return state; // Return state unchanged for now
        });

        // If we should skip the update entirely, return
        if (skipUpdate && !updateLoadingOnly) {
          return;
        }

        // Update the state with new user data
        set((state) => {
          if (!skipUpdate) {
            state.user = user;
          }
          state.loading = false;
        });
      });

      // Return unsubscribe function
      return unsubscribe;
    },
  }))
);
