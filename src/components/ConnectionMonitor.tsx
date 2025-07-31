'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function ConnectionMonitor() {
  const { ui, setConnectionStatus, setOfflineMode } = useUIStore();

  const checkConnection = useCallback(async () => {
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        if (ui.connectionStatus !== 'online') {
          setConnectionStatus('online');
          setOfflineMode(false);
        }
      } else {
        throw new Error('Server not responding');
      }
    } catch {
      if (ui.connectionStatus === 'online') {
        setConnectionStatus('offline');
        setOfflineMode(true);
      }
    }
  }, [ui.connectionStatus, setConnectionStatus, setOfflineMode]);

  const handleOnline = useCallback(() => {
    setConnectionStatus('reconnecting');
    // Give a brief moment before checking connection
    setTimeout(() => {
      checkConnection();
    }, 1000);
  }, [checkConnection, setConnectionStatus]);

  const handleOffline = useCallback(() => {
    setConnectionStatus('offline');
    setOfflineMode(true);
  }, [setConnectionStatus, setOfflineMode]);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connection checks when offline
    let intervalId: NodeJS.Timeout;
    
    if (ui.connectionStatus === 'offline') {
      intervalId = setInterval(checkConnection, 10000); // Check every 10 seconds
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkConnection, handleOnline, handleOffline, ui.connectionStatus]);

  // Don't show anything when online
  if (ui.connectionStatus === 'online') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <ConnectionBanner status={ui.connectionStatus} />
      </motion.div>
    </AnimatePresence>
  );
}

function ConnectionBanner({ status }: { status: 'offline' | 'reconnecting' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'offline':
        return {
          icon: WifiOff,
          message: 'You are offline. Some features may not be available.',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
        };
      case 'reconnecting':
        return {
          icon: AlertTriangle,
          message: 'Reconnecting...',
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
        };
      default:
        return {
          icon: Wifi,
          message: 'Connected',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('px-4 py-2 text-center', config.bgColor, config.textColor)}>
      <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.message}</span>
        {status === 'reconnecting' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4"
          >
            <Wifi className="w-4 h-4" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Hook for components to check connection status
export function useConnectionStatus() {
  const { ui } = useUIStore();
  
  return {
    isOnline: ui.connectionStatus === 'online',
    isOffline: ui.connectionStatus === 'offline',
    isReconnecting: ui.connectionStatus === 'reconnecting',
    isOfflineMode: ui.isOfflineMode,
    status: ui.connectionStatus,
  };
}

// Hook for handling offline-aware API calls
export function useOfflineAwareApi() {
  const { isOnline, isOfflineMode } = useConnectionStatus();

  const makeRequest = useCallback(
    async <T,>(requestFn: () => Promise<T>, fallbackData?: T): Promise<T> => {
      if (isOfflineMode && fallbackData !== undefined) {
        return fallbackData;
      }

      if (!isOnline) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      try {
        return await requestFn();
      } catch (error) {
        // If it's a network error and we have fallback data, use it
        if (fallbackData !== undefined && 
            (error instanceof TypeError || 
             (error as any)?.message?.includes('fetch'))) {
          return fallbackData;
        }
        throw error;
      }
    },
    [isOnline, isOfflineMode]
  );

  return { makeRequest };
}