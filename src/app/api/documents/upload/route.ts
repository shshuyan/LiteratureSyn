import { NextRequest, NextResponse } from 'next/server';

interface UploadResponse {
  sourceId: string;
  status: 'processing';
  title: string;
  size: number;
  type: string;
  tags: string[];
  estimatedTime: number;
  uploadDate: string;
}

interface UploadError {
  error: string;
  code?: string;
  retryable?: boolean;
  retryAfter?: number;
}

// File validation constants
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/rtf'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
const MIN_FILE_SIZE = 100; // 100 bytes minimum

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Retry-Count',
    },
  });
}

export async function POST(request: NextRequest) {
  const retryCount = parseInt(request.headers.get('X-Retry-Count') || '0');
  const maxRetries = 3;

  try {
    // Parse form data with timeout
    const formData = await Promise.race([
      request.formData(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);

    const file = formData.get('file') as File;
    const tags = formData.get('tags') as string;
    const priority = formData.get('priority') as string || 'normal';
    
    // Enhanced validation
    const validationError = validateUploadRequest(file, tags);
    if (validationError) {
      return NextResponse.json(validationError, { status: 400 });
    }

    // Generate unique source ID with better entropy
    const sourceId = generateSourceId();
    
    // Parse and validate tags
    const parsedTags = parseAndValidateTags(tags);

    // Calculate processing estimate based on file characteristics
    const estimatedTime = calculateProcessingTime(file);

    // Simulate potential processing failures for retry testing
    if (shouldSimulateFailure(retryCount)) {
      const error: UploadError = {
        error: 'Temporary processing error',
        code: 'PROCESSING_FAILED',
        retryable: true,
        retryAfter: Math.min(Math.pow(2, retryCount), 30) // Exponential backoff, max 30s
      };
      return NextResponse.json(error, { 
        status: 503,
        headers: {
          'Retry-After': error.retryAfter!.toString()
        }
      });
    }

    // Start background processing (in real implementation)
    startBackgroundProcessing(sourceId, file, parsedTags);

    const response: UploadResponse = {
      sourceId,
      status: 'processing',
      title: file.name,
      size: file.size,
      type: file.type,
      tags: parsedTags,
      estimatedTime,
      uploadDate: new Date().toISOString()
    };

    return NextResponse.json(response, {
      headers: {
        'X-Processing-ID': sourceId,
        'X-Estimated-Time': estimatedTime.toString()
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Determine if error is retryable
    const isRetryable = retryCount < maxRetries && isRetryableError(error);
    const errorResponse: UploadError = {
      error: getErrorMessage(error),
      code: getErrorCode(error),
      retryable: isRetryable,
      retryAfter: isRetryable ? Math.min(Math.pow(2, retryCount + 1), 30) : undefined
    };

    const statusCode = getErrorStatusCode(error);
    const headers: Record<string, string> = {};
    
    if (errorResponse.retryAfter) {
      headers['Retry-After'] = errorResponse.retryAfter.toString();
    }

    return NextResponse.json(errorResponse, { status: statusCode, headers });
  }
}

// Helper functions
function validateUploadRequest(file: File, tags: string): UploadError | null {
  if (!file) {
    return { error: 'No file provided', code: 'MISSING_FILE' };
  }

  if (file.size < MIN_FILE_SIZE) {
    return { error: 'File is too small', code: 'FILE_TOO_SMALL' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      error: `File too large. Maximum size is ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB`, 
      code: 'FILE_TOO_LARGE' 
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      error: `Unsupported file type: ${file.type}. Allowed types: ${ALLOWED_TYPES.join(', ')}`, 
      code: 'UNSUPPORTED_TYPE' 
    };
  }

  // Validate filename
  if (file.name.length > 255) {
    return { error: 'Filename too long', code: 'FILENAME_TOO_LONG' };
  }

  if (!/^[a-zA-Z0-9._\-\s()]+$/.test(file.name)) {
    return { error: 'Invalid characters in filename', code: 'INVALID_FILENAME' };
  }

  // Validate tags format
  if (tags) {
    try {
      const parsed = JSON.parse(tags);
      if (!Array.isArray(parsed)) {
        return { error: 'Tags must be an array', code: 'INVALID_TAGS_FORMAT' };
      }
      if (parsed.length > 10) {
        return { error: 'Too many tags (maximum 10)', code: 'TOO_MANY_TAGS' };
      }
    } catch {
      return { error: 'Invalid tags format', code: 'INVALID_TAGS_JSON' };
    }
  }

  return null;
}

function generateSourceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  const counter = Math.floor(Math.random() * 1000).toString(36);
  return `doc_${timestamp}_${random}_${counter}`;
}

function parseAndValidateTags(tags: string): string[] {
  if (!tags) return [];
  
  try {
    const parsed = JSON.parse(tags);
    return parsed
      .filter((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag: string) => tag.trim().toLowerCase())
      .slice(0, 10); // Limit to 10 tags
  } catch {
    return [];
  }
}

function calculateProcessingTime(file: File): number {
  // Base time + size-based time + type-based multiplier
  const baseTime = 5; // 5 seconds base
  const sizeTime = Math.floor(file.size / (1024 * 100)); // 1 second per 100KB
  
  let typeMultiplier = 1;
  if (file.type === 'application/pdf') typeMultiplier = 1.5;
  if (file.type.includes('word')) typeMultiplier = 1.3;
  
  return Math.max(baseTime + sizeTime * typeMultiplier, 5);
}

function shouldSimulateFailure(retryCount: number): boolean {
  // Simulate failures for testing retry logic
  if (process.env.NODE_ENV === 'development') {
    return Math.random() < 0.1 && retryCount < 2; // 10% failure rate, max 2 retries
  }
  return false;
}

function startBackgroundProcessing(sourceId: string, file: File, tags: string[]): void {
  // In a real implementation, this would:
  // 1. Queue the file for processing
  // 2. Extract text content
  // 3. Generate embeddings
  // 4. Store in vector database
  // 5. Update status via WebSocket or polling
  
  console.log(`Starting background processing for ${sourceId}:`, {
    filename: file.name,
    size: file.size,
    type: file.type,
    tags
  });
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('temporary');
  }
  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection.';
    }
    return error.message;
  }
  return 'Internal server error';
}

function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
  }
  return 'INTERNAL_ERROR';
}

function getErrorStatusCode(error: unknown): number {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) return 408;
    if (error.message.includes('network')) return 503;
  }
  return 500;
}