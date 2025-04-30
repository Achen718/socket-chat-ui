/**
 * Internal AI Service types
 * These types are specific to our AI service implementation
 */

/**
 * Configuration for the AI service
 */
export interface AIServiceConfig {
  apiUrl: string;
  model: string;
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Retry strategy for failed API calls
 */
export interface RetryStrategy {
  maxRetries: number;
  delayMs: number;
  backoffFactor: number;
}

/**
 * Internal response processing options
 */
export interface ResponseProcessingOptions {
  trimWhitespace?: boolean;
  maxLength?: number;
  filterProfanity?: boolean;
}

/**
 * Error types that can occur in the AI service
 */
export type AIServiceErrorType =
  | 'auth_error'
  | 'rate_limit'
  | 'server_error'
  | 'timeout'
  | 'bad_request'
  | 'unknown';

/**
 * Structured error from the AI service
 */
export interface AIServiceError {
  type: AIServiceErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  originalError?: unknown;
}
