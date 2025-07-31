// Store utilities for API integration and state management
import { useAppStore } from './store';
import { errorHandler } from './error-handler';
import type { Source, Message, Artefact } from './types';

// Store integration utilities
export class StoreUtils {
  private static instance: StoreUtils;
  
  static getInstance(): StoreUtils {
    if (!StoreUtils.instance) {
      StoreUtils.instance = new StoreUtils();
    }
    return StoreUtils.instance;
  }

  // Source management utilities
  addSourceWithProgress(
    sourceData: Omit<Source, 'id' | 'uploadDate'>,
    onProgress?: (progress: number) => void
  ): string {
    const store = useAppStore.getState();
    store.addSource(sourceData);
    
    // Get the newly added source ID
    const sources = store.sources;
    const newSource = sources[sources.length - 1];
    
    // Set up progress tracking if callback provided
    if (onProgress && newSource) {
      const unsubscribe = useAppStore.subscribe(
        (state) => state.sources.find(s => s.id === newSource.id),
        (source) => {
          if (source) {
            onProgress(source.progress);
            
            // Unsubscribe when processing is complete
            if (source.status === 'ready' || source.status === 'error') {
              unsubscribe();
            }
          }
        }
      );
    }
    
    return newSource?.id || '';
  }

  updateSourceStatus(
    sourceId: string,
    status: Source['status'],
    progress?: number,
    errorMessage?: string
  ): void {
    const store = useAppStore.getState();
    const updates: Partial<Source> = { status };
    
    if (progress !== undefined) {
      updates.progress = progress;
    }
    
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    } else if (status !== 'error') {
      updates.errorMessage = undefined;
    }
    
    store.updateSource(sourceId, updates);
  }

  // Message management utilities
  addStreamingMessage(
    role: 'user' | 'assistant',
    content: string = '',
    sourceIds?: string[]
  ): string {
    const store = useAppStore.getState();
    const messageData = {
      role,
      content,
      html: content,
      sourceIds,
      isStreaming: role === 'assistant',
    };
    
    store.addMessage(messageData);
    return store.getLastMessage()?.id || '';
  }

  appendToMessage(messageId: string, content: string): void {
    const store = useAppStore.getState();
    const message = store.getMessageById(messageId);
    
    if (message) {
      store.updateMessage(messageId, {
        content: message.content + content,
        html: message.html + content,
      });
    }
  }

  completeStreamingMessage(messageId: string): void {
    const store = useAppStore.getState();
    store.updateMessage(messageId, { isStreaming: false });
    store.stopStreaming();
  }

  setMessageError(messageId: string, error: string): void {
    const store = useAppStore.getState();
    const errorHtml = `<div class="error-message" style="color: #ef4444; padding: 8px; border-left: 3px solid #ef4444; background: #fef2f2; border-radius: 4px;">
      <strong>Error:</strong> ${error}
    </div>`;
    
    store.updateMessage(messageId, {
      content: `Error: ${error}`,
      html: errorHtml,
      isStreaming: false,
    });
    store.stopStreaming();
  }

  // Artefact management utilities
  updateArtefactFromAPI(
    type: 'moa' | 'safety' | 'kol',
    apiData: {
      id: string;
      title: string;
      bullets: string[];
      status: 'generating' | 'ready';
      metadata?: Record<string, unknown>;
    }
  ): void {
    const store = useAppStore.getState();
    
    store.updateArtefact(type, {
      id: apiData.id,
      title: apiData.title,
      bullets: apiData.bullets,
      status: apiData.status === 'ready' ? 'ready' : 'generating',
      metadata: {
        ...apiData.metadata,
        lastUpdated: new Date().toISOString(),
      },
      errorMessage: undefined,
    });
  }

  setArtefactError(
    type: 'moa' | 'safety' | 'kol',
    error: string
  ): void {
    const store = useAppStore.getState();
    const userError = errorHandler.parseError(error);
    
    store.updateArtefact(type, {
      status: 'error',
      errorMessage: userError.message,
    });
  }

  // Batch operations
  updateMultipleArtefacts(
    updates: Array<{
      type: 'moa' | 'safety' | 'kol';
      data: Partial<Artefact>;
    }>
  ): void {
    const store = useAppStore.getState();
    
    updates.forEach(({ type, data }) => {
      store.updateArtefact(type, data);
    });
  }

  // Selection utilities
  selectSourcesByStatus(status: Source['status']): void {
    const store = useAppStore.getState();
    const sourcesToSelect = store.sources
      .filter(source => source.status === status)
      .map(source => source.id);
    
    // Clear current selection and select filtered sources
    store.clearSourceSelection();
    sourcesToSelect.forEach(id => store.toggleSourceSelection(id));
  }

  selectSourcesByTag(tag: string): void {
    const store = useAppStore.getState();
    const sourcesToSelect = store.sources
      .filter(source => source.tags.includes(tag))
      .map(source => source.id);
    
    // Clear current selection and select filtered sources
    store.clearSourceSelection();
    sourcesToSelect.forEach(id => store.toggleSourceSelection(id));
  }

  // State validation utilities
  validateSelectedSources(): {
    isValid: boolean;
    errors: string[];
    readySources: Source[];
  } {
    const store = useAppStore.getState();
    const selectedSources = store.getSelectedSources();
    const errors: string[] = [];
    
    if (selectedSources.length === 0) {
      errors.push('No sources selected');
    }
    
    const readySources = selectedSources.filter(source => source.status === 'ready');
    const processingSources = selectedSources.filter(source => source.status === 'processing' || source.status === 'embedding');
    const errorSources = selectedSources.filter(source => source.status === 'error');
    
    if (readySources.length === 0) {
      errors.push('No ready sources available');
    }
    
    if (processingSources.length > 0) {
      errors.push(`${processingSources.length} sources still processing`);
    }
    
    if (errorSources.length > 0) {
      errors.push(`${errorSources.length} sources have errors`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      readySources,
    };
  }

  // Cleanup utilities
  cleanupErrorSources(): number {
    const store = useAppStore.getState();
    const errorSources = store.sources.filter(source => source.status === 'error');
    
    errorSources.forEach(source => {
      store.removeSource(source.id);
    });
    
    return errorSources.length;
  }

  resetArtefacts(): void {
    const store = useAppStore.getState();
    const artefactTypes: ('moa' | 'safety' | 'kol')[] = ['moa', 'safety', 'kol'];
    
    artefactTypes.forEach(type => {
      store.updateArtefact(type, {
        bullets: [],
        status: 'idle',
        errorMessage: undefined,
        metadata: {},
      });
    });
  }

  // Analytics utilities
  getStoreStats(): {
    sources: {
      total: number;
      ready: number;
      processing: number;
      error: number;
      selected: number;
    };
    messages: {
      total: number;
      streaming: boolean;
    };
    artefacts: {
      ready: number;
      generating: number;
      error: number;
      idle: number;
    };
  } {
    const store = useAppStore.getState();
    
    const sourceStats = store.sources.reduce(
      (acc, source) => {
        acc.total++;
        acc[source.status]++;
        return acc;
      },
      { total: 0, ready: 0, processing: 0, embedding: 0, error: 0, idle: 0 }
    );
    
    const artefactStats = Object.values(store.artefacts).reduce(
      (acc, artefact) => {
        acc[artefact.status]++;
        return acc;
      },
      { ready: 0, generating: 0, error: 0, idle: 0 }
    );
    
    return {
      sources: {
        total: sourceStats.total,
        ready: sourceStats.ready,
        processing: sourceStats.processing + sourceStats.embedding,
        error: sourceStats.error,
        selected: store.selectedSourceIds.length,
      },
      messages: {
        total: store.messages.length,
        streaming: store.isStreaming,
      },
      artefacts: artefactStats,
    };
  }
}

// Export singleton instance
export const storeUtils = StoreUtils.getInstance();

// Export React hooks for components
export const useStoreUtils = () => {
  return {
    addSourceWithProgress: storeUtils.addSourceWithProgress.bind(storeUtils),
    updateSourceStatus: storeUtils.updateSourceStatus.bind(storeUtils),
    addStreamingMessage: storeUtils.addStreamingMessage.bind(storeUtils),
    appendToMessage: storeUtils.appendToMessage.bind(storeUtils),
    completeStreamingMessage: storeUtils.completeStreamingMessage.bind(storeUtils),
    setMessageError: storeUtils.setMessageError.bind(storeUtils),
    updateArtefactFromAPI: storeUtils.updateArtefactFromAPI.bind(storeUtils),
    setArtefactError: storeUtils.setArtefactError.bind(storeUtils),
    updateMultipleArtefacts: storeUtils.updateMultipleArtefacts.bind(storeUtils),
    selectSourcesByStatus: storeUtils.selectSourcesByStatus.bind(storeUtils),
    selectSourcesByTag: storeUtils.selectSourcesByTag.bind(storeUtils),
    validateSelectedSources: storeUtils.validateSelectedSources.bind(storeUtils),
    cleanupErrorSources: storeUtils.cleanupErrorSources.bind(storeUtils),
    resetArtefacts: storeUtils.resetArtefacts.bind(storeUtils),
    getStoreStats: storeUtils.getStoreStats.bind(storeUtils),
  };
};