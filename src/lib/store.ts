import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Source, Message, Artefact, SourceFilters, Theme, UIState, LoadingState, ErrorState, GlobalState } from './types';
import { errorHandler } from './error-handler';

// Sources slice interface
interface SourcesSlice {
  sources: Source[];
  selectedSourceIds: string[];
  sourceFilters: SourceFilters;
  
  // Actions
  addSource: (source: Omit<Source, 'id' | 'uploadDate'>) => void;
  addSources: (sources: Omit<Source, 'id' | 'uploadDate'>[]) => void;
  updateSource: (id: string, updates: Partial<Source>) => void;
  removeSource: (id: string) => void;
  toggleSourceSelection: (id: string) => void;
  selectAllSources: () => void;
  clearSourceSelection: () => void;
  setSourceFilters: (filters: Partial<SourceFilters>) => void;
  
  // Selectors
  getSelectedSources: () => Source[];
  getFilteredSources: () => Source[];
  getSourceById: (id: string) => Source | undefined;
}

// Messages slice interface
interface MessagesSlice {
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;
  appendToStreamingMessage: (content: string) => void;
  
  // Selectors
  getMessageById: (id: string) => Message | undefined;
  getLastMessage: () => Message | undefined;
}

// Artefacts slice interface
interface ArtefactsSlice {
  artefacts: {
    moa: Artefact;
    safety: Artefact;
    kol: Artefact;
  };
  
  // Actions
  updateArtefact: (type: 'moa' | 'safety' | 'kol', updates: Partial<Artefact>) => void;
  regenerateArtefact: (type: 'moa' | 'safety' | 'kol') => void;
  setArtefactStatus: (type: 'moa' | 'safety' | 'kol', status: Artefact['status']) => void;
  
  // Selectors
  getArtefactByType: (type: 'moa' | 'safety' | 'kol') => Artefact;
}

// UI slice interface
interface UISlice {
  ui: UIState;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setInsightPanelCollapsed: (collapsed: boolean) => void;
  toggleInsightPanel: () => void;
  setActiveModal: (modalId: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setConnectionStatus: (status: UIState['connectionStatus']) => void;
  setOfflineMode: (isOffline: boolean) => void;
}

// Global state slice interface
interface GlobalSlice {
  global: GlobalState;
  
  // Loading actions
  setLoading: (loading: boolean, operation?: string, progress?: number, message?: string) => void;
  updateLoadingProgress: (progress: number, message?: string) => void;
  clearLoading: () => void;
  
  // Error actions
  setError: (error: unknown, context?: Record<string, unknown>) => void;
  clearError: () => void;
  incrementRetryCount: () => void;
  canRetry: () => boolean;
  getRetryDelay: () => number;
  
  // Selectors
  isLoading: () => boolean;
  hasError: () => boolean;
  getLoadingState: () => LoadingState;
  getErrorState: () => ErrorState;
}

// Combined store type
type AppStore = SourcesSlice & MessagesSlice & ArtefactsSlice & UISlice & GlobalSlice;

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Sources state
        sources: [],
        selectedSourceIds: [],
        sourceFilters: {
          search: '',
          tags: [],
        },
        
        // Sources actions
        addSource: (sourceData) => set((state) => {
          const newSource: Source = {
            ...sourceData,
            id: generateId(),
            uploadDate: new Date(),
          };
          state.sources.push(newSource);
        }),
        
        addSources: (sourcesData) => set((state) => {
          const newSources: Source[] = sourcesData.map(sourceData => ({
            ...sourceData,
            id: generateId(),
            uploadDate: new Date(),
          }));
          state.sources.push(...newSources);
        }),
        
        updateSource: (id, updates) => set((state) => {
          const sourceIndex = state.sources.findIndex(s => s.id === id);
          if (sourceIndex !== -1) {
            Object.assign(state.sources[sourceIndex], updates);
          }
        }),
        
        removeSource: (id) => set((state) => {
          state.sources = state.sources.filter(s => s.id !== id);
          state.selectedSourceIds = state.selectedSourceIds.filter(sid => sid !== id);
        }),
        
        toggleSourceSelection: (id) => set((state) => {
          const index = state.selectedSourceIds.indexOf(id);
          if (index === -1) {
            state.selectedSourceIds.push(id);
          } else {
            state.selectedSourceIds.splice(index, 1);
          }
        }),
        
        selectAllSources: () => set((state) => {
          const filteredSources = get().getFilteredSources();
          state.selectedSourceIds = filteredSources.map(s => s.id);
        }),
        
        clearSourceSelection: () => set((state) => {
          state.selectedSourceIds = [];
        }),
        
        setSourceFilters: (filters) => set((state) => {
          Object.assign(state.sourceFilters, filters);
        }),
        
        // Sources selectors
        getSelectedSources: () => {
          const { sources, selectedSourceIds } = get();
          return sources.filter(s => selectedSourceIds.includes(s.id));
        },
        
        getFilteredSources: () => {
          const { sources, sourceFilters } = get();
          return sources.filter(source => {
            const matchesSearch = !sourceFilters.search || 
              source.title.toLowerCase().includes(sourceFilters.search.toLowerCase());
            const matchesTags = sourceFilters.tags.length === 0 || 
              sourceFilters.tags.some(tag => source.tags.includes(tag));
            return matchesSearch && matchesTags;
          });
        },
        
        getSourceById: (id) => {
          return get().sources.find(s => s.id === id);
        },
        
        // Messages state
        messages: [],
        isStreaming: false,
        streamingMessageId: null,
        
        // Messages actions
        addMessage: (messageData) => set((state) => {
          const newMessage: Message = {
            ...messageData,
            id: generateId(),
            timestamp: new Date(),
          };
          state.messages.push(newMessage);
        }),
        
        updateMessage: (id, updates) => set((state) => {
          const messageIndex = state.messages.findIndex(m => m.id === id);
          if (messageIndex !== -1) {
            Object.assign(state.messages[messageIndex], updates);
          }
        }),
        
        removeMessage: (id) => set((state) => {
          state.messages = state.messages.filter(m => m.id !== id);
        }),
        
        clearMessages: () => set((state) => {
          state.messages = [];
          state.isStreaming = false;
          state.streamingMessageId = null;
        }),
        
        startStreaming: (messageId) => set((state) => {
          state.isStreaming = true;
          state.streamingMessageId = messageId;
        }),
        
        stopStreaming: () => set((state) => {
          state.isStreaming = false;
          state.streamingMessageId = null;
        }),
        
        appendToStreamingMessage: (content) => set((state) => {
          if (state.streamingMessageId) {
            const messageIndex = state.messages.findIndex(m => m.id === state.streamingMessageId);
            if (messageIndex !== -1) {
              state.messages[messageIndex].content += content;
            }
          }
        }),
        
        // Messages selectors
        getMessageById: (id) => {
          return get().messages.find(m => m.id === id);
        },
        
        getLastMessage: () => {
          const messages = get().messages;
          return messages[messages.length - 1];
        },
        
        // Artefacts state
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
        
        // Artefacts actions
        updateArtefact: (type, updates) => set((state) => {
          Object.assign(state.artefacts[type], updates);
          if (updates.bullets || updates.status === 'ready') {
            state.artefacts[type].lastGenerated = new Date();
          }
        }),
        
        regenerateArtefact: (type) => set((state) => {
          state.artefacts[type].status = 'generating';
          state.artefacts[type].errorMessage = undefined;
        }),
        
        setArtefactStatus: (type, status) => set((state) => {
          state.artefacts[type].status = status;
        }),
        
        // Artefacts selectors
        getArtefactByType: (type) => {
          return get().artefacts[type];
        },
        
        // UI state
        ui: {
          theme: 'light',
          insightPanelCollapsed: false,
          activeModal: null,
          sidebarOpen: false,
          connectionStatus: 'online',
          isOfflineMode: false,
        },
        
        // UI actions
        setTheme: (theme) => set((state) => {
          state.ui.theme = theme;
        }),
        
        toggleTheme: () => set((state) => {
          state.ui.theme = state.ui.theme === 'light' ? 'dark' : 'light';
        }),
        
        setInsightPanelCollapsed: (collapsed) => set((state) => {
          state.ui.insightPanelCollapsed = collapsed;
        }),
        
        toggleInsightPanel: () => set((state) => {
          state.ui.insightPanelCollapsed = !state.ui.insightPanelCollapsed;
        }),
        
        setActiveModal: (modalId) => set((state) => {
          state.ui.activeModal = modalId;
        }),
        
        setSidebarOpen: (open) => set((state) => {
          state.ui.sidebarOpen = open;
        }),
        
        toggleSidebar: () => set((state) => {
          state.ui.sidebarOpen = !state.ui.sidebarOpen;
        }),
        
        setConnectionStatus: (status) => set((state) => {
          state.ui.connectionStatus = status;
        }),
        
        setOfflineMode: (isOffline) => set((state) => {
          state.ui.isOfflineMode = isOffline;
        }),
        
        // Global state
        global: {
          loading: {
            isLoading: false,
          },
          error: {
            hasError: false,
            retryCount: 0,
          },
        },
        
        // Global loading actions
        setLoading: (loading, operation, progress, message) => set((state) => {
          state.global.loading = {
            isLoading: loading,
            operation,
            progress,
            message,
          };
        }),
        
        updateLoadingProgress: (progress, message) => set((state) => {
          if (state.global.loading.isLoading) {
            state.global.loading.progress = progress;
            if (message) {
              state.global.loading.message = message;
            }
          }
        }),
        
        clearLoading: () => set((state) => {
          state.global.loading = {
            isLoading: false,
          };
        }),
        
        // Global error actions
        setError: (error, context) => set((state) => {
          const appError = errorHandler.parseError(error, context);
          errorHandler.logError(appError);
          
          state.global.error = {
            hasError: true,
            error: {
              type: appError.type,
              message: appError.message,
              code: appError.code,
              retryable: appError.retryable,
              retryAfter: appError.retryAfter,
              context: appError.context,
            },
            retryCount: state.global.error.retryCount,
          };
        }),
        
        clearError: () => set((state) => {
          state.global.error = {
            hasError: false,
            retryCount: 0,
          };
        }),
        
        incrementRetryCount: () => set((state) => {
          state.global.error.retryCount += 1;
          state.global.error.lastRetryAt = new Date();
        }),
        
        // Global selectors
        canRetry: () => {
          const { error } = get().global;
          return Boolean(error.hasError && error.error?.retryable && error.retryCount < 3);
        },
        
        getRetryDelay: () => {
          const { error } = get().global;
          if (!error.error) return 0;
          return errorHandler.getRetryDelay(error.error, error.retryCount);
        },
        
        isLoading: () => {
          return get().global.loading.isLoading;
        },
        
        hasError: () => {
          return get().global.error.hasError;
        },
        
        getLoadingState: () => {
          return get().global.loading;
        },
        
        getErrorState: () => {
          return get().global.error;
        },
      }))
    ),
    {
      name: 'literature-synthesizer-store',
    }
  )
);

// Export individual slice selectors for better performance
export const useSourcesStore = () => {
  const sources = useAppStore(state => state.sources);
  const selectedSourceIds = useAppStore(state => state.selectedSourceIds);
  const sourceFilters = useAppStore(state => state.sourceFilters);
  const addSource = useAppStore(state => state.addSource);
  const addSources = useAppStore(state => state.addSources);
  const updateSource = useAppStore(state => state.updateSource);
  const removeSource = useAppStore(state => state.removeSource);
  const toggleSourceSelection = useAppStore(state => state.toggleSourceSelection);
  const selectAllSources = useAppStore(state => state.selectAllSources);
  const clearSourceSelection = useAppStore(state => state.clearSourceSelection);
  const setSourceFilters = useAppStore(state => state.setSourceFilters);
  const getSelectedSources = useAppStore(state => state.getSelectedSources);
  const getFilteredSources = useAppStore(state => state.getFilteredSources);
  const getSourceById = useAppStore(state => state.getSourceById);

  return {
    sources,
    selectedSourceIds,
    sourceFilters,
    addSource,
    addSources,
    updateSource,
    removeSource,
    toggleSourceSelection,
    selectAllSources,
    clearSourceSelection,
    setSourceFilters,
    getSelectedSources,
    getFilteredSources,
    getSourceById,
  };
};

export const useMessagesStore = () => {
  const messages = useAppStore(state => state.messages);
  const isStreaming = useAppStore(state => state.isStreaming);
  const streamingMessageId = useAppStore(state => state.streamingMessageId);
  const addMessage = useAppStore(state => state.addMessage);
  const updateMessage = useAppStore(state => state.updateMessage);
  const removeMessage = useAppStore(state => state.removeMessage);
  const clearMessages = useAppStore(state => state.clearMessages);
  const startStreaming = useAppStore(state => state.startStreaming);
  const stopStreaming = useAppStore(state => state.stopStreaming);
  const appendToStreamingMessage = useAppStore(state => state.appendToStreamingMessage);
  const getMessageById = useAppStore(state => state.getMessageById);
  const getLastMessage = useAppStore(state => state.getLastMessage);

  return {
    messages,
    isStreaming,
    streamingMessageId,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    startStreaming,
    stopStreaming,
    appendToStreamingMessage,
    getMessageById,
    getLastMessage,
  };
};

export const useArtefactsStore = () => {
  const artefacts = useAppStore(state => state.artefacts);
  const updateArtefact = useAppStore(state => state.updateArtefact);
  const regenerateArtefact = useAppStore(state => state.regenerateArtefact);
  const setArtefactStatus = useAppStore(state => state.setArtefactStatus);
  const getArtefactByType = useAppStore(state => state.getArtefactByType);

  return {
    artefacts,
    updateArtefact,
    regenerateArtefact,
    setArtefactStatus,
    getArtefactByType,
  };
};

export const useUIStore = () => {
  const ui = useAppStore(state => state.ui);
  const setTheme = useAppStore(state => state.setTheme);
  const toggleTheme = useAppStore(state => state.toggleTheme);
  const setInsightPanelCollapsed = useAppStore(state => state.setInsightPanelCollapsed);
  const toggleInsightPanel = useAppStore(state => state.toggleInsightPanel);
  const setActiveModal = useAppStore(state => state.setActiveModal);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const setConnectionStatus = useAppStore(state => state.setConnectionStatus);
  const setOfflineMode = useAppStore(state => state.setOfflineMode);

  return {
    ui,
    setTheme,
    toggleTheme,
    setInsightPanelCollapsed,
    toggleInsightPanel,
    setActiveModal,
    setSidebarOpen,
    toggleSidebar,
    setConnectionStatus,
    setOfflineMode,
  };
};

export const useGlobalStore = () => {
  const global = useAppStore(state => state.global);
  const setLoading = useAppStore(state => state.setLoading);
  const updateLoadingProgress = useAppStore(state => state.updateLoadingProgress);
  const clearLoading = useAppStore(state => state.clearLoading);
  const setError = useAppStore(state => state.setError);
  const clearError = useAppStore(state => state.clearError);
  const incrementRetryCount = useAppStore(state => state.incrementRetryCount);
  const canRetry = useAppStore(state => state.canRetry);
  const getRetryDelay = useAppStore(state => state.getRetryDelay);
  const isLoading = useAppStore(state => state.isLoading);
  const hasError = useAppStore(state => state.hasError);
  const getLoadingState = useAppStore(state => state.getLoadingState);
  const getErrorState = useAppStore(state => state.getErrorState);

  return {
    global,
    setLoading,
    updateLoadingProgress,
    clearLoading,
    setError,
    clearError,
    incrementRetryCount,
    canRetry,
    getRetryDelay,
    isLoading,
    hasError,
    getLoadingState,
    getErrorState,
  };
};