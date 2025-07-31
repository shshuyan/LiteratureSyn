'use client';

// Error tracking and analytics
export interface ErrorEvent {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  tags?: string[];
}

export interface UserEvent {
  id: string;
  timestamp: number;
  type: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
  url: string;
}

// Error tracking class
export class ErrorTracker {
  private sessionId: string;
  private userId?: string;
  private endpoint: string;
  private maxRetries: number;
  private queue: ErrorEvent[] = [];
  private isOnline: boolean = true;

  constructor(endpoint = '/api/analytics/errors', maxRetries = 3) {
    this.endpoint = endpoint;
    this.maxRetries = maxRetries;
    this.sessionId = this.generateSessionId();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      // Global error handler
      window.addEventListener('error', (event) => {
        this.captureError(event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });
      
      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(event.reason, {
          type: 'unhandled_promise_rejection',
        });
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Capture error with context
  captureError(
    error: Error | string,
    context?: Record<string, any>,
    level: 'error' | 'warning' | 'info' = 'error',
    tags?: string[]
  ) {
    const errorEvent: ErrorEvent = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userId: this.userId,
      sessionId: this.sessionId,
      level,
      context,
      tags,
    };

    // Add to queue
    this.queue.push(errorEvent);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushQueue();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorEvent);
    }
  }

  // Flush error queue
  private async flushQueue() {
    if (this.queue.length === 0) return;

    const errors = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors }),
      });
    } catch (error) {
      // Re-add to queue if failed
      this.queue.unshift(...errors);
      console.warn('Failed to send error events:', error);
    }
  }

  // Capture performance issues
  capturePerformanceIssue(metric: string, value: number, threshold: number) {
    if (value > threshold) {
      this.captureError(
        `Performance issue: ${metric}`,
        {
          metric,
          value,
          threshold,
          type: 'performance',
        },
        'warning',
        ['performance']
      );
    }
  }

  // Capture user feedback
  captureUserFeedback(feedback: string, rating?: number, context?: Record<string, any>) {
    this.captureError(
      `User feedback: ${feedback}`,
      {
        feedback,
        rating,
        type: 'user_feedback',
        ...context,
      },
      'info',
      ['feedback']
    );
  }
}

// User analytics class
export class UserAnalytics {
  private sessionId: string;
  private userId?: string;
  private endpoint: string;
  private queue: UserEvent[] = [];
  private isOnline: boolean = true;
  private sessionStart: number;

  constructor(endpoint = '/api/analytics/events', userId?: string) {
    this.endpoint = endpoint;
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.track('page_hidden');
        } else {
          this.track('page_visible');
        }
      });
      
      // Track session end
      window.addEventListener('beforeunload', () => {
        this.track('session_end', {
          duration: Date.now() - this.sessionStart,
        });
        this.flushQueue();
      });
    }
    
    // Track session start
    this.track('session_start');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Track user event
  track(eventType: string, properties: Record<string, any> = {}) {
    const event: UserEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      type: eventType,
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.href : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight,
        } : undefined,
      },
      userId: this.userId,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    // Add to queue
    this.queue.push(event);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushQueue();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Event tracked:', event);
    }
  }

  // Flush event queue
  private async flushQueue() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-add to queue if failed
      this.queue.unshift(...events);
      console.warn('Failed to send analytics events:', error);
    }
  }

  // Track specific user actions
  trackDocumentUpload(filename: string, size: number, type: string) {
    this.track('document_upload', {
      filename,
      size,
      type,
      category: 'document_management',
    });
  }

  trackChatMessage(messageLength: number, sourceCount: number, responseTime?: number) {
    this.track('chat_message', {
      messageLength,
      sourceCount,
      responseTime,
      category: 'chat',
    });
  }

  trackArtefactGeneration(type: 'moa' | 'safety' | 'kol', regenerate: boolean, duration?: number) {
    this.track('artefact_generation', {
      type,
      regenerate,
      duration,
      category: 'artefacts',
    });
  }

  trackSearch(query: string, resultCount: number, responseTime?: number) {
    this.track('search', {
      query: query.length, // Don't store actual query for privacy
      resultCount,
      responseTime,
      category: 'search',
    });
  }

  trackError(error: string, context?: Record<string, any>) {
    this.track('error_occurred', {
      error,
      context,
      category: 'errors',
    });
  }

  trackPerformance(metric: string, value: number) {
    this.track('performance_metric', {
      metric,
      value,
      category: 'performance',
    });
  }
}

// Global instances
export const errorTracker = new ErrorTracker();
export const userAnalytics = new UserAnalytics();

// React error boundary integration
export function captureReactError(error: Error, errorInfo: any) {
  errorTracker.captureError(error, {
    componentStack: errorInfo.componentStack,
    type: 'react_error',
  }, 'error', ['react']);
}

// API error integration
export function captureApiError(error: Error, endpoint: string, method: string, statusCode?: number) {
  errorTracker.captureError(error, {
    endpoint,
    method,
    statusCode,
    type: 'api_error',
  }, 'error', ['api']);
}

// Performance monitoring integration
export function capturePerformanceMetric(name: string, value: number, threshold?: number) {
  userAnalytics.trackPerformance(name, value);
  
  if (threshold && value > threshold) {
    errorTracker.capturePerformanceIssue(name, value, threshold);
  }
}