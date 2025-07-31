import { NextRequest, NextResponse } from 'next/server';
import { analyzeSearchIntent, createSearchQuery } from '@/lib/search-intent';
import { searchArticles, generateSearchSummary, convertSearchResultsToSources } from '@/lib/article-search';

interface ChatRequest {
  prompt: string;
  sourceIds: string[];
  conversationId?: string;
  stream?: boolean;
}

interface ChatStreamChunk {
  type: 'token' | 'artefact' | 'complete' | 'error' | 'status' | 'search_results';
  data: string | ArtefactUpdate | StatusUpdate | SearchResultsUpdate;
  messageId: string;
  timestamp: number;
}

interface SearchResultsUpdate {
  sources: any[];
  summary: string;
  query: string;
  totalCount: number;
}

interface ArtefactUpdate {
  id: string;
  type: 'moa' | 'safety' | 'kol';
  title: string;
  bullets: string[];
  status: 'generating' | 'ready';
  metadata?: Record<string, unknown>;
}

interface StatusUpdate {
  status: 'processing' | 'generating_artefacts' | 'complete';
  message: string;
  progress?: number;
}

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
    const body: ChatRequest = await request.json();
    const { prompt, sourceIds } = body;

    // Validate request
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check for search intent first - if it's a search, we don't require sources
    const searchIntent = analyzeSearchIntent(prompt);
    const isSearchQuery = searchIntent.type === 'article_search' && searchIntent.confidence > 0.5;

    if (!isSearchQuery && (!sourceIds || sourceIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one source must be selected for regular chat' },
        { status: 400 }
      );
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming response
        simulateStreamingResponse(controller, encoder, messageId, prompt, sourceIds);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function simulateStreamingResponse(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  prompt: string,
  sourceIds: string[]
) {
  try {
    // Check for search intent
    const searchIntent = analyzeSearchIntent(prompt);
    const isSearchQuery = searchIntent.type === 'article_search' && searchIntent.confidence > 0.5;

    if (isSearchQuery) {
      // Handle article search
      await handleArticleSearch(controller, encoder, messageId, prompt, searchIntent);
      return;
    }

    // Send initial status update for regular chat
    const statusChunk: ChatStreamChunk = {
      type: 'status',
      data: {
        status: 'processing',
        message: 'Analyzing selected sources...',
        progress: 10
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(statusChunk) + '\n'));
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate RAG processing with enhanced response
    const sampleResponse = generateContextualResponse(prompt, sourceIds.length);

    // Send processing status
    const processingChunk: ChatStreamChunk = {
      type: 'status',
      data: {
        status: 'processing',
        message: 'Generating response...',
        progress: 30
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(processingChunk) + '\n'));
    await new Promise(resolve => setTimeout(resolve, 300));

    // Stream tokens with realistic timing
    const words = sampleResponse.split(' ');
    const totalWords = words.length;
    
    for (let i = 0; i < words.length; i++) {
      const chunk: ChatStreamChunk = {
        type: 'token',
        data: words[i] + (i < words.length - 1 ? ' ' : ''),
        messageId,
        timestamp: Date.now()
      };
      
      controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
      
      // Variable typing speed with occasional pauses for realism
      const baseDelay = 30 + Math.random() * 70;
      const pauseChance = Math.random();
      const delay = pauseChance < 0.1 ? baseDelay * 3 : baseDelay; // 10% chance of longer pause
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Send progress updates during streaming
      if (i % Math.floor(totalWords / 3) === 0 && i > 0) {
        const progress = 30 + Math.floor((i / totalWords) * 40);
        const progressChunk: ChatStreamChunk = {
          type: 'status',
          data: {
            status: 'processing',
            message: 'Streaming response...',
            progress
          } as StatusUpdate,
          messageId,
          timestamp: Date.now()
        };
        controller.enqueue(encoder.encode(JSON.stringify(progressChunk) + '\n'));
      }
    }

    // Generate artifacts after main response
    const artefactStatusChunk: ChatStreamChunk = {
      type: 'status',
      data: {
        status: 'generating_artefacts',
        message: 'Generating insight cards...',
        progress: 75
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(artefactStatusChunk) + '\n'));

    await generateArtefacts(controller, encoder, messageId, sourceIds);

    // Send completion signal
    const completeChunk: ChatStreamChunk = {
      type: 'complete',
      data: {
        status: 'complete',
        message: 'Response generated successfully',
        progress: 100
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    
    controller.enqueue(encoder.encode(JSON.stringify(completeChunk) + '\n'));
    controller.close();
  } catch (error) {
    console.error('Streaming error:', error);
    const errorChunk: ChatStreamChunk = {
      type: 'error',
      data: error instanceof Error ? error.message : 'An error occurred while generating the response',
      messageId,
      timestamp: Date.now()
    };
    
    controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
    controller.close();
  }
}

function generateContextualResponse(prompt: string, sourceCount: number): string {
  // Generate more contextual responses based on prompt content
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('safety') || promptLower.includes('adverse') || promptLower.includes('side effect')) {
    return `Based on the safety analysis of ${sourceCount} selected sources regarding "${prompt}":

**Safety Profile Overview**: The literature demonstrates a generally favorable safety profile with well-characterized adverse event patterns.

**Key Safety Findings**:
• **Common Events**: Most frequently reported adverse events are mild to moderate in severity and transient in nature
• **Serious Events**: Rare but documented serious adverse events require careful monitoring and risk assessment
• **Population Considerations**: Certain patient populations may require dose adjustments or enhanced monitoring protocols

**Risk Mitigation**: The evidence supports established risk management strategies including regular monitoring, patient education, and appropriate contraindication screening.

**Clinical Implications**: The benefit-risk profile supports continued use with appropriate patient selection and monitoring protocols.`;
  }
  
  if (promptLower.includes('mechanism') || promptLower.includes('moa') || promptLower.includes('pathway')) {
    return `Based on mechanistic analysis of ${sourceCount} selected sources regarding "${prompt}":

**Mechanism of Action Summary**: The literature reveals a well-characterized mechanism involving multiple interconnected pathways.

**Primary Mechanisms**:
• **Target Engagement**: Direct interaction with primary molecular targets leads to downstream signaling cascade activation
• **Pathway Modulation**: Secondary pathway effects contribute to overall therapeutic response and duration of action
• **Tissue Distribution**: Mechanism varies across tissue types based on target expression and local microenvironment

**Pharmacological Considerations**: The mechanism supports the observed pharmacokinetic-pharmacodynamic relationships and explains tissue-specific responses.

**Research Gaps**: Some mechanistic details remain under investigation, particularly regarding long-term pathway adaptations.`;
  }
  
  if (promptLower.includes('efficacy') || promptLower.includes('effectiveness') || promptLower.includes('outcome')) {
    return `Based on efficacy analysis of ${sourceCount} selected sources regarding "${prompt}":

**Efficacy Overview**: The literature demonstrates consistent efficacy across multiple clinical endpoints and patient populations.

**Primary Outcomes**:
• **Clinical Response**: Significant improvements observed in primary efficacy endpoints across pivotal studies
• **Duration of Effect**: Sustained responses maintained throughout treatment periods with appropriate dosing
• **Patient Populations**: Efficacy demonstrated across diverse patient demographics and disease severities

**Comparative Effectiveness**: Head-to-head comparisons suggest competitive or superior efficacy relative to standard treatments.

**Real-World Evidence**: Post-marketing data supports clinical trial findings with consistent effectiveness in routine clinical practice.`;
  }
  
  // Default comprehensive response
  return `Based on comprehensive analysis of ${sourceCount} selected sources regarding "${prompt}":

**Literature Synthesis**: The evidence base provides robust insights across multiple dimensions of your query.

**Key Findings**:
• **Primary Evidence**: Multiple high-quality studies support the main conclusions with consistent findings across different research groups
• **Methodological Strength**: The studies employ rigorous methodologies including appropriate controls, adequate sample sizes, and validated endpoints
• **Clinical Relevance**: Findings translate effectively to clinical practice with clear implications for patient care and treatment decisions

**Evidence Quality**: The overall quality of evidence is high, with convergent findings from multiple independent research groups strengthening confidence in the conclusions.

**Future Directions**: The literature identifies several promising areas for continued research that could further enhance understanding and clinical applications.

This synthesis integrates findings from your ${sourceCount} selected sources to provide a comprehensive perspective on your query.`;
}

async function generateArtefacts(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  sourceIds: string[]
) {
  // Generate MoA Brief
  const moaArtefact: ArtefactUpdate = {
    id: 'moa_' + Date.now(),
    type: 'moa',
    title: 'Mechanism of Action Brief',
    bullets: [
      'Primary pathway involves receptor binding and downstream signaling',
      'Secondary effects include metabolic pathway modulation',
      'Tissue-specific responses vary based on receptor density',
      'Duration of action correlates with half-life and clearance rate'
    ],
    status: 'ready'
  };

  const moaChunk: ChatStreamChunk = {
    type: 'artefact',
    data: moaArtefact,
    messageId,
    timestamp: Date.now()
  };
  
  controller.enqueue(encoder.encode(JSON.stringify(moaChunk) + '\n'));
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate Safety Brief
  const safetyArtefact: ArtefactUpdate = {
    id: 'safety_' + Date.now(),
    type: 'safety',
    title: 'Safety Profile Brief',
    bullets: [
      'Common adverse events: mild to moderate in severity',
      'Contraindications: pregnancy, severe hepatic impairment',
      'Drug interactions: CYP3A4 inhibitors may increase exposure',
      'Monitoring requirements: liver function tests recommended'
    ],
    status: 'ready'
  };

  const safetyChunk: ChatStreamChunk = {
    type: 'artefact',
    data: safetyArtefact,
    messageId,
    timestamp: Date.now()
  };
  
  controller.enqueue(encoder.encode(JSON.stringify(safetyChunk) + '\n'));
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate KOL Sentiment
  const kolArtefact: ArtefactUpdate = {
    id: 'kol_' + Date.now(),
    type: 'kol',
    title: 'KOL Sentiment Analysis',
    bullets: [
      'Overall sentiment: Cautiously optimistic (72% positive)',
      'Key concerns: Long-term safety data still emerging',
      'Adoption drivers: Efficacy profile and dosing convenience',
      'Market positioning: Competitive advantage in specific patient populations'
    ],
    status: 'ready'
  };

  const kolChunk: ChatStreamChunk = {
    type: 'artefact',
    data: kolArtefact,
    messageId,
    timestamp: Date.now()
  };
  
  controller.enqueue(encoder.encode(JSON.stringify(kolChunk) + '\n'));
}

async function handleArticleSearch(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  prompt: string,
  searchIntent: any
) {
  try {
    // Send initial search status
    const searchStatusChunk: ChatStreamChunk = {
      type: 'status',
      data: {
        status: 'processing',
        message: 'Searching for relevant articles...',
        progress: 20
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(searchStatusChunk) + '\n'));

    // Create search query from intent
    const searchQuery = createSearchQuery(searchIntent);
    if (!searchQuery) {
      throw new Error('Failed to create search query from intent');
    }

    // Perform article search
    const searchResults = await searchArticles(searchQuery);
    
    // Update search progress
    const searchProgressChunk: ChatStreamChunk = {
      type: 'status',
      data: {
        status: 'processing',
        message: 'Processing search results...',
        progress: 60
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(searchProgressChunk) + '\n'));

    // Convert search results to sources format
    const newSources = convertSearchResultsToSources(searchResults);
    
    // Generate search summary
    const summary = generateSearchSummary(searchQuery, searchResults);

    // Send search results to client
    const searchResultsChunk: ChatStreamChunk = {
      type: 'search_results',
      data: {
        sources: newSources,
        summary,
        query: searchQuery.query,
        totalCount: searchResults.length
      } as SearchResultsUpdate,
      messageId,
      timestamp: Date.now()
    };
    controller.enqueue(encoder.encode(JSON.stringify(searchResultsChunk) + '\n'));

    // Stream the summary as chat response
    const words = summary.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk: ChatStreamChunk = {
        type: 'token',
        data: words[i] + (i < words.length - 1 ? ' ' : ''),
        messageId,
        timestamp: Date.now()
      };
      
      controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
      
      // Faster streaming for search results
      const delay = 20 + Math.random() * 30;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Send completion signal
    const completeChunk: ChatStreamChunk = {
      type: 'complete',
      data: {
        status: 'complete',
        message: 'Article search completed successfully',
        progress: 100
      } as StatusUpdate,
      messageId,
      timestamp: Date.now()
    };
    
    controller.enqueue(encoder.encode(JSON.stringify(completeChunk) + '\n'));
    controller.close();

  } catch (error) {
    console.error('Article search error:', error);
    const errorChunk: ChatStreamChunk = {
      type: 'error',
      data: error instanceof Error ? error.message : 'An error occurred during article search',
      messageId,
      timestamp: Date.now()
    };
    
    controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
    controller.close();
  }
}