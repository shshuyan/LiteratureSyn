import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useResponsive } from '@/lib/hooks/useResponsive';
import { useTouchFriendly } from '@/lib/hooks/useTouchFriendly';

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Hooks', () => {
  describe('useResponsive', () => {
    beforeEach(() => {
      // Reset to desktop size
      mockInnerWidth(1280);
    });

    it('should detect mobile breakpoint correctly', () => {
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        mockInnerWidth(600); // Mobile size
      });

      expect(result.current.mobile).toBe(true);
      expect(result.current.tablet).toBe(false);
      expect(result.current.desktop).toBe(false);
    });

    it('should detect tablet breakpoint correctly', () => {
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        mockInnerWidth(1000); // Tablet size
      });

      expect(result.current.mobile).toBe(false);
      expect(result.current.tablet).toBe(true);
      expect(result.current.desktop).toBe(false);
    });

    it('should detect desktop breakpoint correctly', () => {
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        mockInnerWidth(1400); // Desktop size
      });

      expect(result.current.mobile).toBe(false);
      expect(result.current.tablet).toBe(false);
      expect(result.current.desktop).toBe(true);
    });
  });

  describe('useTouchFriendly', () => {
    it('should create touch handler correctly', () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useTouchFriendly());
      
      const touchHandler = result.current.createTouchHandler(mockCallback);
      touchHandler();
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should detect touch device capability', () => {
      const { result } = renderHook(() => useTouchFriendly());
      
      // This will depend on the test environment
      expect(typeof result.current.isTouchDevice).toBe('boolean');
    });
  });
});