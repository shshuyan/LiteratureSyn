// API service layer that integrates API client with Zustand store
import { apiClient, type ArtefactUpdate } from './api-client';
import type { Source } from './types';
import { useAppStore } from './store';
import { storeUtils } from './store-utils';
import { errorHandler } from './error-handler';
import { createEnhancedChatStream, createDocumentStatusStream } from './streaming';

export class ApiService {
  private store = useAppStore;

  // Document operations
  async uploadDocument(
    file: File,
    tags: string[] = []
  ): Promise<void> {
    try {
      // Add source to store with progress tracking
      const sourceId = storeUtils.addSourceWithProgress(
        {
          title: file.name,
          status: 'processing',
          progress: 0,
          selected: false,
          tags,
          size: file.size,
          type: file.type,
        },
        (progress) => {
          storeUtils.updateSourceStatus(sourceId, 'processing', progress);
        }
      );
      
      // Upload document with enhanced error handling
      const source = await apiClient.uploadDocumentWithRetry(
        file,
        tags,
        (progress) => {
          storeUtils.updateSourceStatus(sourceId, 'processing', progress);
        },
        (status) => {
          storeUtils.updateSourceStatus(
            sourceId,
            status.status,
            status.progress,
            status.error
          );
        }
      );

      // Update store with final source data
      this.store.getState().updateSource(sourceId, source);

      // Set up real-time status monitoring
      this.monitorDocumentProcessing(sourceId);
    } catch (error) {
      const userError = errorHandler.parseError(error, { operation: 'upload', file: file.name });
      console.error('Document upload failed:', userError);
      throw new Error(userError.message);
    }
  }

  async deleteDocument(sourceId: string): Promise<void> {
    try {
      await apiClient.deleteDocument(sourceId);
      this.store.getState().removeSource(sourceId);
    } catch (error) {
      const userError = errorHandler.parseError(error, { operation: 'delete', sourceId });
      console.error('Document deletion failed:', userError);
      throw new Error(userError.message);
    }
  }

  // Chat operations
  async sendMessage(
    prompt: string,
    sourceIds: string[]
  ): Promise<void> {
    try {
      // Validate sources before sending
      const validation = storeUtils.validateSelectedSources();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Add user message
      storeUtils.addStreamingMessage('user', prompt, sourceIds);
      
      // Add assistant message placeholder and start streaming
      const assistantMessageId = storeUtils.addStreamingMessage('assistant', '', sourceIds);
      this.store.getState().startStreaming(assistantMessageId);

      // Use enhanced streaming
      await createEnhancedChatStream(
        prompt,
        sourceIds,
        {
          onToken: (token) => {
            storeUtils.appendToMessage(assistantMessageId, token);
          },
          onArtefact: (artefact) => {
            storeUtils.updateArtefactFromAPI(artefact.type, artefact);
          },
          onStatus: (status) => {
            // Update UI with processing status
            console.log('Chat status:', status);
          },
          onComplete: () => {
            storeUtils.completeStreamingMessage(assistantMessageId);
          },
          onError: (error) => {
            const userError = errorHandler.parseError(error, { operation: 'chat', prompt });
            storeUtils.setMessageError(assistantMessageId, userError.message);
          },
        }
      );
    } catch (error) {
      const userError = errorHandler.parseError(error, { operation: 'chat', prompt });
      console.error('Chat message failed:', userError);
      throw new Error(userError.message);
    }
  }

  // Artefact operations
  async generateArtefact(
    type: 'moa' | 'safety' | 'kol',
    sourceIds: string[],
    regenerate: boolean = false
  ): Promise<void> {
    try {
      // Set generating status
      this.store.getState().setArtefactStatus(type, 'generating');

      const artefact = await apiClient.generateArtefact(type, sourceIds, regenerate);
      
      // Update store using utility
      storeUtils.updateArtefactFromAPI(type, {
        id: artefact.id,
        title: artefact.title,
        bullets: artefact.bullets,
        status: artefact.status,
        metadata: {
          sourceCount: sourceIds.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const userError = errorHandler.parseError(error, { operation: 'generateArtefact', type });
      console.error(`Artefact generation failed for ${type}:`, userError);
      storeUtils.setArtefactError(type, userError.message);
      throw new Error(userError.message);
    }
  }

  async regenerateArtefact(
    type: 'moa' | 'safety' | 'kol',
    sourceIds: string[]
  ): Promise<void> {
    return this.generateArtefact(type, sourceIds, true);
  }

  // Document processing monitoring
  private monitorDocumentProcessing(sourceId: string): void {
    createDocumentStatusStream(sourceId, {
      onProgress: (progress) => {
        const source = this.store.getState().getSourceById(sourceId);
        if (source) {
          storeUtils.updateSourceStatus(sourceId, source.status, progress);
        }
      },
      onStatusUpdate: (status) => {
        storeUtils.updateSourceStatus(
          sourceId,
          status.status,
          status.progress,
          status.error
        );
      },
      onComplete: () => {
        console.log(`Document processing completed for ${sourceId}`);
      },
      onError: (error) => {
        console.error(`Document processing error for ${sourceId}:`, error);
        storeUtils.updateSourceStatus(sourceId, 'error', 0, error);
      }
    });
  }



  // Utility methods
  getSelectedSources(): Source[] {
    return this.store.getState().getSelectedSources();
  }

  hasSelectedSources(): boolean {
    return this.store.getState().selectedSourceIds.length > 0;
  }

  isStreaming(): boolean {
    return this.store.getState().isStreaming;
  }

  // Batch operations
  async generateAllArtefacts(sourceIds: string[]): Promise<void> {
    const artefactTypes: ('moa' | 'safety' | 'kol')[] = ['moa', 'safety', 'kol'];
    
    // Generate all artefacts in parallel
    const promises = artefactTypes.map(type => 
      this.generateArtefact(type, sourceIds).catch(error => {
        console.error(`Failed to generate ${type} artefact:`, error);
        return null; // Don't fail the entire batch
      })
    );

    await Promise.allSettled(promises);
  }

  async regenerateAllArtefacts(sourceIds: string[]): Promise<void> {
    const artefactTypes: ('moa' | 'safety' | 'kol')[] = ['moa', 'safety', 'kol'];
    
    // Regenerate all artefacts in parallel
    const promises = artefactTypes.map(type => 
      this.regenerateArtefact(type, sourceIds).catch(error => {
        console.error(`Failed to regenerate ${type} artefact:`, error);
        return null; // Don't fail the entire batch
      })
    );

    await Promise.allSettled(promises);
  }

  // Error recovery
  async retryFailedOperations(): Promise<void> {
    const store = this.store.getState();
    
    // Retry failed artefacts
    const failedArtefacts = Object.entries(store.artefacts)
      .filter(([_, artefact]) => artefact.status === 'error')
      .map(([type]) => type as 'moa' | 'safety' | 'kol');

    if (failedArtefacts.length > 0) {
      const selectedSources = this.getSelectedSources();
      if (selectedSources.length > 0) {
        const sourceIds = selectedSources.map(s => s.id);
        
        for (const type of failedArtefacts) {
          try {
            await this.generateArtefact(type, sourceIds);
          } catch (error) {
            console.error(`Retry failed for ${type}:`, error);
          }
        }
      }
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check by trying to fetch a non-existent artefact
      // This will test the API connectivity without side effects
      await fetch('/api/artefacts/moa?id=health-check');
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export hooks for React components
export const useApiService = () => {
  return {
    uploadDocument: apiService.uploadDocument.bind(apiService),
    deleteDocument: apiService.deleteDocument.bind(apiService),
    sendMessage: apiService.sendMessage.bind(apiService),
    generateArtefact: apiService.generateArtefact.bind(apiService),
    regenerateArtefact: apiService.regenerateArtefact.bind(apiService),
    generateAllArtefacts: apiService.generateAllArtefacts.bind(apiService),
    regenerateAllArtefacts: apiService.regenerateAllArtefacts.bind(apiService),
    retryFailedOperations: apiService.retryFailedOperations.bind(apiService),
    healthCheck: apiService.healthCheck.bind(apiService),
    getSelectedSources: apiService.getSelectedSources.bind(apiService),
    hasSelectedSources: apiService.hasSelectedSources.bind(apiService),
    isStreaming: apiService.isStreaming.bind(apiService),
  };
};