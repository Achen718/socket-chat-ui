import { create } from 'zustand';
import { AppError } from '@/lib/utils/errorUtils';

/**
 * Interface for the global error store
 */
export interface ErrorStore {
  errors: AppError[];
  lastError: AppError | null;
  addError: (error: AppError) => void;
  clearErrors: () => void;
  clearLastError: () => void;
}

/**
 * Global error store using Zustand
 * This tracks errors across the application for debugging and recovery
 */
export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  lastError: null,
  addError: (error) =>
    set((state) => ({
      errors: [...state.errors, error],
      lastError: error,
    })),
  clearErrors: () => set({ errors: [], lastError: null }),
  clearLastError: () => set({ lastError: null }),
}));
