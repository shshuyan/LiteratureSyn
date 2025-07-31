// Streaming utilities for real-time communication
import { errorHandler } from './error-handler';

export interface StreamConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface StreamCallbacks<T = any> {
  onData?: (data: T) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRetry?: (attempt: number) => void;
}

export class StreamManager {
  private activeStreams = new Map<string, AbortController>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 3;

  // Create a streaming connection using fetch with ReadableStream
  async createFetchStream<T>(
    streamId: string,
    config: StreamConfig,
    callbacks: StreamCallbacks<T>
  ): Promise<void> {
    // Cancel existing stream with same ID
    this.cancelStream(streamId);

    const controller = new AbortController();
    this.activeStreams.set(streamId, controller);

    try {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache',
          ...config.headers,
        },
        body: config.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      callbacks.onConnect?.();

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            callbacks.onComplete?.();
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line) as T;
                callbacks.onData?.(data);
              } catch {
                console.warn('Failed to parse stream data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled, don't treat as error
        return;
      }

      const appError = errorHandler.parseError(error, { streamId, config });
      errorHandler.logError(appError);

      // Attempt reconnection for retryable errors
      if (appError.retryable && this.shouldRetry(streamId)) {
        const attempt = this.getRetryAttempt(streamId);
        callbacks.onRetry?.(attempt);
        
        const delay = errorHandler.getRetryDelay(appError, attempt);
        setTimeout(() => {
          this.createFetchStream(streamId, config, callbacks);
        }, delay);
      } else {
        callbacks.onError?.(appError.message);
      }
    } finally {
      this.activeStreams.delete(streamId);
      callbacks.onDisconnect?.();
    }
  }

  // Create Server-Sent Events connection
  createSSEStream<T>(
    streamId: string,
    url: string,
    callbacks: StreamCallbacks<T>
  ): EventSource | null {
    // Cancel existing stream
    this.cancelStream(streamId);

    try {
      const eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        this.reconnectAttempts.delete(streamId);
        callbacks.onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          callbacks.onData?.(data);
        } catch (parseError) {
          console.warn('Failed to parse SSE data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        const appError = errorHandler.parseError(error, { streamId, url });
        errorHandler.logError(appError);

        if (eventSource.readyState === EventSource.CLOSED) {
          if (this.shouldRetry(streamId)) {
            const attempt = this.getRetryAttempt(streamId);
            callbacks.onRetry?.(attempt);
            
            setTimeout(() => {
              this.createSSEStream(streamId, url, callbacks);
            }, 1000 * attempt);
          } else {
            callbacks.onError?.(appError.message);
          }
        }
      };

      // Store reference for cleanup
      const controller = new AbortController();
      controller.signal.addEventListener('abort', () => {
        eventSource.close();
      });
      this.activeStreams.set(streamId, controller);

      return eventSource;
    } catch (error) {
      const appError = errorHandler.parseError(error, { streamId, url });
      callbacks.onError?.(appError.message);
      return null;
    }
  }

  // Create WebSocket connection
  createWebSocketStream<T>(
    streamId: string,
    url: string,
    callbacks: StreamCallbacks<T>
  ): WebSocket | null {
    // Cancel existing stream
    this.cancelStream(streamId);

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        this.reconnectAttempts.delete(streamId);
        callbacks.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          callbacks.onData?.(data);
        } catch (parseError) {
          console.warn('Failed to parse WebSocket data:', event.data);
        }
      };

      ws.onclose = (event) => {
        if (event.wasClean) {
          callbacks.onComplete?.();
        } else if (this.shouldRetry(streamId)) {
          const attempt = this.getRetryAttempt(streamId);
          callbacks.onRetry?.(attempt);
          
          setTimeout(() => {
            this.createWebSocketStream(streamId, url, callbacks);
          }, 1000 * attempt);
        } else {
          callbacks.onError?.('Connection closed unexpectedly');
        }
        callbacks.onDisconnect?.();
      };

      ws.onerror = (error) => {
        const appError = errorHandler.parseError(error, { streamId, url });
        errorHandler.logError(appError);
        callbacks.onError?.(appError.message);
      };

      // Store reference for cleanup
      const controller = new AbortController();
      controller.signal.addEventListener('abort', () => {
        ws.close();
      });
      this.activeStreams.set(streamId, controller);

      return ws;
    } catch (error) {
      const appError = errorHandler.parseError(error, { streamId, url });
      callbacks.onError?.(appError.message);
      return null;
    }
  }

  // Cancel a specific stream
  cancelStream(streamId: string): void {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      this.reconnectAttempts.delete(streamId);
    }
  }

  // Cancel all active streams
  cancelAllStreams(): void {
    for (const [streamId] of this.activeStreams) {
      this.cancelStream(streamId);
    }
  }

  // Check if stream is active
  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }

  // Get active stream count
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  // Private helper methods
  private shouldRetry(streamId: string): boolean {
    const attempts = this.reconnectAttempts.get(streamId) || 0;
    return attempts < this.maxReconnectAttempts;
  }

  private getRetryAttempt(streamId: string): number {
    const attempts = (this.reconnectAttempts.get(streamId) || 0) + 1;
    this.reconnectAttempts.set(streamId, attempts);
    return attempts;
  }
}

// Export singleton instance
export const streamManager = new StreamManager();

// Utility functions for common streaming patterns
export const createChatStream = (
  prompt: string,
  sourceIds: string[],
  callbacks: {
    onToken?: (token: string) => void;
    onArtefact?: (artefact: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
) => {
  const streamId = `chat-${Date.now()}`;
  
  return streamManager.createFetchStream(
    streamId,
    {
      url: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sourceIds,
        conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      }),
    },
    {
      onData: (chunk: any) => {
        switch (chunk.type) {
          case 'token':
            callbacks.onToken?.(chunk.data);
            break;
          case 'artefact':
            callbacks.onArtefact?.(chunk.data);
            break;
          case 'complete':
            callbacks.onComplete?.();
            break;
          case 'error':
            callbacks.onError?.(chunk.data);
            break;
        }
      },
      onError: callbacks.onError,
      onComplete: callbacks.onComplete,
    }
  );
};

export const createDocumentStatusStream = (
  documentId: string,
  callbacks: {
    onProgress?: (progress: number) => void;
    onStatusUpdate?: (status: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
) => {
  // Try to use real-time updates first, fall back to polling
  if (typeof EventSource !== 'undefined') {
    return createRealtimeDocumentStream(documentId, callbacks);
  } else {
    return createPollingDocumentStream(documentId, callbacks);
  }
};

// Real-time document status using Server-Sent Events
function createRealtimeDocumentStream(
  documentId: string,
  callbacks: {
    onProgress?: (progress: number) => void;
    onStatusUpdate?: (status: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
): string {
  const streamId = `realtime-doc-${documentId}`;
  const clientId = `doc-client-${Date.now()}`;
  
  const eventSource = new EventSource(
    `/api/realtime?clientId=${clientId}&subscriptions=document_status`
  );
  
  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'document_status' && message.data.documentId === documentId) {
        const status = message.data;
        callbacks.onProgress?.(status.progress);
        callbacks.onStatusUpdate?.(status);
        
        if (status.status === 'ready' || status.status === 'error') {
          callbacks.onComplete?.();
          eventSource.close();
        }
      }
    } catch {
      console.warn('Failed to parse realtime message:', event.data);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('Realtime connection error:', error);
    eventSource.close();
    // Fall back to polling
    createPollingDocumentStream(documentId, callbacks);
  };
  
  // Also poll initially to get current status
  pollDocumentStatus(documentId, callbacks);
  
  return streamId;
}

// Polling fallback for document status
function createPollingDocumentStream(
  documentId: string,
  callbacks: {
    onProgress?: (progress: number) => void;
    onStatusUpdate?: (status: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
): string {
  const streamId = `polling-doc-${documentId}`;
  
  const poll = async () => {
    try {
      const status = await pollDocumentStatus(documentId, callbacks);
      
      if (status.status === 'ready' || status.status === 'error') {
        callbacks.onComplete?.();
      } else {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    } catch (error) {
      const appError = errorHandler.parseError(error);
      callbacks.onError?.(appError.message);
    }
  };
  
  poll();
  return streamId;
}

// Helper function to poll document status
async function pollDocumentStatus(
  documentId: string,
  callbacks: {
    onProgress?: (progress: number) => void;
    onStatusUpdate?: (status: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
): Promise<any> {
  const response = await fetch(`/api/documents/${documentId}/status?includeSteps=true`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const status = await response.json();
  callbacks.onProgress?.(status.progress);
  callbacks.onStatusUpdate?.(status);
  
  return status;
}

// Enhanced chat streaming with real-time updates
export const createEnhancedChatStream = (
  prompt: string,
  sourceIds: string[],
  callbacks: {
    onToken?: (token: string) => void;
    onArtefact?: (artefact: any) => void;
    onStatus?: (status: any) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
) => {
  const streamId = `enhanced-chat-${Date.now()}`;
  
  return streamManager.createFetchStream(
    streamId,
    {
      url: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sourceIds,
        conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        stream: true
      }),
    },
    {
      onData: (chunk: any) => {
        switch (chunk.type) {
          case 'token':
            callbacks.onToken?.(chunk.data);
            break;
          case 'artefact':
            callbacks.onArtefact?.(chunk.data);
            break;
          case 'status':
            callbacks.onStatus?.(chunk.data);
            break;
          case 'complete':
            callbacks.onComplete?.();
            break;
          case 'error':
            callbacks.onError?.(chunk.data);
            break;
        }
      },
      onError: callbacks.onError,
      onComplete: callbacks.onComplete,
    }
  );
};

// Utility to create real-time connection
export const createRealtimeConnection = (
  subscriptions: string[] = [],
  callbacks: {
    onMessage?: (message: any) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: string) => void;
  }
) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const subscriptionStr = subscriptions.join(',');
  
  const eventSource = new EventSource(
    `/api/realtime?clientId=${clientId}&subscriptions=${subscriptionStr}`
  );
  
  eventSource.onopen = () => {
    callbacks.onConnect?.();
  };
  
  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      callbacks.onMessage?.(message);
    } catch {
      console.warn('Failed to parse realtime message:', event.data);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('Realtime connection error:', error);
    callbacks.onError?.('Connection error');
    callbacks.onDisconnect?.();
  };
  
  return {
    clientId,
    close: () => eventSource.close(),
    readyState: () => eventSource.readyState
  };
};