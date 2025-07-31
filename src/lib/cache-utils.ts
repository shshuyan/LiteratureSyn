'use client';

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  staleWhileRevalidate: boolean; // Return stale data while fetching fresh
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  stale: boolean;
}

// In-memory cache implementation
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      staleWhileRevalidate: true,
      ...config,
    };
  }

  // Generate cache key from parameters
  private generateKey(key: string, params?: Record<string, any>): string {
    if (!params) return key;
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|');
    return `${key}:${sortedParams}`;
  }

  // Check if entry is expired
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Check if entry is stale (for stale-while-revalidate)
  private isStale(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 0.8; // 80% of TTL
  }

  // Evict oldest entries when cache is full
  private evictOldest(): void {
    if (this.cache.size < this.config.maxSize) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Get cached data
  get(key: string, params?: Record<string, any>): T | null {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Remove expired entries
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Mark as stale if needed
    if (this.isStale(entry)) {
      entry.stale = true;
    }

    return entry.data;
  }

  // Set cached data
  set(key: string, data: T, params?: Record<string, any>, customTtl?: number): void {
    const cacheKey = this.generateKey(key, params);
    
    this.evictOldest();

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.config.ttl,
      stale: false,
    });
  }

  // Check if data is stale (for stale-while-revalidate)
  isStaleData(key: string, params?: Record<string, any>): boolean {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);
    return entry ? entry.stale : false;
  }

  // Delete cached entry
  delete(key: string, params?: Record<string, any>): void {
    const cacheKey = this.generateKey(key, params);
    this.cache.delete(cacheKey);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        stale: entry.stale,
        expired: this.isExpired(entry),
      })),
    };
  }
}

// Browser storage cache (localStorage/sessionStorage)
export class StorageCache<T = any> {
  private storage: Storage;
  private prefix: string;
  private config: CacheConfig;

  constructor(
    storage: 'localStorage' | 'sessionStorage' = 'localStorage',
    prefix = 'lit-synth-cache',
    config: Partial<CacheConfig> = {}
  ) {
    this.storage = typeof window !== 'undefined' 
      ? window[storage] 
      : { 
          getItem: () => null, 
          setItem: () => {}, 
          removeItem: () => {},
          length: 0,
          clear: () => {},
          key: () => null
        } as Storage;
    this.prefix = prefix;
    this.config = {
      ttl: 30 * 60 * 1000, // 30 minutes default for persistent storage
      maxSize: 50,
      staleWhileRevalidate: true,
      ...config,
    };
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get(key: string): T | null {
    try {
      const stored = this.storage.getItem(this.getStorageKey(key));
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to get from storage cache:', error);
      return null;
    }
  }

  set(key: string, data: T, customTtl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: customTtl || this.config.ttl,
        stale: false,
      };

      this.storage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set storage cache:', error);
      // Try to clear some space and retry
      this.cleanup();
      try {
        this.storage.setItem(this.getStorageKey(key), JSON.stringify({ data, timestamp: Date.now(), ttl: customTtl || this.config.ttl, stale: false }));
      } catch (retryError) {
        console.error('Failed to set storage cache after cleanup:', retryError);
      }
    }
  }

  delete(key: string): void {
    this.storage.removeItem(this.getStorageKey(key));
  }

  // Clean up expired entries
  cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const stored = this.storage.getItem(key);
          if (stored) {
            const entry: CacheEntry<T> = JSON.parse(stored);
            if (Date.now() - entry.timestamp > entry.ttl) {
              keysToDelete.push(key);
            }
          }
        } catch {
          // Invalid entry, mark for deletion
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.storage.removeItem(key));
  }

  clear(): void {
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.removeItem(key));
  }
}

// HTTP cache headers utility
export function getCacheHeaders(maxAge: number, staleWhileRevalidate = true): HeadersInit {
  const headers: HeadersInit = {
    'Cache-Control': `public, max-age=${maxAge}`,
  };

  if (staleWhileRevalidate) {
    headers['Cache-Control'] += `, stale-while-revalidate=${maxAge * 2}`;
  }

  return headers;
}

// Cache instances
export const apiCache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  staleWhileRevalidate: true,
});

export const documentCache = new StorageCache('localStorage', 'lit-synth-docs', {
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 20,
});

export const searchCache = new MemoryCache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 50,
});

// Cache-aware fetch wrapper
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheTtl?: number
): Promise<T> {
  const key = cacheKey || url;
  
  // Try to get from cache first
  const cached = apiCache.get(key);
  if (cached && !apiCache.isStaleData(key)) {
    return cached;
  }

  // If we have stale data and stale-while-revalidate is enabled, return it
  // while fetching fresh data in the background
  if (cached && apiCache.isStaleData(key)) {
    // Return stale data immediately
    setTimeout(async () => {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          const freshData = await response.json();
          apiCache.set(key, freshData, undefined, cacheTtl);
        }
      } catch (error) {
        console.warn('Background refresh failed:', error);
      }
    }, 0);
    
    return cached;
  }

  // Fetch fresh data
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  apiCache.set(key, data, undefined, cacheTtl);
  
  return data;
}

// Preload cache utility
export function preloadCache(entries: Array<{ key: string; url: string; options?: RequestInit }>) {
  entries.forEach(async ({ key, url, options }) => {
    try {
      await cachedFetch(url, options, key);
    } catch (error) {
      console.warn(`Failed to preload cache for ${key}:`, error);
    }
  });
}

// Cache invalidation utility
export function invalidateCache(pattern: string | RegExp) {
  // Clear memory cache entries matching pattern
  const stats = apiCache.getStats();
  stats.entries.forEach(({ key }) => {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      apiCache.delete(key);
    }
  });

  // Clear storage cache
  if (typeof pattern === 'string') {
    documentCache.delete(pattern);
  }
}