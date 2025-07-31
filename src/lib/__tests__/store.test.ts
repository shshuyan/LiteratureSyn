import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore, useSourcesStore, useMessagesStore, useArtefactsStore, useUIStore, useGlobalStore } from '../store';
import { Source, Message, Artefact } from '../types';

// Mock data for testing
const mockSource: Omit<Source, 'id' | 'uploadDate'> = {
  title: 'Test Document',
  status: 'ready',
  progress: 100,
  selected: false,
  tags: ['research', 'test'],
};

const mockMessage: Omit<Message, 'id' | 'timestamp'> = {
  role: 'user',
  content: 'Test message',
  sourceIds: ['test-source-1'],
};

describe('Literature Synthesizer Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      sources: [],
      selectedSourceIds: [],
      sourceFilters: { search: '', tags: [] },
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
      artefacts: {
        moa: {
          id: 'moa',
          type: 'moa',
          title: 'MoA Brief',
          bullets: [],
          status: 'idle',
          metadata: {},
        },
        safety: {
          id: 'safety',
          type: 'safety',
          title: 'Safety Brief',
          bullets: [],
          status: 'idle',
          metadata: {},
        },
        kol: {
          id: 'kol',
          type: 'kol',
          title: 'KOL Sentiment',
          bullets: [],
          status: 'idle',
          metadata: {},
        },
      },
      ui: {
        theme: 'light',
        insightPanelCollapsed: false,
        activeModal: null,
        sidebarOpen: false,
      },
    });
  });

  describe('Sources Management', () => {
    it('should add a new source', () => {
      const store = useAppStore.getState();
      store.addSource(mockSource);
      
      const sources = useAppStore.getState().sources;
      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe('Test Document');
      expect(sources[0].id).toBeDefined();
      expect(sources[0].uploadDate).toBeInstanceOf(Date);
    });

    it('should toggle source selection', () => {
      const store = useAppStore.getState();
      store.addSource(mockSource);
      
      const sourceId = useAppStore.getState().sources[0].id;
      store.toggleSourceSelection(sourceId);
      
      expect(useAppStore.getState().selectedSourceIds).toContain(sourceId);
      
      store.toggleSourceSelection(sourceId);
      expect(useAppStore.getState().selectedSourceIds).not.toContain(sourceId);
    });

    it('should filter sources by search term', () => {
      const store = useAppStore.getState();
      store.addSource({ ...mockSource, title: 'Research Paper 1' });
      store.addSource({ ...mockSource, title: 'Study Document 2' });
      
      store.setSourceFilters({ search: 'research' });
      
      const filteredSources = store.getFilteredSources();
      expect(filteredSources).toHaveLength(1);
      expect(filteredSources[0].title).toBe('Research Paper 1');
    });

    it('should filter sources by tags', () => {
      const store = useAppStore.getState();
      store.addSource({ ...mockSource, tags: ['medical', 'research'] });
      store.addSource({ ...mockSource, tags: ['technical', 'analysis'] });
      
      store.setSourceFilters({ tags: ['medical'] });
      
      const filteredSources = store.getFilteredSources();
      expect(filteredSources).toHaveLength(1);
      expect(filteredSources[0].tags).toContain('medical');
    });
  });

  describe('Messages Management', () => {
    it('should add a new message', () => {
      const store = useAppStore.getState();
      store.addMessage(mockMessage);
      
      const messages = useAppStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Test message');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle streaming messages', () => {
      const store = useAppStore.getState();
      store.addMessage({ ...mockMessage, role: 'assistant', content: 'Initial' });
      
      const messageId = useAppStore.getState().messages[0].id;
      store.startStreaming(messageId);
      
      expect(useAppStore.getState().isStreaming).toBe(true);
      expect(useAppStore.getState().streamingMessageId).toBe(messageId);
      
      store.appendToStreamingMessage(' content');
      expect(useAppStore.getState().messages[0].content).toBe('Initial content');
      
      store.stopStreaming();
      expect(useAppStore.getState().isStreaming).toBe(false);
      expect(useAppStore.getState().streamingMessageId).toBe(null);
    });
  });

  describe('Artefacts Management', () => {
    it('should update artefact content', () => {
      const store = useAppStore.getState();
      const bullets = ['Point 1', 'Point 2', 'Point 3'];
      
      store.updateArtefact('moa', { bullets, status: 'ready' });
      
      const moaArtefact = store.getArtefactByType('moa');
      expect(moaArtefact.bullets).toEqual(bullets);
      expect(moaArtefact.status).toBe('ready');
      expect(moaArtefact.lastGenerated).toBeInstanceOf(Date);
    });

    it('should regenerate artefact', () => {
      const store = useAppStore.getState();
      store.regenerateArtefact('safety');
      
      const safetyArtefact = store.getArtefactByType('safety');
      expect(safetyArtefact.status).toBe('generating');
      expect(safetyArtefact.errorMessage).toBeUndefined();
    });
  });

  describe('UI State Management', () => {
    it('should toggle theme', () => {
      const store = useAppStore.getState();
      expect(store.ui.theme).toBe('light');
      
      store.toggleTheme();
      expect(useAppStore.getState().ui.theme).toBe('dark');
      
      store.toggleTheme();
      expect(useAppStore.getState().ui.theme).toBe('light');
    });

    it('should manage insight panel state', () => {
      const store = useAppStore.getState();
      expect(store.ui.insightPanelCollapsed).toBe(false);
      
      store.toggleInsightPanel();
      expect(useAppStore.getState().ui.insightPanelCollapsed).toBe(true);
      
      store.setInsightPanelCollapsed(false);
      expect(useAppStore.getState().ui.insightPanelCollapsed).toBe(false);
    });

    it('should manage modal state', () => {
      const store = useAppStore.getState();
      expect(store.ui.activeModal).toBe(null);
      
      store.setActiveModal('test-modal');
      expect(useAppStore.getState().ui.activeModal).toBe('test-modal');
      
      store.setActiveModal(null);
      expect(useAppStore.getState().ui.activeModal).toBe(null);
    });

    it('should manage sidebar state', () => {
      const store = useAppStore.getState();
      expect(store.ui.sidebarOpen).toBe(false);
      
      store.toggleSidebar();
      expect(useAppStore.getState().ui.sidebarOpen).toBe(true);
      
      store.setSidebarOpen(false);
      expect(useAppStore.getState().ui.sidebarOpen).toBe(false);
    });

    it('should manage connection status', () => {
      const store = useAppStore.getState();
      expect(store.ui.connectionStatus).toBe('online');
      
      store.setConnectionStatus('offline');
      expect(useAppStore.getState().ui.connectionStatus).toBe('offline');
      
      store.setOfflineMode(true);
      expect(useAppStore.getState().ui.isOfflineMode).toBe(true);
    });
  });

  describe('Global State Management', () => {
    it('should manage loading state', () => {
      const store = useAppStore.getState();
      expect(store.isLoading()).toBe(false);
      
      store.setLoading(true, 'uploading', 50, 'Processing document...');
      
      const loadingState = store.getLoadingState();
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.operation).toBe('uploading');
      expect(loadingState.progress).toBe(50);
      expect(loadingState.message).toBe('Processing document...');
      
      store.updateLoadingProgress(75, 'Almost done...');
      expect(store.getLoadingState().progress).toBe(75);
      expect(store.getLoadingState().message).toBe('Almost done...');
      
      store.clearLoading();
      expect(store.isLoading()).toBe(false);
    });

    it('should manage error state', () => {
      const store = useAppStore.getState();
      expect(store.hasError()).toBe(false);
      
      const testError = new Error('Test error');
      store.setError(testError, { operation: 'upload' });
      
      expect(store.hasError()).toBe(true);
      const errorState = store.getErrorState();
      expect(errorState.error?.message).toBe('Test error');
      expect(errorState.error?.context?.operation).toBe('upload');
      
      store.clearError();
      expect(store.hasError()).toBe(false);
    });

    it('should handle retry logic', () => {
      const store = useAppStore.getState();
      
      // Set a retryable error
      store.setError(new Error('Network error'), { retryable: true });
      expect(store.canRetry()).toBe(true);
      
      // Increment retry count
      store.incrementRetryCount();
      expect(store.getErrorState().retryCount).toBe(1);
      
      // After max retries, should not be retryable
      store.incrementRetryCount();
      store.incrementRetryCount();
      expect(store.canRetry()).toBe(false);
    });
  });

  describe('Store Selectors', () => {
    it('should provide individual store slices', () => {
      const sourcesStore = useSourcesStore();
      const messagesStore = useMessagesStore();
      const artefactsStore = useArtefactsStore();
      const uiStore = useUIStore();
      const globalStore = useGlobalStore();

      expect(sourcesStore.sources).toBeDefined();
      expect(messagesStore.messages).toBeDefined();
      expect(artefactsStore.artefacts).toBeDefined();
      expect(uiStore.ui).toBeDefined();
      expect(globalStore.global).toBeDefined();
    });

    it('should maintain referential equality for unchanged slices', () => {
      const initialSourcesStore = useSourcesStore();
      const initialMessagesStore = useMessagesStore();
      
      // Update only messages
      const store = useAppStore.getState();
      store.addMessage(mockMessage);
      
      const newSourcesStore = useSourcesStore();
      const newMessagesStore = useMessagesStore();
      
      // Sources should be the same reference (unchanged)
      expect(newSourcesStore.sources).toBe(initialSourcesStore.sources);
      // Messages should be different (changed)
      expect(newMessagesStore.messages).not.toBe(initialMessagesStore.messages);
    });
  });

  describe('Complex Interactions', () => {
    it('should handle multiple source operations', () => {
      const store = useAppStore.getState();
      
      // Add multiple sources
      store.addSources([
        { ...mockSource, title: 'Doc 1', tags: ['tag1'] },
        { ...mockSource, title: 'Doc 2', tags: ['tag2'] },
        { ...mockSource, title: 'Doc 3', tags: ['tag1', 'tag2'] },
      ]);
      
      expect(store.sources).toHaveLength(3);
      
      // Select all sources
      store.selectAllSources();
      expect(store.selectedSourceIds).toHaveLength(3);
      
      // Filter by tag
      store.setSourceFilters({ tags: ['tag1'] });
      const filteredSources = store.getFilteredSources();
      expect(filteredSources).toHaveLength(2);
      
      // Clear selection
      store.clearSourceSelection();
      expect(store.selectedSourceIds).toHaveLength(0);
    });

    it('should handle message streaming workflow', () => {
      const store = useAppStore.getState();
      
      // Add user message
      store.addMessage({ role: 'user', content: 'Question' });
      
      // Add assistant message and start streaming
      store.addMessage({ role: 'assistant', content: '' });
      const messageId = store.messages[1].id;
      
      store.startStreaming(messageId);
      expect(store.isStreaming).toBe(true);
      
      // Append streaming content
      store.appendToStreamingMessage('Hello');
      store.appendToStreamingMessage(' world');
      
      expect(store.messages[1].content).toBe('Hello world');
      
      // Stop streaming
      store.stopStreaming();
      expect(store.isStreaming).toBe(false);
    });

    it('should handle artefact generation workflow', () => {
      const store = useAppStore.getState();
      
      // Start generation
      store.regenerateArtefact('moa');
      expect(store.artefacts.moa.status).toBe('generating');
      
      // Update with results
      store.updateArtefact('moa', {
        bullets: ['Insight 1', 'Insight 2'],
        status: 'ready',
        metadata: { sources: 2 }
      });
      
      const moaArtefact = store.getArtefactByType('moa');
      expect(moaArtefact.status).toBe('ready');
      expect(moaArtefact.bullets).toHaveLength(2);
      expect(moaArtefact.lastGenerated).toBeInstanceOf(Date);
    });
  });
});