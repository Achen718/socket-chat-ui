import { create, StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ChatStoreState } from './types';
import { createLoadingManager } from './utils/loadingUtils';
import {
  createConversationSlice,
  ConversationSlice,
} from './slices/conversationSlice';
import { createMessageSlice, MessageSlice } from './slices/message';

interface ChatStore extends ChatStoreState, ConversationSlice, MessageSlice {}

export const useChatStore = create<ChatStore>()(
  immer((set, get) => {
    const setLoadingWithTimeout = createLoadingManager({
      getState: get,
      setState: set,
    } as StoreApi<ChatStore>);

    const conversationSlice = createConversationSlice(
      set,
      get,
      setLoadingWithTimeout
    );
    const messageSlice = createMessageSlice(set, get, setLoadingWithTimeout);

    return {
      ...conversationSlice,
      ...messageSlice,
      error: null,
    };
  })
);
