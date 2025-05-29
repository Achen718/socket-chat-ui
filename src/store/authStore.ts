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
import { handleError, ErrorCategories } from '@/lib/services/errorService';

interface AuthStore extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  logout: () => Promise<void>;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    user: null,
    loading: true,
    error: null,

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
        const appError = handleError(error, ErrorCategories.AUTH, {
          context: { email, action: 'loginWithEmail' },
        });

        set((state) => {
          state.error = appError.message;
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
        const appError = handleError(error, ErrorCategories.AUTH, {
          context: { provider: 'Google', action: 'loginWithGoogle' },
        });

        set((state) => {
          state.error = appError.message;
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
        const appError = handleError(error, ErrorCategories.AUTH, {
          context: { email, displayName, action: 'registerWithEmail' },
        });

        set((state) => {
          state.error = appError.message;
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
        const appError = handleError(error, ErrorCategories.AUTH, {
          context: { action: 'logout' },
        });

        set((state) => {
          state.error = appError.message;
          state.loading = false;
        });

        throw error;
      }
    },

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
    initAuthListener: () => {
      let currentUser = null;
      let isLoading = false;

      set((state) => {
        currentUser = state.user;
        isLoading = state.loading;

        if (currentUser === null && !isLoading) {
          state.loading = true;
        }

        return state;
      });

      const unsubscribe = onAuthStateChange((user) => {
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

            if (isLoading) {
              updateLoadingOnly = true;
              state.loading = false;
            }
          }

          return state;
        });

        if (skipUpdate && !updateLoadingOnly) {
          return;
        }

        set((state) => {
          if (!skipUpdate) {
            state.user = user;
          }
          state.loading = false;
        });
      });

      return unsubscribe;
    },
  }))
);
