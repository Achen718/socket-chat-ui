import { Message } from '@/types';
import { SetFn, ChatStoreState, FirebaseError } from '@/store/chat/types';

export interface MessageState {
  messages: Message[];
  messagesLoading: boolean;
}

export const initialMessageState: MessageState = {
  messages: [],
  messagesLoading: false,
};

export type MessageSliceState = ChatStoreState;

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
