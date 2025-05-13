import { StoreApi } from 'zustand';

// Define interface for the minimum required state properties
interface LoadableState {
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

// Track active timeouts to prevent duplicates
const activeTimeouts: { [key: string]: NodeJS.Timeout } = {};

/**
 * Sets loading state with a safety timeout to prevent stuck states
 */
export const createLoadingManager = <T extends LoadableState>(
  store: StoreApi<T>
) => {
  const { getState, setState } = store;

  return (loading: boolean, source: string = 'unknown') => {
    // Always clear any existing timeout first to prevent duplicate warnings
    const timeoutKey = `loading_${source}`;
    if (activeTimeouts[timeoutKey]) {
      clearTimeout(activeTimeouts[timeoutKey]);
      delete activeTimeouts[timeoutKey];
    }

    setState((state) => {
      // Determine which loading state to update based on the source
      if (source.startsWith('fetchConversations')) {
        state.conversationsLoading = loading;
      } else if (source.startsWith('fetchMessages')) {
        state.messagesLoading = loading;
      } else if (source.startsWith('createNewConversation')) {
        state.conversationsLoading = loading;
      } else {
        // For other operations, update both for backward compatibility
        state.conversationsLoading = loading;
        state.messagesLoading = loading;
      }

      if (loading) {
        state.error = null;
      }
      return state;
    });

    // If we're setting loading to true, also set a timeout to clear it
    if (loading) {
      // Set a safety timeout to prevent stuck loading states
      activeTimeouts[timeoutKey] = setTimeout(() => {
        const currentState = getState();

        // Check which loading state to clear based on source
        if (
          source.startsWith('fetchConversations') ||
          source.startsWith('createNewConversation')
        ) {
          if (currentState.conversationsLoading) {
            console.warn(
              `Loading state from "${source}" was active for too long, forcing it to false`
            );
            setState((state) => {
              state.conversationsLoading = false;
              return state;
            });
          }
        } else if (source.startsWith('fetchMessages')) {
          if (currentState.messagesLoading) {
            console.warn(
              `Loading state from "${source}" was active for too long, forcing it to false`
            );
            setState((state) => {
              state.messagesLoading = false;
              return state;
            });
          }
        } else {
          // For other operations, check both states
          if (
            currentState.conversationsLoading ||
            currentState.messagesLoading
          ) {
            console.warn(
              `Loading state from "${source}" was active for too long, forcing it to false`
            );
            setState((state) => {
              state.conversationsLoading = false;
              state.messagesLoading = false;
              return state;
            });
          }
        }

        // Clear timeout reference
        delete activeTimeouts[timeoutKey];
      }, 8000); // 8 second timeout
    }
  };
};
