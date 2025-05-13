import { create, StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ChatStoreState } from './types';
import { createLoadingManager } from './utils/loadingUtils';
import {
  createConversationSlice,
  ConversationSlice,
} from './slices/conversationSlice';
import { createMessageSlice, MessageSlice } from './slices/message';

// Define the complete store type
interface ChatStore extends ChatStoreState, ConversationSlice, MessageSlice {}

// Create the store with all slices
export const useChatStore = create<ChatStore>()(
  immer((set, get) => {
    // Create the loading manager with proper StoreApi object
    const setLoadingWithTimeout = createLoadingManager({
      getState: get,
      setState: set,
    } as StoreApi<ChatStore>);

    // Create slices
    const conversationSlice = createConversationSlice(
      set,
      get,
      setLoadingWithTimeout
    );
    const messageSlice = createMessageSlice(set, get, setLoadingWithTimeout);

    // Combine slices and common state
    return {
      ...conversationSlice,
      ...messageSlice,
      error: null,
    };
  })
);
