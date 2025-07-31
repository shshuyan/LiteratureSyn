import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { ArtefactCard } from '../ArtefactCard';
import { Artefact } from '@/lib/types';
import { useArtefactsStore, useUIStore } from '@/lib/store';

// Mock the stores
vi.mock('@/lib/store', () => ({
  useArtefactsStore: vi.fn(),
  useUIStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: React.ComponentProps<'li'>) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseArtefactsStore = useArtefactsStore as MockedFunction<typeof useArtefactsStore>;
const mockUseUIStore = useUIStore as MockedFunction<typeof useUIStore>;

const mockArtefact: Artefact = {
  id: 'test-artefact',
  type: 'moa',
  title: 'Test MoA Brief',
  bullets: [
    'First insight about mechanism',
    'Second insight about pathway',
    'Third insight about targets',
    'Fourth insight (should be hidden)',
  ],
  status: 'ready',
  metadata: { sources: 3 },
  lastGenerated: new Date('2024-01-01T12:00:00Z'),
};

const mockStores = {
  regenerateArtefact: vi.fn(),
  setActiveModal: vi.fn(),
};

describe('ArtefactCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArtefactsStore.mockReturnValue({
      artefacts: {
        moa: { id: 'moa', type: 'moa', title: 'MoA Brief', bullets: [], status: 'idle', metadata: {} },
        safety: { id: 'safety', type: 'safety', title: 'Safety Brief', bullets: [], status: 'idle', metadata: {} },
        kol: { id: 'kol', type: 'kol', title: 'KOL Sentiment', bullets: [], status: 'idle', metadata: {} },
      },
      updateArtefact: vi.fn(),
      regenerateArtefact: mockStores.regenerateArtefact,
      setArtefactStatus: vi.fn(),
      getArtefactByType: vi.fn(),
    });
    mockUseUIStore.mockReturnValue({
      ui: { theme: 'light', insightPanelCollapsed: false, activeModal: null, sidebarOpen: false },
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
      setInsightPanelCollapsed: vi.fn(),
      toggleInsightPanel: vi.fn(),
      setActiveModal: mockStores.setActiveModal,
      setSidebarOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    });
  });

  it('renders artefact card with title and status', () => {
    render(<ArtefactCard artefact={mockArtefact} />);
    
    expect(screen.getByText('Test MoA Brief')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('displays bullet points correctly', () => {
    render(<ArtefactCard artefact={mockArtefact} />);
    
    expect(screen.getByText('First insight about mechanism')).toBeInTheDocument();
    expect(screen.getByText('Second insight about pathway')).toBeInTheDocument();
    expect(screen.getByText('Third insight about targets')).toBeInTheDocument();
    
    // Fourth bullet should not be visible (only first 3 shown)
    expect(screen.queryByText('Fourth insight (should be hidden)')).not.toBeInTheDocument();
    
    // Should show "View more" link
    expect(screen.getByText('View 1 more insights')).toBeInTheDocument();
  });

  it('handles regenerate button click', () => {
    render(<ArtefactCard artefact={mockArtefact} />);
    
    const regenerateButton = screen.getByTitle('Regenerate');
    fireEvent.click(regenerateButton);
    
    expect(mockStores.regenerateArtefact).toHaveBeenCalledWith('moa');
  });

  it('handles expand button click', () => {
    render(<ArtefactCard artefact={mockArtefact} />);
    
    const expandButton = screen.getByTitle('Expand details');
    fireEvent.click(expandButton);
    
    expect(mockStores.setActiveModal).toHaveBeenCalledWith('artefact-detail-moa');
  });

  it('handles download functionality', async () => {
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockAnchor);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    document.createElement = mockCreateElement as any;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(<ArtefactCard artefact={mockArtefact} />);
    
    const downloadButton = screen.getByTitle('Download');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('test-moa-brief.md');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  it('shows generating state correctly', () => {
    const generatingArtefact = {
      ...mockArtefact,
      status: 'generating' as const,
    };
    
    render(<ArtefactCard artefact={generatingArtefact} />);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(screen.getByText('Generating insights...')).toBeInTheDocument();
    
    // Regenerate button should be disabled
    const regenerateButton = screen.getByTitle('Regenerate');
    expect(regenerateButton).toBeDisabled();
  });

  it('shows error state correctly', () => {
    const errorArtefact = {
      ...mockArtefact,
      status: 'error' as const,
      errorMessage: 'Failed to generate insights',
    };
    
    render(<ArtefactCard artefact={errorArtefact} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows idle state correctly', () => {
    const idleArtefact = {
      ...mockArtefact,
      status: 'idle' as const,
      bullets: [],
    };
    
    render(<ArtefactCard artefact={idleArtefact} />);
    
    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByText('No insights generated yet')).toBeInTheDocument();
    expect(screen.getByText('Generate Insights')).toBeInTheDocument();
  });

  it('disables download button when no content available', () => {
    const emptyArtefact = {
      ...mockArtefact,
      bullets: [],
    };
    
    render(<ArtefactCard artefact={emptyArtefact} />);
    
    const downloadButton = screen.getByTitle('Download');
    expect(downloadButton).toBeDisabled();
  });

  it('calls custom handlers when provided', () => {
    const customHandlers = {
      onRegenerate: vi.fn(),
      onDownload: vi.fn(),
      onExpand: vi.fn(),
    };
    
    render(<ArtefactCard artefact={mockArtefact} {...customHandlers} />);
    
    fireEvent.click(screen.getByTitle('Regenerate'));
    expect(customHandlers.onRegenerate).toHaveBeenCalledWith('test-artefact');
    
    fireEvent.click(screen.getByTitle('Download'));
    expect(customHandlers.onDownload).toHaveBeenCalledWith('test-artefact');
    
    fireEvent.click(screen.getByTitle('Expand details'));
    expect(customHandlers.onExpand).toHaveBeenCalledWith('test-artefact');
  });
});