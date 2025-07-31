import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorHandler } from '../error-handler';

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

Object.defineProperty(console, 'error', { value: mockConsole.error });
Object.defineProperty(console, 'warn', { value: mockConsole.warn });
Object.defineProperty(console, 'info', { value: mockConsole.info });

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseError', () => {
    it('should parse standard Error objects', () => {
      const error = new Error('Test error message');
      const parsed = errorHandler.parseError(error);
      
      expect(parsed.type).toBe('server');
      expect(parsed.message).toBe('Test error message');
      expect(parsed.retryable).toBe(true);
      expect(parsed.context).toEqual({});
    });

    it('should parse network errors', () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';
      
      const parsed = errorHandler.parseError(error);
      
      expect(parsed.type).toBe('network');
      expect(parsed.retryable).toBe(true);
    });

    it('should parse fetch errors', () => {
      const error = new Error('Failed to fetch');
      const parsed = errorHandler.parseError(error);
      
      expect(parsed.type).toBe('network');
      expect(parsed.retryable).toBe(true);
    });

    it('should parse timeout errors', () => {
      const error = new Error('Request timeout');
      const parsed = errorHandler.parseError(error);
      
      expect(parsed.type).toBe('timeout');
      expect(parsed.retryable).toBe(true);
    });

    it('should parse validation errors', () => {
      const error = new Error('Validation failed');
      const parsed = errorHandler.parseError(error, { type: 'validation' });
      
      expect(parsed.type).toBe('validation');
      expect(parsed.retryable).toBe(false);
    });

    it('should parse rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const parsed = errorHandler.parseError(error, { 
        type: 'rate_limit',
        retryAfter: 60 
      });
      
      expect(parsed.type).toBe('rate_limit');
      expect(parsed.retryable).toBe(true);
      expect(parsed.retryAfter).toBe(60);
    });

    it('should handle string errors', () => {
      const parsed = errorHandler.parseError('String error message');
      
      expect(parsed.type).toBe('server');
      expect(parsed.message).toBe('String error message');
    });

    it('should handle unknown error types', () => {
      const parsed = errorHandler.parseError({ unknown: 'object' });
      
      expect(parsed.type).toBe('server');
      expect(parsed.message).toBe('An unknown error occurred');
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      const context = { operation: 'upload', fileId: '123' };
      
      const parsed = errorHandler.parseError(error, context);
      
      expect(parsed.context).toEqual(context);
    });
  });

  describe('logError', () => {
    it('should log errors to console', () => {
      const appError = {
        type: 'network' as const,
        message: 'Network error',
        code: 'NET_001',
        retryable: true,
        context: { operation: 'fetch' },
      };
      
      errorHandler.logError(appError);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ERROR]',
        'network',
        'Network error',
        appError
      );
    });

    it('should log different error types appropriately', () => {
      const validationError = {
        type: 'validation' as const,
        message: 'Invalid input',
        code: 'VAL_001',
        retryable: false,
        context: {},
      };
      
      errorHandler.logError(validationError);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ERROR]',
        'validation',
        'Invalid input',
        validationError
      );
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const error = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
      };
      
      expect(errorHandler.getRetryDelay(error, 0)).toBe(1000); // 1s
      expect(errorHandler.getRetryDelay(error, 1)).toBe(2000); // 2s
      expect(errorHandler.getRetryDelay(error, 2)).toBe(4000); // 4s
      expect(errorHandler.getRetryDelay(error, 3)).toBe(8000); // 8s
    });

    it('should respect retryAfter for rate limit errors', () => {
      const error = {
        type: 'rate_limit' as const,
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfter: 60,
      };
      
      expect(errorHandler.getRetryDelay(error, 0)).toBe(60000); // 60s
    });

    it('should cap maximum delay', () => {
      const error = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
      };
      
      // Very high retry count should be capped
      expect(errorHandler.getRetryDelay(error, 10)).toBeLessThanOrEqual(30000);
    });

    it('should return 0 for non-retryable errors', () => {
      const error = {
        type: 'validation' as const,
        message: 'Validation error',
        retryable: false,
      };
      
      expect(errorHandler.getRetryDelay(error, 0)).toBe(0);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retry for retryable errors under max attempts', () => {
      const error = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
      };
      
      expect(errorHandler.shouldRetry(error, 0)).toBe(true);
      expect(errorHandler.shouldRetry(error, 1)).toBe(true);
      expect(errorHandler.shouldRetry(error, 2)).toBe(true);
    });

    it('should not allow retry after max attempts', () => {
      const error = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
      };
      
      expect(errorHandler.shouldRetry(error, 3)).toBe(false);
      expect(errorHandler.shouldRetry(error, 5)).toBe(false);
    });

    it('should not allow retry for non-retryable errors', () => {
      const error = {
        type: 'validation' as const,
        message: 'Validation error',
        retryable: false,
      };
      
      expect(errorHandler.shouldRetry(error, 0)).toBe(false);
      expect(errorHandler.shouldRetry(error, 1)).toBe(false);
    });
  });

  describe('createRetryWrapper', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const mockOperation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return 'success';
      });

      const retryWrapper = errorHandler.createRetryWrapper(mockOperation, {
        maxRetries: 3,
        baseDelay: 100,
      });

      const result = await retryWrapper();
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const retryWrapper = errorHandler.createRetryWrapper(mockOperation, {
        maxRetries: 2,
        baseDelay: 10,
      });

      await expect(retryWrapper()).rejects.toThrow('Persistent error');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Validation failed'));

      const retryWrapper = errorHandler.createRetryWrapper(mockOperation, {
        maxRetries: 3,
        baseDelay: 10,
        shouldRetry: (error) => !error.message.includes('Validation'),
      });

      await expect(retryWrapper()).rejects.toThrow('Validation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect custom retry conditions', async () => {
      let attempts = 0;
      const mockOperation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) throw new Error('Retryable error');
        if (attempts === 2) throw new Error('Non-retryable error');
        return 'success';
      });

      const retryWrapper = errorHandler.createRetryWrapper(mockOperation, {
        maxRetries: 3,
        baseDelay: 10,
        shouldRetry: (error) => error.message.includes('Retryable'),
      });

      await expect(retryWrapper()).rejects.toThrow('Non-retryable error');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('error recovery', () => {
    it('should provide error recovery suggestions', () => {
      const networkError = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
      };
      
      const suggestions = errorHandler.getRecoverySuggestions(networkError);
      
      expect(suggestions).toContain('Check your internet connection');
      expect(suggestions).toContain('Try again in a moment');
    });

    it('should provide validation error suggestions', () => {
      const validationError = {
        type: 'validation' as const,
        message: 'Invalid file format',
        retryable: false,
      };
      
      const suggestions = errorHandler.getRecoverySuggestions(validationError);
      
      expect(suggestions).toContain('Check your input and try again');
      expect(suggestions).toContain('Ensure all required fields are filled');
    });

    it('should provide rate limit suggestions', () => {
      const rateLimitError = {
        type: 'rate_limit' as const,
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfter: 60,
      };
      
      const suggestions = errorHandler.getRecoverySuggestions(rateLimitError);
      
      expect(suggestions).toContain('Please wait before trying again');
      expect(suggestions).toContain('Rate limit will reset in 1 minute');
    });
  });

  describe('error categorization', () => {
    it('should categorize errors by severity', () => {
      expect(errorHandler.getErrorSeverity('network')).toBe('warning');
      expect(errorHandler.getErrorSeverity('validation')).toBe('error');
      expect(errorHandler.getErrorSeverity('rate_limit')).toBe('info');
      expect(errorHandler.getErrorSeverity('server')).toBe('error');
      expect(errorHandler.getErrorSeverity('timeout')).toBe('warning');
      expect(errorHandler.getErrorSeverity('processing')).toBe('error');
    });

    it('should determine if errors are user-facing', () => {
      expect(errorHandler.isUserFacingError('validation')).toBe(true);
      expect(errorHandler.isUserFacingError('rate_limit')).toBe(true);
      expect(errorHandler.isUserFacingError('network')).toBe(true);
      expect(errorHandler.isUserFacingError('server')).toBe(false);
    });
  });
});