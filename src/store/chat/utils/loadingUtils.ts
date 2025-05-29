import { StoreApi } from 'zustand';

interface LoadableState {
  conversationsLoading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

const activeTimeouts: { [key: string]: NodeJS.Timeout } = {};

/**
 * Sets loading state with a safety timeout to prevent stuck states
 */
export const createLoadingManager = <T extends LoadableState>(
  store: StoreApi<T>
) => {
  const { getState, setState } = store;
  return (loading: boolean, source: string = 'unknown') => {
    const timeoutKey = `loading_${source}`;
    if (activeTimeouts[timeoutKey]) {
      clearTimeout(activeTimeouts[timeoutKey]);
      delete activeTimeouts[timeoutKey];
    }

    setState((state) => {
      if (source.startsWith('fetchConversations')) {
        state.conversationsLoading = loading;
      } else if (source.startsWith('fetchMessages')) {
        state.messagesLoading = loading;
      } else if (source.startsWith('createNewConversation')) {
        state.conversationsLoading = loading;
      } else {
        state.conversationsLoading = loading;
        state.messagesLoading = loading;
      }

      if (loading) {
        state.error = null;
      }
      return state;
    });

    if (loading) {
      activeTimeouts[timeoutKey] = setTimeout(() => {
        const currentState = getState();

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

        delete activeTimeouts[timeoutKey];
      }, 8000);
    }
  };
};
