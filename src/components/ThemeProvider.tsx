'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const { ui, setTheme: setStoreTheme, toggleTheme: toggleStoreTheme } = useUIStore();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Detect system theme preference and other accessibility preferences
  useEffect(() => {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setSystemTheme(colorSchemeQuery.matches ? 'dark' : 'light');

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    const handleContrastChange = () => {
      // Re-apply theme to update contrast settings
      applyTheme(ui.theme);
    };

    const handleMotionChange = () => {
      // Re-apply theme to update motion settings
      applyTheme(ui.theme);
    };

    colorSchemeQuery.addEventListener('change', handleColorSchemeChange);
    contrastQuery.addEventListener('change', handleContrastChange);
    motionQuery.addEventListener('change', handleMotionChange);
    
    return () => {
      colorSchemeQuery.removeEventListener('change', handleColorSchemeChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [ui.theme]);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    const savedTheme = localStorage.getItem(storageKey) as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (systemTheme === 'dark' ? 'dark' : defaultTheme);
    
    setStoreTheme(initialTheme);
    applyTheme(initialTheme);
  }, [defaultTheme, storageKey, setStoreTheme, systemTheme]);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem(storageKey, ui.theme);
    applyTheme(ui.theme);
  }, [ui.theme, mounted, storageKey]);

  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    // Add smooth transition class before theme change
    root.classList.add('theme-transitioning');
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(theme);
    
    // Update meta theme-color for mobile browsers with enhanced colors
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeColor = theme === 'dark' ? '#203655' : '#f6f1e5';
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    }

    // Update color-scheme for better browser integration
    root.style.colorScheme = theme;
    
    // Check for high contrast preference and adjust accordingly
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Ensure proper focus visibility with enhanced accessibility
    root.style.setProperty('--focus-ring-width', prefersHighContrast ? '3px' : '2px');
    root.style.setProperty('--focus-ring-offset', prefersHighContrast ? '3px' : '2px');
    
    // Add theme-specific CSS custom properties for enhanced visual polish
    if (theme === 'dark') {
      root.style.setProperty('--theme-glow', 'rgba(246, 241, 229, 0.1)');
      root.style.setProperty('--theme-shadow', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--theme-overlay', 'rgba(32, 54, 85, 0.8)');
    } else {
      root.style.setProperty('--theme-glow', 'rgba(217, 193, 161, 0.2)');
      root.style.setProperty('--theme-shadow', 'rgba(32, 54, 85, 0.1)');
      root.style.setProperty('--theme-overlay', 'rgba(246, 241, 229, 0.9)');
    }
    
    // Enhanced viewport meta for mobile optimization
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute(
      'content', 
      'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no'
    );
    
    // Add status bar styling for iOS
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta');
      statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(statusBarMeta);
    }
    statusBarMeta.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
    
    // Remove transition class after animation completes
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
    
    // Dispatch custom event for other components to react to theme changes
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme, timestamp: Date.now() } 
    }));
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setStoreTheme(theme);
  };

  const toggleTheme = () => {
    toggleStoreTheme();
  };

  const value: ThemeContextType = {
    theme: ui.theme,
    setTheme,
    toggleTheme,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}