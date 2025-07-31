// Core data types for the Literature Synthesizer

export interface Source {
  id: string;
  title: string;
  status: 'idle' | 'processing' | 'embedding' | 'ready' | 'error';
  progress: number;
  selected: boolean;
  tags: string[];
  uploadDate: Date;
  content?: string;
  errorMessage?: string;
  size?: number;
  type?: string;
  // Article search specific fields
  isSearchResult?: boolean;
  searchLabel?: 'most_recent' | 'most_searched' | 'highly_relevant';
  relevanceScore?: number;
  abstract?: string;
  authors?: string[];
  journal?: string;
  publicationDate?: Date;
  doi?: string;
  url?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  html?: string;
  timestamp: Date;
  sourceIds?: string[];
  isStreaming?: boolean;
}

export interface Artefact {
  id: string;
  type: 'moa' | 'safety' | 'kol';
  title: string;
  bullets: string[];
  status: 'idle' | 'generating' | 'ready' | 'error';
  metadata: Record<string, unknown>;
  lastGenerated?: Date;
  errorMessage?: string;
}

export interface SourceFilters {
  search: string;
  tags: string[];
}

export type Theme = 'light' | 'dark';

export interface UIState {
  theme: Theme;
  insightPanelCollapsed: boolean;
  activeModal: string | null;
  sidebarOpen: boolean;
  connectionStatus: 'online' | 'offline' | 'reconnecting';
  isOfflineMode: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: {
    type: 'network' | 'validation' | 'server' | 'rate_limit' | 'processing' | 'timeout';
    message: string;
    code?: string;
    retryable: boolean;
    retryAfter?: number;
    context?: Record<string, unknown>;
  };
  retryCount: number;
  lastRetryAt?: Date;
}

export interface GlobalState {
  loading: LoadingState;
  error: ErrorState;
}

export interface ArticleSearchQuery {
  query: string;
  filters?: {
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    journals?: string[];
    authors?: string[];
    studyTypes?: string[];
  };
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'citations';
}

export interface ArticleSearchResult {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: Date;
  doi?: string;
  url?: string;
  relevanceScore: number;
  searchLabel: 'most_recent' | 'most_searched' | 'highly_relevant';
  citationCount?: number;
  keywords?: string[];
}

export interface SearchIntent {
  type: 'article_search' | 'regular_chat';
  confidence: number;
  extractedQuery?: string;
  searchTerms?: string[];
  filters?: ArticleSearchQuery['filters'];
}