export interface AppError {
  type: 'network' | 'validation' | 'server' | 'rate_limit' | 'processing' | 'timeout';
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number;
  context?: Record<string, unknown>;
}

class ErrorHandler {
  parseError(error: unknown, context?: Record<string, unknown>): AppError {
    const appError: AppError = {
      type: 'processing',
      message: 'An unknown error occurred',
      retryable: true,
      context: context || {},
    };

    if (error instanceof Error) {
      appError.message = error.message;
      
      // Determine error type based on message or error properties
      if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
        appError.type = 'network';
      } else if (error.message.includes('timeout')) {
        appError.type = 'timeout';
      } else if (context?.type) {
        appError.type = context.type as AppError['type'];
        if (context.type === 'validation') {
          appError.retryable = false;
        }
        if (context.type === 'rate_limit' && context.retryAfter) {
          appError.retryAfter = context.retryAfter as number;
        }
      }
    } else if (typeof error === 'string') {
      appError.message = error;
    }

    return appError;
  }

  logError(error: AppError): void {
    console.error('[ERROR]', error.type, error.message, error);
  }

  getRetryDelay(error: AppError, retryCount: number): number {
    if (!error.retryable) {
      return 0;
    }

    if (error.type === 'rate_limit' && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  shouldRetry(error: AppError, retryCount: number): boolean {
    return error.retryable && retryCount < 3;
  }

  createRetryWrapper<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): () => Promise<T> {
    const { maxRetries = 3, baseDelay = 1000, shouldRetry } = options;

    return async (): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          if (shouldRetry && !shouldRetry(lastError)) {
            throw lastError;
          }
          
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError!;
    };
  }

  getRecoverySuggestions(error: AppError): string[] {
    switch (error.type) {
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a moment',
          'Contact support if the problem persists'
        ];
      case 'validation':
        return [
          'Check your input and try again',
          'Ensure all required fields are filled',
          'Verify the format of your data'
        ];
      case 'rate_limit':
        const waitTime = error.retryAfter ? `${Math.ceil(error.retryAfter / 60)} minute${error.retryAfter > 60 ? 's' : ''}` : 'a moment';
        return [
          'Please wait before trying again',
          `Rate limit will reset in ${waitTime}`,
          'Consider reducing the frequency of requests'
        ];
      case 'server':
        return [
          'The server encountered an error',
          'Please try again later',
          'Contact support if the issue continues'
        ];
      case 'timeout':
        return [
          'The request timed out',
          'Check your connection and try again',
          'The server may be experiencing high load'
        ];
      case 'processing':
        return [
          'There was an error processing your request',
          'Please try again',
          'Contact support if the problem persists'
        ];
      default:
        return ['An unexpected error occurred', 'Please try again'];
    }
  }

  getErrorSeverity(errorType: AppError['type']): 'info' | 'warning' | 'error' {
    switch (errorType) {
      case 'rate_limit':
        return 'info';
      case 'network':
      case 'timeout':
        return 'warning';
      case 'validation':
      case 'server':
      case 'processing':
      default:
        return 'error';
    }
  }

  isUserFacingError(errorType: AppError['type']): boolean {
    return ['validation', 'rate_limit', 'network', 'timeout'].includes(errorType);
  }
}

export const errorHandler = new ErrorHandler();