'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  WifiOff, 
  Clock, 
  RefreshCw, 
  X, 
  ChevronDown,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: {
    type: 'network' | 'validation' | 'server' | 'rate_limit' | 'processing' | 'timeout';
    message: string;
    code?: string;
    retryable: boolean;
    retryAfter?: number;
    context?: Record<string, unknown>;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline' | 'toast';
  showDetails?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
  variant = 'card',
  showDetails = false,
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const getErrorConfig = () => {
    switch (error.type) {
      case 'network':
        return {
          icon: WifiOff,
          title: 'Connection Error',
          color: 'red',
          description: 'Unable to connect to the server. Please check your internet connection.',
        };
      case 'server':
        return {
          icon: AlertTriangle,
          title: 'Server Error',
          color: 'red',
          description: 'The server encountered an error. Please try again in a moment.',
        };
      case 'rate_limit':
        return {
          icon: Clock,
          title: 'Rate Limited',
          color: 'yellow',
          description: 'Too many requests. Please wait before trying again.',
        };
      case 'timeout':
        return {
          icon: Clock,
          title: 'Request Timeout',
          color: 'yellow',
          description: 'The request took too long to complete.',
        };
      case 'validation':
        return {
          icon: AlertCircle,
          title: 'Validation Error',
          color: 'yellow',
          description: 'Please check your input and try again.',
        };
      default:
        return {
          icon: AlertTriangle,
          title: 'Error',
          color: 'red',
          description: 'An unexpected error occurred.',
        };
    }
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  const colorClasses = {
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300',
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  const handleRetry = () => {
    if (error.retryAfter) {
      setRetryCountdown(error.retryAfter);
      const interval = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onRetry?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      onRetry?.();
    }
  };

  const copyErrorDetails = () => {
    const details = {
      type: error.type,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      context: error.context,
    };
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
  };

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'px-4 py-3 border-l-4',
          colors.bg,
          colors.border,
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={cn('w-5 h-5', colors.icon)} />
            <div>
              <p className={cn('font-medium', colors.title)}>{config.title}</p>
              <p className={cn('text-sm', colors.text)}>{error.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                disabled={retryCountdown > 0}
              >
                {retryCountdown > 0 ? (
                  `Retry in ${retryCountdown}s`
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry
                  </>
                )}
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', colors.text, className)}>
        <Icon className={cn('w-4 h-4', colors.icon)} />
        <span>{error.message}</span>
        {error.retryable && onRetry && (
          <Button
            onClick={handleRetry}
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-xs"
            disabled={retryCountdown > 0}
          >
            {retryCountdown > 0 ? `${retryCountdown}s` : 'Retry'}
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className={cn(
          'rounded-lg border p-4 shadow-lg max-w-sm',
          colors.bg,
          colors.border,
          className
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn('w-5 h-5 mt-0.5', colors.icon)} />
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium', colors.title)}>{config.title}</p>
            <p className={cn('text-sm mt-1', colors.text)}>{error.message}</p>
            {error.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={retryCountdown > 0}
              >
                {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry'}
              </Button>
            )}
          </div>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Default card variant
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'rounded-lg border p-4',
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-6 h-6 mt-0.5', colors.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={cn('font-semibold', colors.title)}>{config.title}</h3>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <p className={cn('mt-1', colors.text)}>{error.message}</p>
          
          {error.code && (
            <p className={cn('text-xs mt-1 font-mono', colors.text)}>
              Error Code: {error.code}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {error.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                disabled={retryCountdown > 0}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Try Again'}
              </Button>
            )}
            
            {showDetails && (error.context || error.code) && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="ghost"
                size="sm"
              >
                <ChevronDown 
                  className={cn(
                    'w-4 h-4 mr-1 transition-transform',
                    isExpanded && 'rotate-180'
                  )} 
                />
                Details
              </Button>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-2">
                  {error.code && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Error Code:</span>
                      <code className="ml-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                        {error.code}
                      </code>
                    </div>
                  )}
                  
                  {error.context && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Context:</span>
                      <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={copyErrorDetails}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Details
                    </Button>
                    
                    <Button
                      onClick={() => window.open('mailto:support@example.com?subject=Error Report')}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Report Issue
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}