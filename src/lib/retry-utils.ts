import React from 'react';
import { errorHandler } from './error-handler';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

export interface RetryState {
  attempt: number;
  totalAttempts: number;
  lastError: unknown;
  isRetrying: boolean;
  nextRetryAt?: Date;
}

export class RetryManager {
  private static instance: RetryManager;
  private activeRetries = new Map<string, RetryState>();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  // Execute operation with retry logic
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    operationId?: string
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      retryCondition = this.defaultRetryCondition,
      onRetry,
    } = options;

    const id = operationId || this.generateOperationId();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Update retry state
      this.updateRetryState(id, {
        attempt,
        totalAttempts: maxAttempts,
        lastError,
        isRetrying: attempt > 1,
      });

      try {
        const result = await operation();
        
        // Clear retry state on success
        this.clearRetryState(id);
        return result;
      } catch (error) {
        lastError = error;
        
        // Update retry state with error
        this.updateRetryState(id, {
          attempt,
          totalAttempts: maxAttempts,
          lastError: error,
          isRetrying: true,
        });

        // Check if we should retry
        if (attempt === maxAttempts || !retryCondition(error, attempt)) {
          this.clearRetryState(id);
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(
          baseDelay,
          maxDelay,
          backoffFactor,
          attempt,
          jitter,
          error
        );

        // Set next retry time
        const nextRetryAt = new Date(Date.now() + delay);
        this.updateRetryState(id, {
          attempt,
          totalAttempts: maxAttempts,
          lastError: error,
          isRetrying: true,
          nextRetryAt,
        });

        // Call retry callback
        onRetry?.(error, attempt, delay);

        // Wait before retry
        await this.delay(delay);
      }
    }

    this.clearRetryState(id);
    throw lastError;
  }

  // Default retry condition
  private defaultRetryCondition = (error: unknown, attempt: number): boolean => {
    const appError = errorHandler.parseError(error);
    return appError.retryable && attempt < 3;
  };

  // Calculate delay with exponential backoff and jitter
  private calculateDelay(
    baseDelay: number,
    maxDelay: number,
    backoffFactor: number,
    attempt: number,
    jitter: boolean,
    error: unknown
  ): number {
    // Check if error specifies retry-after
    const appError = errorHandler.parseError(error);
    if (appError.retryAfter) {
      return Math.min(appError.retryAfter * 1000, maxDelay);
    }

    // Exponential backoff
    let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (jitter) {
      const jitterAmount = delay * 0.1; // ±10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 100); // Minimum 100ms delay
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate unique operation ID
  private generateOperationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update retry state
  private updateRetryState(id: string, state: Partial<RetryState>): void {
    const current = this.activeRetries.get(id) || {
      attempt: 0,
      totalAttempts: 0,
      lastError: null,
      isRetrying: false,
    };

    this.activeRetries.set(id, { ...current, ...state });
  }

  // Clear retry state
  private clearRetryState(id: string): void {
    this.activeRetries.delete(id);
  }

  // Get retry state
  getRetryState(id: string): RetryState | undefined {
    return this.activeRetries.get(id);
  }

  // Get all active retries
  getActiveRetries(): Map<string, RetryState> {
    return new Map(this.activeRetries);
  }

  // Cancel retry
  cancelRetry(id: string): void {
    this.clearRetryState(id);
  }

  // Clear all retries
  clearAllRetries(): void {
    this.activeRetries.clear();
  }
}

// Export singleton instance
export const retryManager = RetryManager.getInstance();

// Convenience functions
export const withRetry = <T>(
  operation: () => Promise<T>,
  options?: RetryOptions,
  operationId?: string
): Promise<T> => {
  return retryManager.withRetry(operation, options, operationId);
};

// Specific retry strategies
export const withNetworkRetry = <T>(
  operation: () => Promise<T>,
  operationId?: string
): Promise<T> => {
  return withRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error) => {
        const appError = errorHandler.parseError(error);
        return appError.type === 'network' || appError.type === 'timeout';
      },
    },
    operationId
  );
};

export const withServerRetry = <T>(
  operation: () => Promise<T>,
  operationId?: string
): Promise<T> => {
  return withRetry(
    operation,
    {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      retryCondition: (error) => {
        const appError = errorHandler.parseError(error);
        return appError.type === 'server' && appError.retryable;
      },
    },
    operationId
  );
};

export const withRateLimitRetry = <T>(
  operation: () => Promise<T>,
  operationId?: string
): Promise<T> => {
  return withRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 5000,
      maxDelay: 60000,
      retryCondition: (error) => {
        const appError = errorHandler.parseError(error);
        return appError.type === 'rate_limit';
      },
    },
    operationId
  );
};

// Hook for React components
export function useRetryState(operationId: string) {
  const [retryState, setRetryState] = React.useState<RetryState | undefined>();

  React.useEffect(() => {
    const checkState = () => {
      const state = retryManager.getRetryState(operationId);
      setRetryState(state);
    };

    // Check initial state
    checkState();

    // Poll for state changes (in a real app, you might use a more sophisticated approach)
    const interval = setInterval(checkState, 100);

    return () => clearInterval(interval);
  }, [operationId]);

  return retryState;
}

