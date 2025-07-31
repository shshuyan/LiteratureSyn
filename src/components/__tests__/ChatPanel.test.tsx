import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import ChatPanel from '../ChatPanel';
import { useMessagesStore, useSourcesStore, useArtefactsStore } from '@/lib/store';

// Mock DOM methods
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the store hooks
vi.mock('@/lib/store', () => ({
  useMessagesStore: vi.fn(),
  useSourcesStore: vi.fn(),
  useArtefactsStore: vi.fn(),
}));

const mockUseMessagesStore = useMessagesStore as MockedFunction<typeof useMessagesStore>;
const mockUseSourcesStore = useSourcesStore as MockedFunction<typeof useSourcesStore>;
const mockUseArtefactsStore = useArtefactsStore as MockedFunction<typeof useArtefactsStore>;

describe('ChatPanel', () => {
  const mockMessagesStore = {
    messages: [],
    isStreaming: false,
    streamingMessageId: null,
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    removeMessage: vi.fn(),
    clearMessages: vi.fn(),
    startStreaming: vi.fn(),
    stopStreaming: vi.fn(),
    appendToStreamingMessage: vi.fn(),
    getMessageById: vi.fn(),
    getLastMessage: vi.fn(),
  };

  const mockSourcesStore = {
    sources: [],
    selectedSourceIds: [],
    sourceFilters: { search: '', tags: [] },
    addSource: vi.fn(),
    updateSource: vi.fn(),
    removeSource: vi.fn(),
    toggleSourceSelection: vi.fn(),
    selectAllSources: vi.fn(),
    clearSourceSelection: vi.fn(),
    setSourceFilters: vi.fn(),
    getSelectedSources: vi.fn(() => []),
    getFilteredSources: vi.fn(() => []),
    getSourceById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMessagesStore.mockReturnValue(mockMessagesStore);
    mockUseSourcesStore.mockReturnValue({
      ...mockSourcesStore,
      addSources: vi.fn(),
    });
    mockUseArtefactsStore.mockReturnValue({
      artefacts: {
        moa: { id: 'moa', type: 'moa', title: 'MoA Brief', bullets: [], status: 'idle', metadata: {} },
        safety: { id: 'safety', type: 'safety', title: 'Safety Brief', bullets: [], status: 'idle', metadata: {} },
        kol: { id: 'kol', type: 'kol', title: 'KOL Sentiment', bullets: [], status: 'idle', metadata: {} },
      },
      updateArtefact: vi.fn(),
      regenerateArtefact: vi.fn(),
      setArtefactStatus: vi.fn(),
      getArtefactByType: vi.fn(),
    });
  });

  it('renders welcome message when no messages exist', () => {
    render(<ChatPanel />);
    
    expect(screen.getByText('Welcome to Literature Synthesizer')).toBeInTheDocument();
    expect(screen.getByText(/Select sources from the left panel/)).toBeInTheDocument();
  });

  it('shows source selection warning when no sources are selected', () => {
    render(<ChatPanel />);
    
    expect(screen.getByText('No sources selected - you can still search for articles or select sources to chat about them')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for articles or select sources to chat...')).toBeInTheDocument();
  });

  it('enables input when sources are selected', () => {
    const mockSources = [
      { id: '1', title: 'Source 1', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
      { id: '2', title: 'Source 2', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
    ];

    mockUseSourcesStore.mockReturnValue({
      ...mockSourcesStore,
      selectedSourceIds: ['1', '2'],
      getSelectedSources: () => mockSources,
      addSources: vi.fn(),
    });

    render(<ChatPanel />);
    
    expect(screen.getByText('Chatting with 2 sources:')).toBeInTheDocument();
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Source 2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question about your sources...')).toBeInTheDocument();
  });

  it('displays messages correctly', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello, what can you tell me?',
        timestamp: new Date(),
        sourceIds: ['1'],
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Based on your sources, I can help you with analysis.',
        timestamp: new Date(),
        sourceIds: ['1'],
      },
    ];

    mockUseMessagesStore.mockReturnValue({
      ...mockMessagesStore,
      messages: mockMessages,
    });

    render(<ChatPanel />);
    
    expect(screen.getByText('Hello, what can you tell me?')).toBeInTheDocument();
    expect(screen.getByText('Based on your sources, I can help you with analysis.')).toBeInTheDocument();
  });

  it('handles message submission correctly', async () => {
    const mockSources = [
      { id: '1', title: 'Source 1', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
    ];

    (useSourcesStore as any).mockReturnValue({
      ...mockSourcesStore,
      selectedSourceIds: ['1'],
      getSelectedSources: () => mockSources,
    });

    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText('Ask a question about your sources...');
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockMessagesStore.addMessage).toHaveBeenCalledWith({
        role: 'user',
        content: 'Test message',
        sourceIds: ['1'],
      });
    });
  });

  it('allows input when no sources are selected for search queries', () => {
    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText('Search for articles or select sources to chat...');
    const sendButton = screen.getByRole('button');
    
    expect(input).not.toBeDisabled();
    expect(sendButton).toBeDisabled(); // Button should be disabled until text is entered
  });

  it('prevents submission when input is empty', () => {
    const mockSources = [
      { id: '1', title: 'Source 1', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
    ];

    (useSourcesStore as any).mockReturnValue({
      ...mockSourcesStore,
      selectedSourceIds: ['1'],
      getSelectedSources: () => mockSources,
    });

    render(<ChatPanel />);
    
    const sendButton = screen.getByRole('button');
    
    expect(sendButton).toBeDisabled();
  });

  it('shows streaming indicator when message is streaming', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Streaming response...',
        timestamp: new Date(),
        isStreaming: true,
      },
    ];

    (useMessagesStore as any).mockReturnValue({
      ...mockMessagesStore,
      messages: mockMessages,
      isStreaming: true,
      streamingMessageId: '1',
    });

    render(<ChatPanel />);
    
    expect(screen.getByText('Streaming response...')).toBeInTheDocument();
  });

  it('truncates source list when more than 3 sources are selected', () => {
    const mockSources = [
      { id: '1', title: 'Source 1', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
      { id: '2', title: 'Source 2', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
      { id: '3', title: 'Source 3', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
      { id: '4', title: 'Source 4', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
      { id: '5', title: 'Source 5', status: 'ready' as const, progress: 100, selected: true, tags: [], uploadDate: new Date() },
    ];

    (useSourcesStore as any).mockReturnValue({
      ...mockSourcesStore,
      selectedSourceIds: ['1', '2', '3', '4', '5'],
      getSelectedSources: () => mockSources,
    });

    render(<ChatPanel />);
    
    expect(screen.getByText('Chatting with 5 sources:')).toBeInTheDocument();
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Source 2')).toBeInTheDocument();
    expect(screen.getByText('Source 3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Source 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Source 5')).not.toBeInTheDocument();
  });
});