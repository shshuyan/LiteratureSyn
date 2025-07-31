import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { apiClient } from '../api-client';
import { Source, Message, Artefact } from '../types';

// Mock API responses
const mockSources: Source[] = [
  {
    id: '1',
    title: 'Test Document 1',
    status: 'ready',
    progress: 100,
    selected: false,
    tags: ['research'],
    uploadDate: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'Test Document 2',
    status: 'embedding',
    progress: 75,
    selected: false,
    tags: ['analysis'],
    uploadDate: new Date('2024-01-02'),
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'What are the key findings?',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    sourceIds: ['1'],
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Based on the analysis...',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    sourceIds: ['1'],
  },
];

const mockArtefacts = {
  moa: {
    id: 'moa',
    type: 'moa' as const,
    title: 'MoA Brief',
    bullets: ['Mechanism 1', 'Mechanism 2'],
    status: 'ready' as const,
    metadata: { sources: 1 },
  },
  safety: {
    id: 'safety',
    type: 'safety' as const,
    title: 'Safety Brief',
    bullets: ['Safety point 1', 'Safety point 2'],
    status: 'ready' as const,
    metadata: { sources: 1 },
  },
  kol: {
    id: 'kol',
    type: 'kol' as const,
    title: 'KOL Sentiment',
    bullets: ['Opinion 1', 'Opinion 2'],
    status: 'ready' as const,
    metadata: { sources: 1 },
  },
};

// Setup MSW server
const server = setupServer(
  // Document upload endpoint
  http.post('/api/documents/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    return HttpResponse.json({
      sourceId: 'new-source-id',
      status: 'processing',
      estimatedTime: 30000,
    });
  }),

  // Document status endpoint
  http.get('/api/documents/:id/status', ({ params }) => {
    const { id } = params;
    const source = mockSources.find(s => s.id === id);
    
    if (!source) {
      return HttpResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return HttpResponse.json({
      id: source.id,
      status: source.status,
      progress: source.progress,
    });
  }),

  // Chat endpoint with streaming
  http.post('/api/chat', async ({ request }) => {
    const body = await request.json() as {
      prompt: string;
      sourceIds: string[];
      conversationId?: string;
    };
    
    if (!body.prompt) {
      return HttpResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    // Simulate streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = [
          { type: 'token', data: 'Based ', messageId: 'msg-1' },
          { type: 'token', data: 'on your ', messageId: 'msg-1' },
          { type: 'token', data: 'sources...', messageId: 'msg-1' },
          { type: 'artefact', data: mockArtefacts.moa, messageId: 'msg-1' },
          { type: 'complete', data: '', messageId: 'msg-1' },
        ];
        
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            if (index === chunks.length - 1) {
              controller.close();
            }
          }, index * 100);
        });
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }),

  // Article search endpoint
  http.get('/api/articles/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return HttpResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    const mockResults = [
      {
        id: 'article-1',
        title: 'Relevant Research Paper',
        abstract: 'This paper discusses...',
        authors: ['Dr. Smith', 'Dr. Johnson'],
        journal: 'Nature Medicine',
        publicationDate: new Date('2024-01-01'),
        relevanceScore: 0.95,
        searchLabel: 'highly_relevant' as const,
      },
      {
        id: 'article-2',
        title: 'Recent Study',
        abstract: 'A recent study shows...',
        authors: ['Dr. Brown'],
        journal: 'Science',
        publicationDate: new Date('2024-01-15'),
        relevanceScore: 0.87,
        searchLabel: 'most_recent' as const,
      },
    ];
    
    return HttpResponse.json({
      results: mockResults,
      total: mockResults.length,
      query,
    });
  }),

  // Artefact generation endpoint
  http.post('/api/artefacts/:type', async ({ params, request }) => {
    const { type } = params;
    const body = await request.json() as { sourceIds: string[] };
    
    if (!['moa', 'safety', 'kol'].includes(type as string)) {
      return HttpResponse.json({ error: 'Invalid artefact type' }, { status: 400 });
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return HttpResponse.json(mockArtefacts[type as keyof typeof mockArtefacts]);
  }),

  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Realtime connection endpoint
  http.get('/api/realtime', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
        }, 1000);
        
        setTimeout(() => {
          clearInterval(heartbeat);
          controller.close();
        }, 5000);
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }),
);

describe('API Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Document Upload API', () => {
    it('should upload document successfully', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.sourceId).toBe('new-source-id');
      expect(result.status).toBe('processing');
    });

    it('should handle upload error when no file provided', async () => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: new FormData(),
      });
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('No file provided');
    });
  });

  describe('Document Status API', () => {
    it('should get document status', async () => {
      const response = await fetch('/api/documents/1/status');
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.id).toBe('1');
      expect(result.status).toBe('ready');
      expect(result.progress).toBe(100);
    });

    it('should handle document not found', async () => {
      const response = await fetch('/api/documents/nonexistent/status');
      
      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toBe('Document not found');
    });
  });

  describe('Chat API', () => {
    it('should handle chat request with streaming response', async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'What are the key findings?',
          sourceIds: ['1'],
        }),
      });
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      
      // Test streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        const chunks: string[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          
          if (value) {
            chunks.push(decoder.decode(value));
          }
        }
        
        const fullResponse = chunks.join('');
        expect(fullResponse).toContain('data: {"type":"token"');
        expect(fullResponse).toContain('data: {"type":"artefact"');
        expect(fullResponse).toContain('data: {"type":"complete"');
      }
    });

    it('should handle chat request validation error', async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: ['1'] }), // Missing prompt
      });
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Prompt is required');
    });
  });

  describe('Article Search API', () => {
    it('should search articles successfully', async () => {
      const response = await fetch('/api/articles/search?q=machine%20learning');
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].title).toBe('Relevant Research Paper');
      expect(result.results[0].searchLabel).toBe('highly_relevant');
      expect(result.query).toBe('machine learning');
    });

    it('should handle search validation error', async () => {
      const response = await fetch('/api/articles/search'); // Missing query
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Query is required');
    });
  });

  describe('Artefact Generation API', () => {
    it('should generate MoA artefact', async () => {
      const response = await fetch('/api/artefacts/moa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: ['1'] }),
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.type).toBe('moa');
      expect(result.title).toBe('MoA Brief');
      expect(result.bullets).toHaveLength(2);
    });

    it('should handle invalid artefact type', async () => {
      const response = await fetch('/api/artefacts/invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: ['1'] }),
      });
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid artefact type');
    });
  });

  describe('Health Check API', () => {
    it('should return health status', async () => {
      const response = await fetch('/api/health');
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Realtime Connection API', () => {
    it('should establish realtime connection', async () => {
      const response = await fetch('/api/realtime');
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      
      // Test heartbeat messages
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value);
          expect(chunk).toContain('data: {"type":"heartbeat"}');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      server.use(
        http.get('/api/health', () => {
          return HttpResponse.error();
        })
      );
      
      try {
        await fetch('/api/health');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle server errors', async () => {
      // Simulate server error
      server.use(
        http.get('/api/health', () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );
      
      const response = await fetch('/api/health');
      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error).toBe('Internal server error');
    });

    it('should handle timeout scenarios', async () => {
      // Simulate timeout
      server.use(
        http.get('/api/health', async () => {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Long delay
          return HttpResponse.json({ status: 'ok' });
        })
      );
      
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000); // Abort after 1 second
      
      try {
        await fetch('/api/health', { signal: controller.signal });
      } catch (error) {
        expect((error as Error).name).toBe('AbortError');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      // Simulate rate limit
      server.use(
        http.post('/api/chat', () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            { 
              status: 429,
              headers: { 'Retry-After': '60' }
            }
          );
        })
      );
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', sourceIds: ['1'] }),
      });
      
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      const result = await response.json();
      expect(result.error).toBe('Rate limit exceeded');
    });
  });
});