import { NextRequest, NextResponse } from 'next/server';
import { searchArticles, generateSearchSummary } from '@/lib/article-search';
import type { ArticleSearchQuery } from '@/lib/types';

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ArticleSearchQuery = await request.json();
    
    // Validate request
    if (!body.query || !body.query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Perform article search
    const results = await searchArticles(body);
    
    // Generate summary for chat response
    const summary = generateSearchSummary(body, results);
    
    return NextResponse.json({
      query: body.query,
      results,
      summary,
      totalCount: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Article search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during article search' },
      { status: 500 }
    );
  }
}