// Natural language processing for detecting article search intents in chat

import type { SearchIntent, ArticleSearchQuery } from './types';

// Keywords that indicate search intent
const SEARCH_KEYWORDS = [
  'search', 'find', 'look for', 'retrieve', 'fetch', 'get articles',
  'papers about', 'studies on', 'research on', 'literature on',
  'publications about', 'articles about', 'show me', 'give me',
  'recent papers', 'latest research', 'new studies', 'current literature'
];

// Keywords for temporal filters
const TEMPORAL_KEYWORDS = {
  recent: ['recent', 'latest', 'new', 'current', 'modern', 'contemporary'],
  old: ['old', 'historical', 'past', 'previous', 'earlier', 'classic'],
  year: ['2024', '2023', '2022', '2021', '2020', 'last year', 'this year'],
  timeframe: ['last month', 'past year', 'recent years', 'decade', 'century']
};

// Keywords for study types
const STUDY_TYPE_KEYWORDS = {
  clinical_trial: ['clinical trial', 'rct', 'randomized', 'controlled trial', 'phase'],
  meta_analysis: ['meta-analysis', 'systematic review', 'meta analysis', 'pooled analysis'],
  observational: ['observational', 'cohort', 'case-control', 'cross-sectional'],
  review: ['review', 'narrative review', 'literature review', 'overview'],
  case_study: ['case study', 'case report', 'case series']
};

// Common journal abbreviations and names
const JOURNAL_KEYWORDS = [
  'nejm', 'new england journal', 'lancet', 'jama', 'bmj', 'nature',
  'science', 'cell', 'plos', 'cochrane', 'pubmed', 'medline'
];

/**
 * Analyzes a chat message to determine if it contains an article search intent
 */
export function analyzeSearchIntent(message: string): SearchIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for explicit search keywords
  const hasSearchKeywords = SEARCH_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword)
  );
  
  // Check for question patterns that might indicate search
  const hasQuestionPattern = /^(what|how|when|where|why|which|who)\s+.*\?/i.test(message) ||
    /can you (find|search|show|get)/i.test(message) ||
    /i need.*about/i.test(message) ||
    /looking for.*on/i.test(message);
  
  // Calculate confidence based on multiple factors
  let confidence = 0;
  
  if (hasSearchKeywords) confidence += 0.6;
  if (hasQuestionPattern) confidence += 0.3;
  
  // Additional confidence boosters
  if (lowerMessage.includes('article') || lowerMessage.includes('paper')) confidence += 0.2;
  if (lowerMessage.includes('study') || lowerMessage.includes('research')) confidence += 0.2;
  if (lowerMessage.includes('literature') || lowerMessage.includes('publication')) confidence += 0.2;
  
  // Reduce confidence for conversational patterns
  if (lowerMessage.includes('what do you think') || 
      lowerMessage.includes('in your opinion') ||
      lowerMessage.includes('can you explain')) {
    confidence -= 0.3;
  }
  
  // Determine if this is likely a search intent
  const isSearchIntent = confidence >= 0.5;
  
  if (!isSearchIntent) {
    return {
      type: 'regular_chat',
      confidence: 1 - confidence
    };
  }
  
  // Extract search query and filters
  const extractedQuery = extractSearchQuery(message);
  const searchTerms = extractSearchTerms(message);
  const filters = extractFilters(message);
  
  return {
    type: 'article_search',
    confidence,
    extractedQuery,
    searchTerms,
    filters
  };
}

/**
 * Extracts the main search query from the message
 */
function extractSearchQuery(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Try to extract query after common search phrases
  const searchPatterns = [
    /search for (.+?)(?:\.|$)/i,
    /find (?:articles?|papers?|studies?) (?:about|on) (.+?)(?:\.|$)/i,
    /looking for (.+?)(?:\.|$)/i,
    /research on (.+?)(?:\.|$)/i,
    /literature (?:about|on) (.+?)(?:\.|$)/i,
    /papers? (?:about|on) (.+?)(?:\.|$)/i,
    /studies? (?:about|on) (.+?)(?:\.|$)/i,
    /show me (.+?)(?:\.|$)/i,
    /get me (.+?)(?:\.|$)/i
  ];
  
  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: remove common search keywords and return the rest
  let cleanedMessage = message;
  SEARCH_KEYWORDS.forEach(keyword => {
    cleanedMessage = cleanedMessage.replace(new RegExp(keyword, 'gi'), '');
  });
  
  return cleanedMessage.trim().replace(/^(about|on|for)\s+/i, '');
}

/**
 * Extracts individual search terms from the message
 */
function extractSearchTerms(message: string): string[] {
  const query = extractSearchQuery(message);
  
  // Split on common delimiters and filter out stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under'
  ]);
  
  return query
    .split(/[\s,;]+/)
    .map(term => term.toLowerCase().replace(/[^\w]/g, ''))
    .filter(term => term.length > 2 && !stopWords.has(term));
}

/**
 * Extracts filters from the message (date ranges, study types, etc.)
 */
function extractFilters(message: string): ArticleSearchQuery['filters'] {
  const lowerMessage = message.toLowerCase();
  const filters: ArticleSearchQuery['filters'] = {};
  
  // Extract date range filters
  const dateRange = extractDateRange(lowerMessage);
  if (dateRange) {
    filters.dateRange = dateRange;
  }
  
  // Extract study type filters
  const studyTypes = extractStudyTypes(lowerMessage);
  if (studyTypes.length > 0) {
    filters.studyTypes = studyTypes;
  }
  
  // Extract journal filters
  const journals = extractJournals(lowerMessage);
  if (journals.length > 0) {
    filters.journals = journals;
  }
  
  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Extracts date range from temporal keywords
 */
function extractDateRange(message: string): { start?: Date; end?: Date } | undefined {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Check for specific years
  const yearMatch = message.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    };
  }
  
  // Check for relative time periods
  if (TEMPORAL_KEYWORDS.recent.some(keyword => message.includes(keyword))) {
    // Recent = last 2 years
    return {
      start: new Date(currentYear - 2, 0, 1),
      end: now
    };
  }
  
  if (message.includes('last year')) {
    return {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31)
    };
  }
  
  if (message.includes('this year')) {
    return {
      start: new Date(currentYear, 0, 1),
      end: now
    };
  }
  
  if (message.includes('past year')) {
    return {
      start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      end: now
    };
  }
  
  return undefined;
}

/**
 * Extracts study types from the message
 */
function extractStudyTypes(message: string): string[] {
  const studyTypes: string[] = [];
  
  Object.entries(STUDY_TYPE_KEYWORDS).forEach(([type, keywords]) => {
    if (keywords.some(keyword => message.includes(keyword))) {
      studyTypes.push(type);
    }
  });
  
  return studyTypes;
}

/**
 * Extracts journal names from the message
 */
function extractJournals(message: string): string[] {
  const journals: string[] = [];
  
  JOURNAL_KEYWORDS.forEach(journal => {
    if (message.includes(journal)) {
      journals.push(journal);
    }
  });
  
  return journals;
}

/**
 * Generates a search query object from analyzed intent
 */
export function createSearchQuery(intent: SearchIntent): ArticleSearchQuery | null {
  if (intent.type !== 'article_search' || !intent.extractedQuery) {
    return null;
  }
  
  return {
    query: intent.extractedQuery,
    filters: intent.filters,
    maxResults: 10,
    sortBy: 'relevance'
  };
}