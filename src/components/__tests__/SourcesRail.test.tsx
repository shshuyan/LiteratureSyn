import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SourcesRail } from '../SourcesRail';
import { useAppStore } from '@/lib/store';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
}));

describe('SourcesRail Component', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      sources: [],
      selectedSourceIds: [],
      sourceFilters: { search: '', tags: [] },
    });
  });

  it('should render empty state when no sources are available', () => {
    render(<SourcesRail />);
    
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('No sources yet')).toBeInTheDocument();
    expect(screen.getByText('Upload documents to get started with your analysis')).toBeInTheDocument();
  });

  it('should display sources with titles and status indicators', () => {
    // Add sample sources to store
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Test Document 1',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['test'],
          uploadDate: new Date('2024-01-01'),
        },
        {
          id: '2',
          title: 'Test Document 2',
          status: 'embedding',
          progress: 50,
          selected: false,
          tags: ['test'],
          uploadDate: new Date('2024-01-02'),
        },
      ],
    });

    render(<SourcesRail />);
    
    expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument(); // Ready status
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument(); // Embedding status
  });

  it('should show progress bar for embedding sources', () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Embedding Document',
          status: 'embedding',
          progress: 75,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
      ],
    });

    render(<SourcesRail />);
    
    expect(screen.getByText('Processing... 75%')).toBeInTheDocument();
  });

  it('should display error message for failed sources', () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Failed Document',
          status: 'error',
          progress: 0,
          selected: false,
          tags: [],
          uploadDate: new Date(),
          errorMessage: 'Processing failed',
        },
      ],
    });

    render(<SourcesRail />);
    
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
  });

  it('should filter sources by search term', async () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Machine Learning Paper',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
        {
          id: '2',
          title: 'Deep Learning Study',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
      ],
    });

    render(<SourcesRail />);
    
    const searchInput = screen.getByPlaceholderText('Search sources...');
    fireEvent.change(searchInput, { target: { value: 'Machine' } });
    
    await waitFor(() => {
      // Check that the highlighted text is present
      expect(screen.getByText('Machine')).toBeInTheDocument();
      expect(screen.queryByText('Deep Learning Study')).not.toBeInTheDocument();
      // Check that only 1 source is shown (filtered)
      expect(screen.getByText('Select all (1)')).toBeInTheDocument();
    });
  });

  it('should highlight matching text in search results', () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Machine Learning Paper',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
      ],
      sourceFilters: { search: 'Machine', tags: [] },
    });

    render(<SourcesRail />);
    
    const highlightedText = screen.getByText('Machine');
    expect(highlightedText.tagName).toBe('MARK');
  });

  it('should toggle source selection with checkboxes', () => {
    const mockToggleSelection = vi.fn();
    
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Test Document',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
      ],
    });

    // Mock the toggle function
    useAppStore.getState().toggleSourceSelection = mockToggleSelection;

    render(<SourcesRail />);
    
    const checkbox = screen.getAllByRole('checkbox')[1]; // First is select all, second is the source
    fireEvent.click(checkbox);
    
    expect(mockToggleSelection).toHaveBeenCalledWith('1');
  });

  it('should show and filter by tags', async () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'ML Paper',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['machine-learning', 'AI'],
          uploadDate: new Date(),
        },
        {
          id: '2',
          title: 'NLP Paper',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['NLP', 'AI'],
          uploadDate: new Date(),
        },
      ],
    });

    render(<SourcesRail />);
    
    // Open tag filter
    const filterButton = screen.getByTestId('filter-icon').closest('button');
    fireEvent.click(filterButton!);
    
    await waitFor(() => {
      expect(screen.getAllByText('machine-learning')).toHaveLength(2); // One in filter, one in source tags
      expect(screen.getAllByText('AI')).toHaveLength(3); // One in filter, two in source tags (both sources have AI tag)
      expect(screen.getAllByText('NLP')).toHaveLength(2);
    });
  });

  it('should show empty state when no sources match filters', () => {
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Test Document',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['test'],
          uploadDate: new Date(),
        },
      ],
      sourceFilters: { search: 'nonexistent', tags: [] },
    });

    render(<SourcesRail />);
    
    expect(screen.getByText('No matching sources')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
  });

  it('should handle select all functionality', () => {
    const mockToggleSelection = vi.fn();
    
    useAppStore.setState({
      sources: [
        {
          id: '1',
          title: 'Document 1',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
        {
          id: '2',
          title: 'Document 2',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: [],
          uploadDate: new Date(),
        },
      ],
      selectedSourceIds: [],
    });

    useAppStore.getState().toggleSourceSelection = mockToggleSelection;

    render(<SourcesRail />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    // Should call toggle for each source
    expect(mockToggleSelection).toHaveBeenCalledTimes(2);
  });

  it('should clear filters when clear button is clicked', () => {
    const mockSetSourceFilters = vi.fn();
    
    useAppStore.setState({
      sources: [],
      sourceFilters: { search: 'test', tags: ['tag1'] },
    });

    useAppStore.getState().setSourceFilters = mockSetSourceFilters;

    render(<SourcesRail />);
    
    const clearButton = screen.getByTestId('x-icon').closest('button');
    fireEvent.click(clearButton!);
    
    expect(mockSetSourceFilters).toHaveBeenCalledWith({ search: '', tags: [] });
  });
});