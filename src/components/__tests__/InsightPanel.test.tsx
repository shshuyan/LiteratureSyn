import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { InsightPanel } from '../InsightPanel';
import { useArtefactsStore, useUIStore } from '@/lib/store';
import { Artefact } from '@/lib/types';

// Mock the stores
vi.mock('@/lib/store', () => ({
  useArtefactsStore: vi.fn(),
  useUIStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
}));

// Mock ArtefactCard component
vi.mock('../ArtefactCard', () => ({
  ArtefactCard: ({ artefact }: { artefact: Artefact }) => (
    <div data-testid={`artefact-card-${artefact.type}`}>
      {artefact.title} - {artefact.status}
    </div>
  ),
}));

const mockUseArtefactsStore = useArtefactsStore as MockedFunction<typeof useArtefactsStore>;
const mockUseUIStore = useUIStore as MockedFunction<typeof useUIStore>;

const mockArtefacts = {
  moa: {
    id: 'moa',
    type: 'moa' as const,
    title: 'MoA Brief',
    bullets: ['Insight 1', 'Insight 2'],
    status: 'ready' as const,
    metadata: {},
    lastGenerated: new Date('2024-01-01T12:00:00Z'),
  },
  safety: {
    id: 'safety',
    type: 'safety' as const,
    title: 'Safety Brief',
    bullets: [],
    status: 'generating' as const,
    metadata: {},
  },
  kol: {
    id: 'kol',
    type: 'kol' as const,
    title: 'KOL Sentiment',
    bullets: [],
    status: 'idle' as const,
    metadata: {},
  },
};

describe('InsightPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArtefactsStore.mockReturnValue({
      artefacts: mockArtefacts,
      updateArtefact: vi.fn(),
      regenerateArtefact: vi.fn(),
      setArtefactStatus: vi.fn(),
      getArtefactByType: vi.fn(),
    });
    mockUseUIStore.mockReturnValue({
      ui: { theme: 'light', insightPanelCollapsed: false, activeModal: null, sidebarOpen: false },
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
      setInsightPanelCollapsed: vi.fn(),
      toggleInsightPanel: vi.fn(),
      setActiveModal: vi.fn(),
      setSidebarOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    });
  });

  it('renders the insight panel with header', () => {
    render(<InsightPanel />);
    
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('renders all three artefact cards in correct order', () => {
    render(<InsightPanel />);
    
    // Check that all three cards are rendered
    expect(screen.getByTestId('artefact-card-moa')).toBeInTheDocument();
    expect(screen.getByTestId('artefact-card-safety')).toBeInTheDocument();
    expect(screen.getByTestId('artefact-card-kol')).toBeInTheDocument();
    
    // Check content
    expect(screen.getByText('MoA Brief - ready')).toBeInTheDocument();
    expect(screen.getByText('Safety Brief - generating')).toBeInTheDocument();
    expect(screen.getByText('KOL Sentiment - idle')).toBeInTheDocument();
  });

  it('shows correct status indicators', () => {
    render(<InsightPanel />);
    
    // Should show status indicators for each card
    const statusIndicators = screen.getAllByTitle(/MoA Brief|Safety Brief|KOL Sentiment/);
    expect(statusIndicators).toHaveLength(3);
  });

  it('displays correct ready count in footer', () => {
    render(<InsightPanel />);
    
    expect(screen.getByText('1 of 3 insights ready')).toBeInTheDocument();
  });

  it('shows last updated time when artefacts have been generated', () => {
    render(<InsightPanel />);
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles case when no artefacts are generated', () => {
    const emptyArtefacts = {
      moa: { ...mockArtefacts.moa, status: 'idle' as const, lastGenerated: undefined },
      safety: { ...mockArtefacts.safety, status: 'idle' as const, lastGenerated: undefined },
      kol: { ...mockArtefacts.kol, status: 'idle' as const, lastGenerated: undefined },
    };

    mockUseArtefactsStore.mockReturnValue({
      artefacts: emptyArtefacts,
      updateArtefact: vi.fn(),
      regenerateArtefact: vi.fn(),
      setArtefactStatus: vi.fn(),
      getArtefactByType: vi.fn(),
    });

    render(<InsightPanel />);
    
    expect(screen.getByText('0 of 3 insights ready')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(<InsightPanel className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('maintains fixed card order regardless of status', () => {
    // Reorder the mock data to test that display order is maintained
    const reorderedArtefacts = {
      kol: mockArtefacts.kol,
      moa: mockArtefacts.moa,
      safety: mockArtefacts.safety,
    };

    mockUseArtefactsStore.mockReturnValue({
      artefacts: reorderedArtefacts,
      updateArtefact: vi.fn(),
      regenerateArtefact: vi.fn(),
      setArtefactStatus: vi.fn(),
      getArtefactByType: vi.fn(),
    });

    render(<InsightPanel />);
    
    const cards = screen.getAllByTestId(/artefact-card-/);
    
    // Should still be in MoA, Safety, KOL order
    expect(cards[0]).toHaveAttribute('data-testid', 'artefact-card-moa');
    expect(cards[1]).toHaveAttribute('data-testid', 'artefact-card-safety');
    expect(cards[2]).toHaveAttribute('data-testid', 'artefact-card-kol');
  });
});