import {
  AutomationError,
  AutomationTimeoutError,
  NetworkError,
  ProfileConnectionError,
  ElementNotFoundError
} from './errors';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error: any) => (error as AutomationError).retryable !== false
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const canRetry = (error as AutomationError).retryable !== undefined ? (error as AutomationError).retryable : shouldRetry(error);

      if (attempt === maxAttempts || !canRetry) {
        throw error;
      }

      let delay = baseDelay * Math.pow(2, attempt - 1);
      if (error instanceof AutomationTimeoutError) {
        delay = Math.min(delay * 1.5, maxDelay);
      } else if (error instanceof NetworkError) {
        delay = Math.min(delay * 0.8, maxDelay);
      } else if (error instanceof ProfileConnectionError) {
        delay = Math.min(delay * 1.2, maxDelay);
      }

      const jitter = Math.random() * (delay * 0.2);
      delay = delay - (delay * 0.1) + jitter;
      delay = Math.min(delay, maxDelay);

      console.log(`Attempt ${attempt} failed (${(error as AutomationError).type || 'unknown'}), retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function retryNetworkOperation<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts,
    baseDelay: 1000,
    maxDelay: 5000,
    shouldRetry: (error: any) => {
      if (error instanceof NetworkError || error instanceof AutomationTimeoutError) {
        return true;
      }
      return (
        error.message.includes('net::') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        (error.response && error.response.status >= 500)
      );
    }
  });
}

export async function retryProfileConnection<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts,
    baseDelay: 2000,
    maxDelay: 8000,
    shouldRetry: (error: any) => error instanceof ProfileConnectionError || (error as AutomationError).retryable
  });
}

export async function retryElementOperation<T>(operation: () => Promise<T>, maxAttempts = 2): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts,
    baseDelay: 500,
    maxDelay: 2000,
    shouldRetry: (error: any) => !(error instanceof ElementNotFoundError) && (error as AutomationError).retryable !== false
  });
}
