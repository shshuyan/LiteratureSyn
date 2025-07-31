import { NextRequest, NextResponse } from 'next/server';

interface ProcessingStatus {
  id: string;
  status: 'processing' | 'embedding' | 'ready' | 'error';
  progress: number;
  title: string;
  stage: string;
  error?: string;
  startTime: string;
  estimatedCompletion?: string;
  metadata?: {
    fileSize: number;
    fileType: string;
    processingSteps: ProcessingStep[];
  };
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

// Enhanced in-memory storage with TTL
// In production, this would be stored in Redis or database
const processingStatuses = new Map<string, ProcessingStatus>();
const statusTTL = new Map<string, number>();
const TTL_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup expired statuses
setInterval(() => {
  const now = Date.now();
  for (const [id, expiry] of statusTTL.entries()) {
    if (now > expiry) {
      processingStatuses.delete(id);
      statusTTL.delete(id);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const includeSteps = url.searchParams.get('includeSteps') === 'true';
    
    // Get or initialize processing status
    let status = processingStatuses.get(id);
    
    if (!status) {
      // Initialize status with realistic processing steps
      status = initializeProcessingStatus(id);
      processingStatuses.set(id, status);
      statusTTL.set(id, Date.now() + TTL_DURATION);
    }

    // Simulate realistic processing progress
    if (status.status === 'processing' || status.status === 'embedding') {
      status = updateProcessingProgress(status);
      processingStatuses.set(id, status);
    }

    // Filter response based on query parameters
    const response = includeSteps ? status : {
      id: status.id,
      status: status.status,
      progress: status.progress,
      title: status.title,
      stage: status.stage,
      error: status.error,
      estimatedCompletion: status.estimatedCompletion
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': status.status === 'ready' || status.status === 'error' 
          ? 'public, max-age=3600' 
          : 'no-cache',
        'X-Processing-Stage': status.stage,
        'X-Progress': status.progress.toString()
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve processing status',
        retryable: true 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Remove document and its processing status
    processingStatuses.delete(id);
    statusTTL.delete(id);
    
    // In a real implementation, this would also:
    // 1. Remove file from storage
    // 2. Remove embeddings from vector database
    // 3. Clean up any related data
    // 4. Cancel any ongoing processing
    
    return NextResponse.json({ 
      success: true,
      message: 'Document and processing status removed successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        retryable: true 
      },
      { status: 500 }
    );
  }
}

// Helper functions
function initializeProcessingStatus(id: string): ProcessingStatus {
  const now = new Date().toISOString();
  const estimatedDuration = 30 + Math.random() * 60; // 30-90 seconds
  const estimatedCompletion = new Date(Date.now() + estimatedDuration * 1000).toISOString();

  return {
    id,
    status: 'processing',
    progress: 0,
    title: `Document ${id.split('_')[1] || id}`,
    stage: 'Initializing',
    startTime: now,
    estimatedCompletion,
    metadata: {
      fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
      fileType: 'application/pdf',
      processingSteps: [
        {
          name: 'File Upload',
          status: 'completed',
          progress: 100,
          startTime: now,
          endTime: now
        },
        {
          name: 'Text Extraction',
          status: 'pending',
          progress: 0
        },
        {
          name: 'Content Analysis',
          status: 'pending',
          progress: 0
        },
        {
          name: 'Embedding Generation',
          status: 'pending',
          progress: 0
        },
        {
          name: 'Vector Storage',
          status: 'pending',
          progress: 0
        },
        {
          name: 'Indexing',
          status: 'pending',
          progress: 0
        }
      ]
    }
  };
}

function updateProcessingProgress(status: ProcessingStatus): ProcessingStatus {
  const steps = status.metadata?.processingSteps || [];
  const now = new Date().toISOString();
  
  // Find current processing step
  let currentStepIndex = steps.findIndex(step => step.status === 'processing');
  if (currentStepIndex === -1) {
    currentStepIndex = steps.findIndex(step => step.status === 'pending');
    if (currentStepIndex !== -1) {
      steps[currentStepIndex].status = 'processing';
      steps[currentStepIndex].startTime = now;
    }
  }

  // Update progress for current step
  if (currentStepIndex !== -1) {
    const currentStep = steps[currentStepIndex];
    const progressIncrement = Math.random() * 15 + 5; // 5-20% increment
    currentStep.progress = Math.min(currentStep.progress + progressIncrement, 100);

    // Complete step if progress reaches 100%
    if (currentStep.progress >= 100) {
      currentStep.status = 'completed';
      currentStep.endTime = now;
      currentStep.progress = 100;
    }

    // Update stage description
    status.stage = getStageDescription(currentStep.name, currentStep.progress);
  }

  // Calculate overall progress
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const processingSteps = steps.filter(step => step.status === 'processing');
  const totalSteps = steps.length;
  
  let overallProgress = (completedSteps / totalSteps) * 100;
  if (processingSteps.length > 0) {
    const processingProgress = processingSteps.reduce((sum, step) => sum + step.progress, 0) / processingSteps.length;
    overallProgress += (processingProgress / totalSteps);
  }
  
  status.progress = Math.min(Math.round(overallProgress), 100);

  // Update status based on progress
  if (status.progress >= 100) {
    status.status = 'ready';
    status.stage = 'Processing Complete';
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      status.status = 'error';
      status.stage = 'Processing Failed';
      status.error = 'Failed to generate embeddings. Please try uploading the document again.';
    }
  } else if (status.progress >= 60) {
    status.status = 'embedding';
  }

  return status;
}

function getStageDescription(stepName: string, progress: number): string {
  const progressPercent = Math.round(progress);
  
  switch (stepName) {
    case 'Text Extraction':
      return `Extracting text content... ${progressPercent}%`;
    case 'Content Analysis':
      return `Analyzing document structure... ${progressPercent}%`;
    case 'Embedding Generation':
      return `Generating embeddings... ${progressPercent}%`;
    case 'Vector Storage':
      return `Storing vectors... ${progressPercent}%`;
    case 'Indexing':
      return `Building search index... ${progressPercent}%`;
    default:
      return `Processing ${stepName.toLowerCase()}... ${progressPercent}%`;
  }
}