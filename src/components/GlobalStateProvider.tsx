'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './ErrorBoundary';
import { ConnectionMonitor } from './ConnectionMonitor';
import { LoadingOverlay } from './ui/loading-indicator';
import { ErrorDisplay } from './ui/error-display';
import { useGlobalStore } from '@/lib/store';

interface GlobalStateProviderProps {
  children: React.ReactNode;
}

export function GlobalStateProvider({ children }: GlobalStateProviderProps) {
  return (
    <ErrorBoundary>
      <ConnectionMonitor />
      <GlobalLoadingProvider>
        <GlobalErrorProvider>
          {children}
        </GlobalErrorProvider>
      </GlobalLoadingProvider>
    </ErrorBoundary>
  );
}

function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const { getLoadingState } = useGlobalStore();
  const loadingState = getLoadingState();

  return (
    <>
      {children}
      <AnimatePresence>
        <LoadingOverlay
          isLoading={loadingState.isLoading}
          message={loadingState.message}
          operation={loadingState.operation}
          progress={loadingState.progress}
        />
      </AnimatePresence>
    </>
  );
}

function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const { getErrorState, clearError, canRetry, incrementRetryCount } = useGlobalStore();
  const errorState = getErrorState();

  const handleRetry = () => {
    incrementRetryCount();
    clearError();
    // The component that triggered the error should handle the retry logic
    window.location.reload();
  };

  const handleDismiss = () => {
    clearError();
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {errorState.hasError && errorState.error && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <ErrorDisplay
              error={errorState.error}
              onRetry={canRetry() ? handleRetry : undefined}
              onDismiss={handleDismiss}
              variant="toast"
              showDetails={process.env.NODE_ENV === 'development'}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for components to easily trigger global loading states
export function useGlobalLoading() {
  const { setLoading, updateLoadingProgress, clearLoading } = useGlobalStore();

  const withLoading = async <T,>(
    operation: () => Promise<T>,
    options?: {
      message?: string;
      operation?: string;
      showProgress?: boolean;
    }
  ): Promise<T> => {
    try {
      setLoading(true, options?.operation, undefined, options?.message);
      
      const result = await operation();
      
      clearLoading();
      return result;
    } catch (error) {
      clearLoading();
      throw error;
    }
  };

  const withProgressLoading = async <T,>(
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    options?: {
      message?: string;
      operation?: string;
    }
  ): Promise<T> => {
    try {
      setLoading(true, options?.operation, 0, options?.message);
      
      const updateProgress = (progress: number, message?: string) => {
        updateLoadingProgress(progress, message);
      };
      
      const result = await operation(updateProgress);
      
      clearLoading();
      return result;
    } catch (error) {
      clearLoading();
      throw error;
    }
  };

  return {
    withLoading,
    withProgressLoading,
    setLoading,
    updateLoadingProgress,
    clearLoading,
  };
}

// Hook for components to easily trigger global error states
export function useGlobalError() {
  const { setError, clearError } = useGlobalStore();

  const handleError = (error: unknown, context?: Record<string, unknown>) => {
    setError(error, context);
  };

  const withErrorHandling = async <T,>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  };

  return {
    handleError,
    withErrorHandling,
    clearError,
  };
}