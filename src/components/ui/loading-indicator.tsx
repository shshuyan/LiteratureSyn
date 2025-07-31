'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  isLoading?: boolean;
  progress?: number;
  message?: string;
  operation?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'progress' | 'dots' | 'pulse';
  className?: string;
}

export function LoadingIndicator({
  isLoading = false,
  progress,
  message,
  operation,
  size = 'md',
  variant = 'spinner',
  className,
}: LoadingIndicatorProps) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {variant === 'spinner' && (
        <Loader2 className={cn('animate-spin text-peach-600', sizeClasses[size])} />
      )}
      
      {variant === 'dots' && <DotsLoader size={size} />}
      
      {variant === 'pulse' && <PulseLoader size={size} />}
      
      {variant === 'progress' && progress !== undefined && (
        <div className="flex-1 min-w-0">
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      <div className="flex flex-col min-w-0">
        {operation && (
          <span className={cn('font-medium text-gray-900 dark:text-gray-100', textSizeClasses[size])}>
            {operation}
          </span>
        )}
        {message && (
          <span className={cn('text-gray-600 dark:text-gray-400', textSizeClasses[size])}>
            {message}
          </span>
        )}
        {progress !== undefined && (
          <span className={cn('text-gray-500 dark:text-gray-500', textSizeClasses[size])}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
}

function DotsLoader({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('bg-peach-600 rounded-full', dotSize[size])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

function PulseLoader({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const pulseSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      className={cn('bg-peach-600 rounded-full', pulseSize[size])}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
      }}
    />
  );
}

// Inline loading component for buttons and small spaces
export function InlineLoader({ 
  size = 'sm', 
  className 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}

// Full page loading overlay
export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  operation,
  progress,
}: {
  isLoading: boolean;
  message?: string;
  operation?: string;
  progress?: number;
}) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <LoadingIndicator
            isLoading={true}
            message={message}
            operation={operation}
            progress={progress}
            size="lg"
            variant={progress !== undefined ? 'progress' : 'spinner'}
            className="mb-4"
          />
        </div>
      </div>
    </motion.div>
  );
}

// Status indicator for different states
export function StatusIndicator({
  status,
  message,
  size = 'md',
}: {
  status: 'loading' | 'success' | 'error' | 'idle';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className={cn('animate-spin text-peach-600', sizeClasses[size])} />;
      case 'success':
        return <CheckCircle2 className={cn('text-green-600', sizeClasses[size])} />;
      case 'error':
        return <AlertCircle className={cn('text-red-600', sizeClasses[size])} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-peach-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      {message && (
        <span className={cn(textSizeClasses[size], getStatusColor())}>
          {message}
        </span>
      )}
    </div>
  );
}