'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorHandler } from '@/lib/error-handler';
import { captureReactError } from '@/lib/error-tracker';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our error handler
    const appError = errorHandler.parseError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
    });
    
    errorHandler.logError(appError);

    // Capture error for tracking
    captureReactError(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleRetryWithDelay = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onRetryWithDelay={this.handleRetryWithDelay}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorId: string | null;
  retryCount: number;
  onRetry: () => void;
  onRetryWithDelay: () => void;
}

function ErrorFallback({ error, errorId, retryCount, onRetry, onRetryWithDelay }: ErrorFallbackProps) {
  const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
  const canRetry = retryCount < 3;

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center w-12 h-12 mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
        {isNetworkError 
          ? "We're having trouble connecting. Please check your internet connection and try again."
          : "An unexpected error occurred. Our team has been notified."
        }
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs max-w-md">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            Error Details (Development)
          </summary>
          <div className="mt-2 space-y-1">
            <div><strong>Error ID:</strong> {errorId}</div>
            <div><strong>Message:</strong> {error?.message}</div>
            <div><strong>Retry Count:</strong> {retryCount}</div>
            {error?.stack && (
              <div>
                <strong>Stack:</strong>
                <pre className="mt-1 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex gap-3">
        {canRetry && (
          <>
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            
            {retryCount > 0 && (
              <Button
                onClick={onRetryWithDelay}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry in {Math.min(Math.pow(2, retryCount), 10)}s
              </Button>
            )}
          </>
        )}
        
        <Button
          onClick={() => window.location.href = '/'}
          variant="default"
          size="sm"
          className="flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Button>
      </div>
    </div>
  );
}

// Convenience wrapper for common use cases
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for triggering error boundary from within components
export function useErrorHandler() {
  return (error: Error, _errorInfo?: Record<string, unknown>) => {
    // This will trigger the nearest error boundary
    throw error;
  };
}