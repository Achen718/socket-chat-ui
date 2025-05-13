import { Message } from '@/types';
import { SetFn, ChatStoreState, FirebaseError } from '@/store/chat/types';

// Core state for message slice
export interface MessageState {
  messages: Message[];
  messagesLoading: boolean;
}

// Initial state values
export const initialMessageState: MessageState = {
  messages: [],
  messagesLoading: false,
};

// Type for slices that need to access shared state
export type MessageSliceState = ChatStoreState;

// Common error handling function
export const handleMessageError = <T extends MessageSliceState>(
  set: SetFn<T>,
  error: unknown,
  defaultMessage: string
): void => {
  const errorMessage = (error as Error).message || defaultMessage;

  set((state) => {
    state.error = errorMessage;
    state.messagesLoading = false;
    return state;
  });
};

// Check if error is a Firebase collection not found error
export const isCollectionNotFoundError = (error: unknown): boolean => {
  const fbError = error as FirebaseError;
  return (
    !!fbError &&
    typeof fbError === 'object' &&
    'code' in fbError &&
    (fbError.code === 'permission-denied' ||
      fbError.code === 'not-found' ||
      fbError.code === 'resource-exhausted')
  );
};
