import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getThemeColors, applyTheme, detectSystemTheme, createThemeTransition } from '../theme-utils';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock document methods
const mockDocumentElement = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
  style: {
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  writable: true,
  value: mockDocumentElement,
});

describe('Theme Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getThemeColors', () => {
    it('should return light theme colors', () => {
      const colors = getThemeColors('light');
      
      expect(colors.background).toBe('#f6f1e5'); // sand
      expect(colors.surface).toBe('#ffffff');
      expect(colors.text).toBe('#203655'); // navy
      expect(colors.accent).toBe('#d9c1a1'); // peach
    });

    it('should return dark theme colors', () => {
      const colors = getThemeColors('dark');
      
      expect(colors.background).toBe('#203655'); // navy (flipped)
      expect(colors.surface).toBe('#1a2538');
      expect(colors.text).toBe('#f6f1e5'); // sand (flipped)
      expect(colors.accent).toBe('#d9c1a1'); // peach (same)
    });

    it('should handle invalid theme gracefully', () => {
      const colors = getThemeColors('invalid' as any);
      
      // Should default to light theme
      expect(colors.background).toBe('#f6f1e5');
    });
  });

  describe('applyTheme', () => {
    it('should apply light theme correctly', () => {
      applyTheme('light');
      
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-background', '#f6f1e5');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-surface', '#ffffff');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text', '#203655');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-accent', '#d9c1a1');
    });

    it('should apply dark theme correctly', () => {
      applyTheme('dark');
      
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-background', '#203655');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-surface', '#1a2538');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text', '#f6f1e5');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-accent', '#d9c1a1');
    });

    it('should handle theme persistence', () => {
      const mockSetItem = vi.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { setItem: mockSetItem },
        writable: true,
      });

      applyTheme('dark', true);
      
      expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('detectSystemTheme', () => {
    it('should detect dark system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const theme = detectSystemTheme();
      
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(theme).toBe('dark');
    });

    it('should detect light system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const theme = detectSystemTheme();
      
      expect(theme).toBe('light');
    });

    it('should handle matchMedia not supported', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('Not supported');
      });

      const theme = detectSystemTheme();
      
      expect(theme).toBe('light'); // Default fallback
    });
  });

  describe('createThemeTransition', () => {
    it('should create smooth theme transition', () => {
      const cleanup = createThemeTransition();
      
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        'transition',
        'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease'
      );
      
      // Test cleanup
      cleanup();
      expect(mockDocumentElement.style.removeProperty).toHaveBeenCalledWith('transition');
    });

    it('should handle custom transition duration', () => {
      const cleanup = createThemeTransition(500);
      
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        'transition',
        'background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease'
      );
      
      cleanup();
    });

    it('should auto-cleanup after timeout', (done) => {
      const cleanup = createThemeTransition(100);
      
      setTimeout(() => {
        expect(mockDocumentElement.style.removeProperty).toHaveBeenCalledWith('transition');
        done();
      }, 150);
    });
  });

  describe('theme integration', () => {
    it('should handle complete theme switching workflow', () => {
      // Start with light theme
      applyTheme('light');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
      
      // Create transition
      const cleanup = createThemeTransition();
      
      // Switch to dark theme
      applyTheme('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
      
      // Cleanup transition
      cleanup();
      expect(mockDocumentElement.style.removeProperty).toHaveBeenCalledWith('transition');
    });

    it('should handle system theme changes', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      // Simulate system theme listener
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = vi.fn();
      
      mediaQuery.addEventListener('change', listener);
      
      expect(mockAddEventListener).toHaveBeenCalledWith('change', listener);
      
      // Simulate theme change
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });
      
      const newTheme = detectSystemTheme();
      expect(newTheme).toBe('dark');
    });
  });

  describe('accessibility considerations', () => {
    it('should respect reduced motion preferences', () => {
      mockMatchMedia.mockImplementation((query) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        }
        return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      });

      const cleanup = createThemeTransition();
      
      // Should not add transition if reduced motion is preferred
      expect(mockDocumentElement.style.setProperty).not.toHaveBeenCalledWith(
        'transition',
        expect.stringContaining('0.3s')
      );
      
      cleanup();
    });

    it('should maintain contrast ratios in both themes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');
      
      // Basic contrast check (simplified)
      expect(lightColors.text).not.toBe(lightColors.background);
      expect(darkColors.text).not.toBe(darkColors.background);
      
      // Ensure text colors are different between themes
      expect(lightColors.text).not.toBe(darkColors.text);
      expect(lightColors.background).not.toBe(darkColors.background);
    });
  });
});