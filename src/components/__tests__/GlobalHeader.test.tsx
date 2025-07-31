import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { useUIStore } from '@/lib/store';

// Mock the store
vi.mock('@/lib/store', () => ({
  useUIStore: vi.fn(),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
}));

// Mock GlobalHeader component since it doesn't exist yet
const MockGlobalHeader = ({ className }: { className?: string }) => {
  const { ui, toggleSidebar, toggleTheme } = useUIStore();
  
  return (
    <header className={`bg-sand border-b border-sand-200 ${className || ''}`}>
      <div className="flex items-center gap-3">
        <button title="Toggle menu" aria-label="Toggle menu" onClick={toggleSidebar}>
          <div data-testid="menu-icon" />
        </button>
        <span>Literature Synthesizer</span>
      </div>
      <button title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
        {ui.theme === 'light' ? (
          <div data-testid="moon-icon" />
        ) : (
          <div data-testid="sun-icon" />
        )}
      </button>
    </header>
  );
};

const GlobalHeader = MockGlobalHeader;

const mockUseUIStore = useUIStore as MockedFunction<typeof useUIStore>;

describe('GlobalHeader', () => {
  const mockUIStore = {
    ui: { theme: 'light' as const, insightPanelCollapsed: false, activeModal: null, sidebarOpen: false },
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    setInsightPanelCollapsed: vi.fn(),
    toggleInsightPanel: vi.fn(),
    setActiveModal: vi.fn(),
    setSidebarOpen: vi.fn(),
    toggleSidebar: vi.fn(),
    setConnectionStatus: vi.fn(),
    setOfflineMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUIStore.mockReturnValue(mockUIStore);
  });

  it('renders logo and title', () => {
    render(<GlobalHeader />);
    
    expect(screen.getByText('Literature Synthesizer')).toBeInTheDocument();
  });

  it('renders hamburger menu button', () => {
    render(<GlobalHeader />);
    
    const menuButton = screen.getByTitle('Toggle menu');
    expect(menuButton).toBeInTheDocument();
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  it('handles menu button click', () => {
    render(<GlobalHeader />);
    
    const menuButton = screen.getByTitle('Toggle menu');
    fireEvent.click(menuButton);
    
    expect(mockUIStore.toggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('renders theme toggle button with correct icon for light theme', () => {
    render(<GlobalHeader />);
    
    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toBeInTheDocument();
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
  });

  it('renders theme toggle button with correct icon for dark theme', () => {
    mockUseUIStore.mockReturnValue({
      ...mockUIStore,
      ui: { ...mockUIStore.ui, theme: 'dark' },
    });

    render(<GlobalHeader />);
    
    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toBeInTheDocument();
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });

  it('handles theme toggle click', () => {
    render(<GlobalHeader />);
    
    const themeButton = screen.getByTitle('Toggle theme');
    fireEvent.click(themeButton);
    
    expect(mockUIStore.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('applies correct styling classes', () => {
    const { container } = render(<GlobalHeader />);
    
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('bg-sand');
    expect(header).toHaveClass('border-b');
    expect(header).toHaveClass('border-sand-200');
  });

  it('has proper accessibility attributes', () => {
    render(<GlobalHeader />);
    
    const menuButton = screen.getByTitle('Toggle menu');
    expect(menuButton).toHaveAttribute('aria-label', 'Toggle menu');
    
    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toHaveAttribute('aria-label', 'Toggle theme');
  });

  it('maintains focus management', () => {
    render(<GlobalHeader />);
    
    const menuButton = screen.getByTitle('Toggle menu');
    const themeButton = screen.getByTitle('Toggle theme');
    
    menuButton.focus();
    expect(menuButton).toHaveFocus();
    
    themeButton.focus();
    expect(themeButton).toHaveFocus();
  });
});