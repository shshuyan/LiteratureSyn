import { Theme } from './types';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export function getThemeColors(theme: Theme): ThemeColors {
  if (theme === 'dark') {
    return {
      background: '#203655', // navy (flipped)
      surface: '#1a2538',
      text: '#f6f1e5', // sand (flipped)
      accent: '#d9c1a1', // peach (same)
    };
  }
  
  // Default to light theme
  return {
    background: '#f6f1e5', // sand
    surface: '#ffffff',
    text: '#203655', // navy
    accent: '#d9c1a1', // peach
  };
}

export function applyTheme(theme: Theme, persist: boolean = false): void {
  const colors = getThemeColors(theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Set CSS custom properties
  document.documentElement.style.setProperty('--color-background', colors.background);
  document.documentElement.style.setProperty('--color-surface', colors.surface);
  document.documentElement.style.setProperty('--color-text', colors.text);
  document.documentElement.style.setProperty('--color-accent', colors.accent);
  
  if (persist) {
    localStorage.setItem('theme', theme);
  }
}

export function detectSystemTheme(): Theme {
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery.matches ? 'dark' : 'light';
  } catch {
    return 'light'; // Fallback
  }
}

export function createThemeTransition(duration: number = 300): () => void {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    return () => {}; // No transition if reduced motion is preferred
  }
  
  const transitionValue = `background-color ${duration / 1000}s ease, color ${duration / 1000}s ease, border-color ${duration / 1000}s ease`;
  
  document.documentElement.style.setProperty('transition', transitionValue);
  
  const cleanup = () => {
    document.documentElement.style.removeProperty('transition');
  };
  
  // Auto-cleanup after transition duration
  setTimeout(cleanup, duration + 50);
  
  return cleanup;
}