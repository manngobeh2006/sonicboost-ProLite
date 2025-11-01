import { logError, logBreadcrumb } from './sentry';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt or if we shouldn't retry
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = exponentialDelay + jitter;

      logBreadcrumb(
        `Retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        'retry',
        { error: error.message }
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Default retry condition - retry on network errors
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Don't retry 4xx errors (client errors)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Retry network errors
  const isNetworkError =
    error.message?.includes('Network request failed') ||
    error.message?.includes('timeout') ||
    error.message?.includes('Failed to fetch') ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT';

  // Retry 5xx errors (server errors)
  const isServerError = error.status >= 500 && error.status < 600;

  return isNetworkError || isServerError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for API calls
 */
export async function retryAPICall<T>(
  apiCall: () => Promise<T>,
  operationName: string,
  options?: RetryOptions
): Promise<T> {
  try {
    return await retryWithBackoff(apiCall, {
      ...options,
      onRetry: (error, attempt) => {
        console.warn(`[${operationName}] Retry attempt ${attempt}:`, error.message);
        options?.onRetry?.(error, attempt);
      },
    });
  } catch (error: any) {
    logError(error, {
      operation: operationName,
      message: error.message,
    });
    throw error;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  return defaultShouldRetry(error, 0);
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
