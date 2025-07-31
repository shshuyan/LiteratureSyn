'use client';

import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance metrics interface
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Analytics endpoint (replace with your actual endpoint)
const ANALYTICS_ENDPOINT = '/api/analytics/performance';

// Send metrics to analytics service
async function sendToAnalytics(metric: PerformanceMetric) {
  try {
    // Only send in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('Performance Metric:', metric);
      return;
    }

    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...metric,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
      }),
    });
  } catch (error) {
    console.error('Failed to send performance metric:', error);
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  // Core Web Vitals
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Get current performance metrics
export async function getCurrentMetrics(): Promise<PerformanceMetric[]> {
  const metrics: PerformanceMetric[] = [];
  
  try {
    // Note: Direct metric retrieval is not available in web-vitals v3+
    // Metrics are collected via the callback functions in initPerformanceMonitoring
    console.log('Performance metrics are collected via callbacks');
  } catch {
    console.error('Failed to get performance metrics');
  }
  
  return metrics;
}

// Performance observer for custom metrics
export class PerformanceObserver {
  private observers: PerformanceObserver[] = [];

  // Observe long tasks (> 50ms)
  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            sendToAnalytics({
              name: 'long-task',
              value: entry.duration,
              rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
              delta: entry.duration,
              id: `long-task-${Date.now()}`,
              navigationType: 'navigate',
            });
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer as any);
      } catch {
        console.warn('Long task observation not supported');
      }
    }
  }

  // Observe layout shifts
  observeLayoutShifts() {
    if ('PerformanceObserver' in window) {
      const observer = new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            sendToAnalytics({
              name: 'layout-shift',
              value: (entry as any).value,
              rating: (entry as any).value > 0.1 ? 'poor' : 'good',
              delta: (entry as any).value,
              id: `layout-shift-${Date.now()}`,
              navigationType: 'navigate',
            });
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer as any);
      } catch {
        console.warn('Layout shift observation not supported');
      }
    }
  }

  // Observe resource loading
  observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          // Track slow resources (> 1s)
          if (resource.duration > 1000) {
            sendToAnalytics({
              name: 'slow-resource',
              value: resource.duration,
              rating: resource.duration > 2000 ? 'poor' : 'needs-improvement',
              delta: resource.duration,
              id: `slow-resource-${Date.now()}`,
              navigationType: 'navigate',
            });
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer as any);
      } catch {
        console.warn('Resource timing observation not supported');
      }
    }
  }

  // Start all observations
  startObserving() {
    this.observeLongTasks();
    this.observeLayoutShifts();
    this.observeResourceTiming();
  }

  // Stop all observations
  stopObserving() {
    this.observers.forEach(observer => {
      if ('disconnect' in observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    this.observers = [];
  }
}

// Memory usage monitoring
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

// Bundle size tracking
export function trackBundleSize() {
  if ('PerformanceObserver' in window) {
    const observer = new window.PerformanceObserver((list) => {
      let totalSize = 0;
      
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        const size = resource.transferSize || 0;
        totalSize += size;
      }
      
      sendToAnalytics({
        name: 'bundle-size',
        value: totalSize,
        rating: totalSize > 500000 ? 'poor' : totalSize > 250000 ? 'needs-improvement' : 'good',
        delta: totalSize,
        id: `bundle-size-${Date.now()}`,
        navigationType: 'navigate',
      });
    });
    
    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch {
      console.warn('Bundle size tracking not supported');
    }
  }
}