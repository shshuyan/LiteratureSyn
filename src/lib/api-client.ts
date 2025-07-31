// API client for handling streaming responses and document operations
import type { Source, Message, Artefact } from './types';
import { cachedFetch, apiCache, documentCache, searchCache, invalidateCache } from './cache-utils';

export interface ArtefactUpdate {
  id: string;
  type: 'moa' | 'safety' | 'kol';
  title: string;
  bullets: string[];
  status: 'generating' | 'ready';
  metadata?: Record<string, unknown>;
}

export interface ChatStreamChunk {
  type: 'token' | 'artefact' | 'complete' | 'error' | 'search_results';
  data: string | ArtefactUpdate | SearchResultsUpdate;
  messageId: string;
  timestamp: number;
}

export interface SearchResultsUpdate {
  sources: Source[];
  summary: string;
  query: string;
  totalCount: number;
}

export interface ApiError {
  type: 'network' | 'processing' | 'validation' | 'rate_limit' | 'server';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class ApiClient {
  private baseUrl: string;
  private maxRetries: number;
  private baseDelay: number;

  constructor(baseUrl: string = '/api', maxRetries: number = 3, baseDelay: number = 1000) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  // Enhanced error handling
  private handleApiError(error: any, response?: Response): ApiError {
    if (!navigator.onLine) {
      return {
        type: 'network',
        message: 'No internet connection. Please check your network and try again.',
        retryable: true
      };
    }

    if (response) {
      const statusCode = response.status;
      
      switch (statusCode) {
        case 400:
          return {
            type: 'validation',
            message: 'Invalid request. Please check your input and try again.',
            retryable: false,
            statusCode
          };
        case 429:
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          return {
            type: 'rate_limit',
            message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
            retryable: true,
            retryAfter,
            statusCode
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: 'server',
            message: 'Server error. Please try again in a moment.',
            retryable: true,
            statusCode
          };
        default:
          return {
            type: 'server',
            message: error.message || 'An unexpected error occurred.',
            retryable: statusCode >= 500,
            statusCode
          };
      }
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true
      };
    }

    return {
      type: 'processing',
      message: error.message || 'An unexpected error occurred.',
      retryable: false
    };
  }

  // Document upload with progress tracking
  async uploadDocument(
    file: File, 
    tags: string[] = [],
    onProgress?: (progress: number) => void
  ): Promise<Source> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tags', JSON.stringify(tags));

    try {
      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Convert to Source format
      const source: Source = {
        id: result.sourceId,
        title: result.title,
        status: 'processing',
        progress: 0,
        selected: false,
        tags: result.tags,
        uploadDate: new Date(result.uploadDate),
        size: result.size,
        type: result.type
      };

      // Start polling for status updates
      this.pollDocumentStatus(source.id, onProgress);

      return source;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Poll document processing status
  private async pollDocumentStatus(
    documentId: string, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const poll = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/documents/${documentId}/status`);
        
        if (!response.ok) {
          throw new Error('Status check failed');
        }

        const status = await response.json();
        
        if (onProgress) {
          onProgress(status.progress);
        }

        // Continue polling if still processing
        if (status.status === 'processing' && status.progress < 100) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    poll();
  }

  // Get document status with caching
  async getDocumentStatus(documentId: string): Promise<any> {
    const cacheKey = `doc-status-${documentId}`;
    
    try {
      return await cachedFetch(
        `${this.baseUrl}/documents/${documentId}/status`,
        {},
        cacheKey,
        30 * 1000 // 30 seconds cache for status
      );
    } catch {
      throw new Error('Failed to get document status');
    }
  }

  // Delete document with cache invalidation
  async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/status`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    // Invalidate related cache entries
    invalidateCache(`doc-status-${documentId}`);
    invalidateCache(`doc-${documentId}`);
  }

  // Stream chat response
  async streamChatResponse(
    prompt: string,
    sourceIds: string[],
    callbacks: {
      onToken?: (token: string) => void;
      onArtefact?: (artefact: ArtefactUpdate) => void;
      onSearchResults?: (results: SearchResultsUpdate) => void;
      onComplete?: () => void;
      onError?: (error: string) => void;
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          sourceIds,
          conversationId: this.generateConversationId(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const parsed: ChatStreamChunk = JSON.parse(line);
              
              switch (parsed.type) {
                case 'token':
                  const token = parsed.data as string;
                  fullResponse += token;
                  callbacks.onToken?.(token);
                  break;
                  
                case 'artefact':
                  const artefact = parsed.data as ArtefactUpdate;
                  callbacks.onArtefact?.(artefact);
                  break;
                  
                case 'search_results':
                  const searchResults = parsed.data as SearchResultsUpdate;
                  callbacks.onSearchResults?.(searchResults);
                  break;
                  
                case 'complete':
                  callbacks.onComplete?.();
                  return fullResponse;
                  
                case 'error':
                  const errorMsg = parsed.data as string;
                  callbacks.onError?.(errorMsg);
                  throw new Error(errorMsg);
              }
            } catch {
              console.warn('Failed to parse stream chunk:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullResponse;
    } catch (error) {
      console.error('Stream chat error:', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Generate conversation ID
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Generate artefact
  async generateArtefact(
    type: 'moa' | 'safety' | 'kol',
    sourceIds: string[],
    regenerate: boolean = false
  ): Promise<ArtefactUpdate> {
    return this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/artefacts/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds,
          conversationId: this.generateConversationId(),
          regenerate,
        }),
      });

      if (!response.ok) {
        const apiError = this.handleApiError(new Error('Artefact generation failed'), response);
        throw new Error(apiError.message);
      }

      const result = await response.json();
      return {
        id: result.id,
        type: result.type,
        title: result.title,
        bullets: result.bullets,
        status: result.status,
      };
    });
  }

  // Get artefact by ID with caching
  async getArtefact(type: 'moa' | 'safety' | 'kol', artefactId: string): Promise<ArtefactUpdate> {
    const cacheKey = `artefact-${type}-${artefactId}`;
    
    return this.withRetry(async () => {
      try {
        return await cachedFetch(
          `${this.baseUrl}/artefacts/${type}?id=${artefactId}`,
          {},
          cacheKey,
          5 * 60 * 1000 // 5 minutes cache for artefacts
        );
      } catch {
        const apiError = this.handleApiError(new Error('Failed to fetch artefact'));
        throw new Error(apiError.message);
      }
    });
  }

  // Search articles with caching
  async searchArticles(query: string, filters?: Record<string, any>): Promise<SearchResultsUpdate> {
    const cacheKey = `search-${query}`;
    const cacheParams = filters;
    
    try {
      const cached = searchCache.get(cacheKey, cacheParams);
      if (cached && !searchCache.isStaleData(cacheKey, cacheParams)) {
        return cached;
      }

      const response = await fetch(`${this.baseUrl}/articles/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, filters }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const results = await response.json();
      searchCache.set(cacheKey, results, cacheParams);
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Cache management methods
  clearCache(type?: 'api' | 'documents' | 'search' | 'all') {
    switch (type) {
      case 'api':
        apiCache.clear();
        break;
      case 'documents':
        documentCache.clear();
        break;
      case 'search':
        searchCache.clear();
        break;
      case 'all':
      default:
        apiCache.clear();
        documentCache.clear();
        searchCache.clear();
        break;
    }
  }

  getCacheStats() {
    return {
      api: apiCache.getStats(),
      search: searchCache.getStats(),
    };
  }

  // Enhanced upload with retry logic
  async uploadDocumentWithRetry(
    file: File, 
    tags: string[] = [],
    onProgress?: (progress: number) => void,
    onStatusUpdate?: (status: any) => void
  ): Promise<Source> {
    return this.withRetry(async () => {
      const source = await this.uploadDocument(file, tags, onProgress);
      
      // Enhanced polling with status updates
      if (onStatusUpdate) {
        this.pollDocumentStatusWithCallback(source.id, onProgress, onStatusUpdate);
      }
      
      return source;
    });
  }

  // Enhanced polling with status callback
  private async pollDocumentStatusWithCallback(
    documentId: string, 
    onProgress?: (progress: number) => void,
    onStatusUpdate?: (status: any) => void
  ): Promise<void> {
    const poll = async () => {
      try {
        const status = await this.getDocumentStatus(documentId);
        
        if (onProgress) {
          onProgress(status.progress);
        }
        
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        // Continue polling if still processing
        if (status.status === 'processing' && status.progress < 100) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Status polling error:', error);
        if (onStatusUpdate) {
          onStatusUpdate({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    };

    poll();
  }

  // Retry logic wrapper
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    delay: number = this.baseDelay
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if error is retryable
        const apiError = this.handleApiError(lastError);
        if (!apiError.retryable || attempt === maxRetries) {
          throw lastError;
        }

        // Use retry-after header if available
        const waitTime = apiError.retryAfter ? 
          apiError.retryAfter * 1000 : 
          delay * Math.pow(2, attempt - 1);
          
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError!;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();