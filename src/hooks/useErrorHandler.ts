import { useState, useCallback } from 'react';
import { useErrorStore } from '@/store';
import { handleError } from '@/lib/services/errorService';
import {
  ErrorCategories,
  ErrorCategory,
  AppError,
  LogOptions,
  wrapWithErrorHandler,
} from '@/lib/utils/errorUtils';

/**
 * React hook for handling errors within React components
 *
 * This provides a React-specific interface to the error handling system,
 * with local component state management for better UX
 */
export function useErrorHandler() {
  // Local component state for errors
  const [localError, setLocalError] = useState<string | null>(null);

  // Access errors from the global store using the hook
  const errors = useErrorStore((state) => state.errors);
  const lastError = useErrorStore((state) => state.lastError);
  const clearErrors = useErrorStore((state) => state.clearErrors);
  const clearLastError = useErrorStore((state) => state.clearLastError);

  // Clear the local error state
  const clearLocalError = useCallback(() => {
    setLocalError(null);
  }, []);

  // Handle an error with local component state
  const handleLocalError = useCallback(
    (
      error: unknown,
      category: ErrorCategory = ErrorCategories.UNKNOWN,
      options: LogOptions = {}
    ): AppError => {
      // Process the error through the central handler, but don't notify
      const appError = handleError(error, category, {
        ...options,
        notify: false,
      });

      // Update local state
      setLocalError(appError.message);

      return appError;
    },
    []
  );

  /**
   * Creates a wrapped version of an async function that handles errors locally
   */
  const createLocalErrorWrapper = useCallback(
    <Args extends unknown[], Return>(
      fn: (...args: Args) => Promise<Return>,
      category: ErrorCategory,
      options: LogOptions = {}
    ) => {
      return wrapWithErrorHandler(fn, category, handleLocalError, options);
    },
    [handleLocalError]
  );

  return {
    // Global error state
    errors,
    lastError,
    clearErrors,
    clearLastError,
    hasErrors: errors.length > 0,

    // Local error state
    localError,
    clearLocalError,
    handleLocalError,
    createLocalErrorWrapper,

    // Re-export the central handler for convenience
    handleError,

    // Re-export categories for convenience
    ErrorCategories,
  };
}

// Re-export for convenience
export { ErrorCategories, type ErrorCategory, type AppError };
