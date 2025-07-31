import { NextRequest, NextResponse } from 'next/server';

interface ArtefactRequest {
  sourceIds: string[];
  conversationId?: string;
  regenerate?: boolean;
}

interface ArtefactResponse {
  id: string;
  type: 'moa' | 'safety' | 'kol';
  title: string;
  bullets: string[];
  status: 'ready';
  metadata: {
    sourceCount: number;
    generatedAt: string;
    version: number;
  };
}

// Sample data for different artefact types
const artefactTemplates = {
  moa: {
    title: 'Mechanism of Action Brief',
    bullets: [
      'Primary pathway involves receptor binding and downstream signaling cascades',
      'Secondary effects include metabolic pathway modulation and cellular response',
      'Tissue-specific responses vary based on receptor density and distribution',
      'Duration of action correlates with half-life and clearance mechanisms',
      'Dose-response relationship follows predictable pharmacokinetic principles'
    ]
  },
  safety: {
    title: 'Safety Profile Brief',
    bullets: [
      'Common adverse events are generally mild to moderate in severity',
      'Contraindications include pregnancy and severe hepatic impairment',
      'Drug interactions primarily involve CYP3A4 inhibitors and inducers',
      'Monitoring requirements include periodic liver function assessments',
      'Special populations may require dose adjustments or additional monitoring'
    ]
  },
  kol: {
    title: 'KOL Sentiment Analysis',
    bullets: [
      'Overall sentiment is cautiously optimistic with 72% positive feedback',
      'Key concerns center around long-term safety data availability',
      'Adoption drivers include superior efficacy profile and dosing convenience',
      'Market positioning shows competitive advantage in specific patient populations',
      'Future research priorities focus on real-world effectiveness studies'
    ]
  }
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    const body: ArtefactRequest = await request.json();
    const { sourceIds, conversationId, regenerate = false } = body;

    // Validate artefact type
    if (!['moa', 'safety', 'kol'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid artefact type' },
        { status: 400 }
      );
    }

    // Validate source IDs
    if (!sourceIds || sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one source must be provided' },
        { status: 400 }
      );
    }

    // Generate artefact ID
    const artefactId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Get template for the requested type
    const template = artefactTemplates[type as keyof typeof artefactTemplates];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Create artefact response
    const artefact: ArtefactResponse = {
      id: artefactId,
      type: type as 'moa' | 'safety' | 'kol',
      title: template.title,
      bullets: template.bullets,
      status: 'ready',
      metadata: {
        sourceCount: sourceIds.length,
        generatedAt: new Date().toISOString(),
        version: regenerate ? Math.floor(Math.random() * 10) + 1 : 1
      }
    };

    return NextResponse.json(artefact);
  } catch (error) {
    console.error('Artefact generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    const { searchParams } = new URL(request.url);
    const artefactId = searchParams.get('id');

    if (!artefactId) {
      return NextResponse.json(
        { error: 'Artefact ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would fetch from database
    // For now, return a mock artefact
    const template = artefactTemplates[type as keyof typeof artefactTemplates];
    
    if (!template) {
      return NextResponse.json(
        { error: 'Artefact not found' },
        { status: 404 }
      );
    }

    const artefact: ArtefactResponse = {
      id: artefactId,
      type: type as 'moa' | 'safety' | 'kol',
      title: template.title,
      bullets: template.bullets,
      status: 'ready',
      metadata: {
        sourceCount: 3,
        generatedAt: new Date().toISOString(),
        version: 1
      }
    };

    return NextResponse.json(artefact);
  } catch (error) {
    console.error('Artefact fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}