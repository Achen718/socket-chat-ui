import { useUIStore, useErrorStore } from '@/store';
import {
  ErrorCategories,
  ErrorCategory,
  AppError,
  LogOptions,
  formatError,
  logError,
} from '@/lib/utils/errorUtils';

/**
 * Show user notification for the error
 */
const notifyUser = (error: AppError): void => {
  // Use the UI store to show a notification
  try {
    const addNotification = useUIStore.getState().addNotification;

    if (addNotification) {
      addNotification({
        type: 'error',
        content: error.message,
        // The id, timestamp, and read properties are handled by the store
      });
    }
  } catch (notificationError) {
    // Fallback if notification fails
    console.warn('Failed to show error notification', notificationError);
  }
};

/**
 * Main error handler that processes errors with logging, notification, and storage
 */
export const handleError = (
  error: unknown,
  category: ErrorCategory = ErrorCategories.UNKNOWN,
  options: LogOptions = {}
): AppError => {
  // Default options
  const { silent = false, notify = true, context = {} } = options;

  // Create standardized error object
  const appError = formatError(error, category, context);

  // Add to error store
  useErrorStore.getState().addError(appError);

  // Log error unless silent
  if (!silent) {
    logError(appError);
  }

  // Show notification if requested
  if (notify) {
    notifyUser(appError);
  }

  return appError;
};

/**
 * Direct error store access for non-React contexts
 */
export const errorStoreApi = {
  getErrors: () => useErrorStore.getState().errors,
  getLastError: () => useErrorStore.getState().lastError,
  clearErrors: () => useErrorStore.getState().clearErrors(),
  clearLastError: () => useErrorStore.getState().clearLastError(),
};

// Re-export the error categories so consumers don't need to import from multiple files
export { ErrorCategories };
