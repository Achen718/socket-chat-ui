/**
 * Core error handling utilities that can be used in any context (React or non-React)
 */

// Define error categories as string constants
export const ErrorCategories = {
  AUTH: 'Authentication Error',
  NETWORK: 'Network Error',
  FIREBASE: 'Firebase Error',
  SOCKET: 'Socket Error',
  API: 'API Error',
  VALIDATION: 'Validation Error',
  UNKNOWN: 'Unknown Error',
} as const;

// Create a type from the values
export type ErrorCategory =
  (typeof ErrorCategories)[keyof typeof ErrorCategories];

// Define standard error structure
export interface AppError {
  message: string;
  category: ErrorCategory;
  originalError?: unknown;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// Error logging options
export interface LogOptions {
  silent?: boolean;
  notify?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Extract a user-friendly error message from different error types
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    // Handle Firebase-style errors with code and message
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    // Handle HTTP response errors
    if ('statusText' in error && typeof error.statusText === 'string') {
      return error.statusText;
    }
  }

  return 'An unexpected error occurred';
};

/**
 * Log error to console and potentially to an external service
 */
export const logError = (error: AppError): void => {
  // Console logging
  console.error(
    `[${error.category}] ${error.timestamp.toISOString()}: ${error.message}`,
    { originalError: error.originalError, context: error.context }
  );

  // In a production app, you might want to log to an external service like:
  // - Sentry
  // - LogRocket
  // - Firebase Analytics
};

// Define a type for functions that can return promises
export type AsyncFunction<Args extends unknown[], Return> = (
  ...args: Args
) => Promise<Return>;

/**
 * Create a wrapped function that catches errors and processes them
 */
export const wrapWithErrorHandler = <Args extends unknown[], Return>(
  fn: AsyncFunction<Args, Return>,
  category: ErrorCategory,
  handleError: (
    error: unknown,
    category: ErrorCategory,
    options: LogOptions
  ) => AppError,
  options: LogOptions = {}
): AsyncFunction<Args, Return> => {
  return async (...args: Args): Promise<Return> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, category, options);
      throw error; // Re-throw for caller to handle if needed
    }
  };
};

/**
 * Format an error into a standardized AppError object
 */
export const formatError = (
  error: unknown,
  category: ErrorCategory = ErrorCategories.UNKNOWN,
  context: Record<string, unknown> = {}
): AppError => {
  return {
    message: extractErrorMessage(error),
    category,
    originalError: error,
    timestamp: new Date(),
    context,
  };
};
