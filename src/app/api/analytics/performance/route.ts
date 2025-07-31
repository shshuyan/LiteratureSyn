import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();
    
    // In production, you would send this to your analytics service
    // For now, we'll just log it
    console.log('Performance Metric Received:', {
      ...metric,
      timestamp: new Date(metric.timestamp).toISOString(),
    });
    
    // You could integrate with services like:
    // - Google Analytics 4
    // - Vercel Analytics
    // - DataDog RUM
    // - New Relic
    // - Custom analytics service
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process performance metric:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}