'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring, PerformanceObserver } from '@/lib/performance-monitor';
import { userAnalytics, errorTracker } from '@/lib/error-tracker';

export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize Core Web Vitals monitoring
    initPerformanceMonitoring();
    
    // Initialize custom performance observers
    const observer = new PerformanceObserver();
    observer.startObserving();
    
    // Track initial page load
    userAnalytics.track('page_load', {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: Date.now(),
    });

    // Monitor memory usage periodically
    const memoryMonitor = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        // Track high memory usage
        if (usagePercent > 80) {
          errorTracker.capturePerformanceIssue('memory_usage', usagePercent, 80);
        }
        
        userAnalytics.trackPerformance('memory_usage', usagePercent);
      }
    }, 30000); // Check every 30 seconds

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Track low FPS
        if (fps < 30) {
          errorTracker.capturePerformanceIssue('low_fps', fps, 30);
        }
        
        userAnalytics.trackPerformance('fps', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    
    // Cleanup on unmount
    return () => {
      observer.stopObserving();
      clearInterval(memoryMonitor);
    };
  }, []);

  // This component doesn't render anything
  return null;
}