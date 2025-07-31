// Article search and fetching functionality

import type { ArticleSearchQuery, ArticleSearchResult, Source } from './types';

// Mock article database for demonstration
const MOCK_ARTICLES: Omit<ArticleSearchResult, 'relevanceScore' | 'searchLabel'>[] = [
  {
    id: 'art_001',
    title: 'Efficacy and Safety of Novel Therapeutic Approaches in Oncology: A Comprehensive Meta-Analysis',
    abstract: 'This systematic review and meta-analysis evaluates the efficacy and safety profiles of emerging therapeutic modalities in oncology treatment. We analyzed data from 45 randomized controlled trials involving 12,847 patients across multiple cancer types. Results demonstrate significant improvements in overall survival (HR 0.72, 95% CI 0.65-0.81) with manageable safety profiles.',
    authors: ['Smith, J.A.', 'Johnson, M.B.', 'Williams, C.D.'],
    journal: 'Journal of Clinical Oncology',
    publicationDate: new Date('2024-01-15'),
    doi: '10.1200/JCO.2024.001',
    url: 'https://example.com/articles/001',
    citationCount: 127,
    keywords: ['oncology', 'meta-analysis', 'efficacy', 'safety', 'therapeutic']
  },
  {
    id: 'art_002',
    title: 'Cardiovascular Risk Assessment in Diabetes: Recent Advances and Clinical Implications',
    abstract: 'Recent developments in cardiovascular risk stratification for diabetic patients have revolutionized clinical practice. This review examines novel biomarkers, imaging techniques, and risk prediction models that enhance our ability to identify high-risk patients and optimize therapeutic interventions.',
    authors: ['Brown, K.L.', 'Davis, R.M.', 'Wilson, A.J.'],
    journal: 'Circulation',
    publicationDate: new Date('2024-02-20'),
    doi: '10.1161/CIRCULATIONAHA.124.002',
    url: 'https://example.com/articles/002',
    citationCount: 89,
    keywords: ['cardiovascular', 'diabetes', 'risk assessment', 'biomarkers']
  },
  {
    id: 'art_003',
    title: 'Neuroinflammation in Alzheimer\'s Disease: Mechanisms and Therapeutic Targets',
    abstract: 'Neuroinflammation plays a crucial role in Alzheimer\'s disease pathogenesis. This comprehensive review explores the molecular mechanisms underlying neuroinflammatory processes and evaluates emerging therapeutic strategies targeting inflammatory pathways in AD.',
    authors: ['Garcia, M.E.', 'Thompson, L.K.', 'Anderson, P.R.'],
    journal: 'Nature Reviews Neuroscience',
    publicationDate: new Date('2023-11-10'),
    doi: '10.1038/s41583-023-003',
    url: 'https://example.com/articles/003',
    citationCount: 203,
    keywords: ['neuroinflammation', 'alzheimer', 'therapeutic targets', 'mechanisms']
  },
  {
    id: 'art_004',
    title: 'Machine Learning Applications in Drug Discovery: Current State and Future Perspectives',
    abstract: 'Artificial intelligence and machine learning are transforming pharmaceutical research and drug discovery processes. This review examines current applications, challenges, and future opportunities for AI-driven approaches in identifying novel therapeutic compounds.',
    authors: ['Lee, S.H.', 'Patel, N.K.', 'Zhang, W.L.'],
    journal: 'Nature Drug Discovery',
    publicationDate: new Date('2024-03-05'),
    doi: '10.1038/s41573-024-004',
    url: 'https://example.com/articles/004',
    citationCount: 156,
    keywords: ['machine learning', 'drug discovery', 'artificial intelligence', 'pharmaceutical']
  },
  {
    id: 'art_005',
    title: 'Immunotherapy Resistance Mechanisms in Solid Tumors: A Systematic Review',
    abstract: 'Understanding resistance mechanisms to immunotherapy is critical for improving cancer treatment outcomes. This systematic review analyzes molecular pathways, tumor microenvironment factors, and patient characteristics associated with immunotherapy resistance.',
    authors: ['Miller, J.D.', 'Clark, S.A.', 'Rodriguez, C.M.'],
    journal: 'Cancer Cell',
    publicationDate: new Date('2023-12-18'),
    doi: '10.1016/j.ccell.2023.012',
    url: 'https://example.com/articles/005',
    citationCount: 94,
    keywords: ['immunotherapy', 'resistance', 'solid tumors', 'mechanisms']
  },
  {
    id: 'art_006',
    title: 'Precision Medicine in Psychiatry: Genomic Approaches to Treatment Selection',
    abstract: 'Precision medicine approaches in psychiatry leverage genomic data to optimize treatment selection and dosing. This review examines pharmacogenomic testing, genetic risk scores, and personalized treatment algorithms in mental health care.',
    authors: ['Taylor, R.B.', 'White, K.J.', 'Harris, M.L.'],
    journal: 'American Journal of Psychiatry',
    publicationDate: new Date('2024-01-30'),
    doi: '10.1176/appi.ajp.2024.001',
    url: 'https://example.com/articles/006',
    citationCount: 72,
    keywords: ['precision medicine', 'psychiatry', 'genomics', 'pharmacogenomics']
  },
  {
    id: 'art_007',
    title: 'CRISPR-Cas9 Gene Editing: Recent Clinical Applications and Safety Considerations',
    abstract: 'CRISPR-Cas9 technology has advanced from laboratory research to clinical applications. This comprehensive review examines recent clinical trials, therapeutic applications, and safety considerations for gene editing technologies in human medicine.',
    authors: ['Chen, L.Y.', 'Kumar, A.S.', 'Roberts, D.F.'],
    journal: 'New England Journal of Medicine',
    publicationDate: new Date('2024-02-14'),
    doi: '10.1056/NEJMra2400001',
    url: 'https://example.com/articles/007',
    citationCount: 189,
    keywords: ['CRISPR', 'gene editing', 'clinical applications', 'safety']
  },
  {
    id: 'art_008',
    title: 'Microbiome-Based Therapeutics: From Bench to Bedside',
    abstract: 'The human microbiome represents a promising therapeutic target for various diseases. This review explores microbiome-based interventions, including fecal microbiota transplantation, probiotics, and engineered microbial therapeutics.',
    authors: ['Johnson, P.K.', 'Liu, X.M.', 'Foster, A.R.'],
    journal: 'Cell',
    publicationDate: new Date('2023-10-25'),
    doi: '10.1016/j.cell.2023.010',
    url: 'https://example.com/articles/008',
    citationCount: 145,
    keywords: ['microbiome', 'therapeutics', 'probiotics', 'fecal transplantation']
  }
];

/**
 * Searches for articles based on query and filters
 */
export async function searchArticles(query: ArticleSearchQuery): Promise<ArticleSearchResult[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  const searchTerms = query.query.toLowerCase().split(/\s+/);
  const results: ArticleSearchResult[] = [];
  
  // Score and filter articles
  for (const article of MOCK_ARTICLES) {
    const relevanceScore = calculateRelevanceScore(article, searchTerms, query);
    
    if (relevanceScore > 0.1) { // Minimum relevance threshold
      // Apply filters
      if (passesFilters(article, query.filters)) {
        const searchLabel = determineSearchLabel(article, relevanceScore);
        
        results.push({
          ...article,
          relevanceScore,
          searchLabel
        });
      }
    }
  }
  
  // Sort by specified criteria
  sortResults(results, query.sortBy || 'relevance');
  
  // Limit results
  const maxResults = query.maxResults || 10;
  return results.slice(0, maxResults);
}

/**
 * Calculates relevance score for an article based on search terms
 */
function calculateRelevanceScore(
  article: Omit<ArticleSearchResult, 'relevanceScore' | 'searchLabel'>,
  searchTerms: string[],
  query: ArticleSearchQuery
): number {
  let score = 0;
  const titleWords = article.title.toLowerCase().split(/\s+/);
  const abstractWords = article.abstract.toLowerCase().split(/\s+/);
  const keywordWords = (article.keywords || []).map(k => k.toLowerCase());
  
  for (const term of searchTerms) {
    // Title matches (highest weight)
    if (titleWords.some(word => word.includes(term))) {
      score += 0.4;
    }
    
    // Exact title matches (bonus)
    if (article.title.toLowerCase().includes(term)) {
      score += 0.2;
    }
    
    // Abstract matches
    if (abstractWords.some(word => word.includes(term))) {
      score += 0.2;
    }
    
    // Keyword matches
    if (keywordWords.some(keyword => keyword.includes(term))) {
      score += 0.3;
    }
    
    // Author matches
    if (article.authors.some(author => author.toLowerCase().includes(term))) {
      score += 0.1;
    }
    
    // Journal matches
    if (article.journal.toLowerCase().includes(term)) {
      score += 0.1;
    }
  }
  
  // Boost score for recent articles
  const monthsOld = (Date.now() - article.publicationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsOld < 12) {
    score += 0.1 * (1 - monthsOld / 12);
  }
  
  // Boost score for highly cited articles
  if (article.citationCount && article.citationCount > 100) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Checks if an article passes the specified filters
 */
function passesFilters(
  article: Omit<ArticleSearchResult, 'relevanceScore' | 'searchLabel'>,
  filters?: ArticleSearchQuery['filters']
): boolean {
  if (!filters) return true;
  
  // Date range filter
  if (filters.dateRange) {
    const pubDate = article.publicationDate;
    if (filters.dateRange.start && pubDate < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && pubDate > filters.dateRange.end) {
      return false;
    }
  }
  
  // Journal filter
  if (filters.journals && filters.journals.length > 0) {
    const journalMatch = filters.journals.some(journal =>
      article.journal.toLowerCase().includes(journal.toLowerCase())
    );
    if (!journalMatch) return false;
  }
  
  // Author filter
  if (filters.authors && filters.authors.length > 0) {
    const authorMatch = filters.authors.some(filterAuthor =>
      article.authors.some(articleAuthor =>
        articleAuthor.toLowerCase().includes(filterAuthor.toLowerCase())
      )
    );
    if (!authorMatch) return false;
  }
  
  // Study type filter (simplified - would need more sophisticated classification)
  if (filters.studyTypes && filters.studyTypes.length > 0) {
    const hasStudyType = filters.studyTypes.some(type => {
      const titleAndAbstract = (article.title + ' ' + article.abstract).toLowerCase();
      switch (type) {
        case 'clinical_trial':
          return titleAndAbstract.includes('clinical trial') || 
                 titleAndAbstract.includes('randomized') ||
                 titleAndAbstract.includes('rct');
        case 'meta_analysis':
          return titleAndAbstract.includes('meta-analysis') ||
                 titleAndAbstract.includes('systematic review');
        case 'review':
          return titleAndAbstract.includes('review');
        case 'observational':
          return titleAndAbstract.includes('cohort') ||
                 titleAndAbstract.includes('observational');
        case 'case_study':
          return titleAndAbstract.includes('case study') ||
                 titleAndAbstract.includes('case report');
        default:
          return false;
      }
    });
    if (!hasStudyType) return false;
  }
  
  return true;
}

/**
 * Determines the search label for an article
 */
function determineSearchLabel(
  article: Omit<ArticleSearchResult, 'relevanceScore' | 'searchLabel'>,
  relevanceScore: number
): 'most_recent' | 'most_searched' | 'highly_relevant' {
  const monthsOld = (Date.now() - article.publicationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  // Most recent: published within last 6 months
  if (monthsOld < 6) {
    return 'most_recent';
  }
  
  // Most searched: high citation count (proxy for popularity)
  if (article.citationCount && article.citationCount > 150) {
    return 'most_searched';
  }
  
  // Highly relevant: high relevance score
  return 'highly_relevant';
}

/**
 * Sorts search results based on specified criteria
 */
function sortResults(results: ArticleSearchResult[], sortBy: 'relevance' | 'date' | 'citations') {
  switch (sortBy) {
    case 'relevance':
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;
    case 'date':
      results.sort((a, b) => b.publicationDate.getTime() - a.publicationDate.getTime());
      break;
    case 'citations':
      results.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
      break;
  }
}

/**
 * Converts search results to Source objects for integration with the sources rail
 */
export function convertSearchResultsToSources(results: ArticleSearchResult[]): Source[] {
  return results.map(result => ({
    id: result.id,
    title: result.title,
    status: 'ready' as const,
    progress: 100,
    selected: false,
    tags: result.keywords || [],
    uploadDate: new Date(), // When added to sources
    content: result.abstract,
    type: 'article',
    // Article-specific fields
    isSearchResult: true,
    searchLabel: result.searchLabel,
    relevanceScore: result.relevanceScore,
    abstract: result.abstract,
    authors: result.authors,
    journal: result.journal,
    publicationDate: result.publicationDate,
    doi: result.doi,
    url: result.url
  }));
}

/**
 * Generates a summary of search results for chat response
 */
export function generateSearchSummary(
  query: ArticleSearchQuery,
  results: ArticleSearchResult[]
): string {
  if (results.length === 0) {
    return `I couldn't find any articles matching "${query.query}". Try adjusting your search terms or filters.`;
  }
  
  const recentCount = results.filter(r => r.searchLabel === 'most_recent').length;
  const popularCount = results.filter(r => r.searchLabel === 'most_searched').length;
  const relevantCount = results.filter(r => r.searchLabel === 'highly_relevant').length;
  
  let summary = `I found ${results.length} relevant articles for "${query.query}":`;
  
  if (recentCount > 0) {
    summary += `\n• ${recentCount} recent publications (within 6 months)`;
  }
  if (popularCount > 0) {
    summary += `\n• ${popularCount} highly cited articles`;
  }
  if (relevantCount > 0) {
    summary += `\n• ${relevantCount} highly relevant matches`;
  }
  
  summary += `\n\nI've added these articles to your sources rail. You can now select them to include in our conversation.`;
  
  // Add top 3 article titles as examples
  const topArticles = results.slice(0, 3);
  if (topArticles.length > 0) {
    summary += `\n\n**Top matches:**`;
    topArticles.forEach((article, index) => {
      const label = article.searchLabel === 'most_recent' ? '🆕' : 
                   article.searchLabel === 'most_searched' ? '🔥' : '⭐';
      summary += `\n${index + 1}. ${label} ${article.title}`;
    });
  }
  
  return summary;
}