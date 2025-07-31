import { useState, useEffect } from 'react';

export type BreakpointKey = 'mobile' | 'tablet' | 'desktop';

interface BreakpointValues {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

const breakpoints = {
  mobile: 767,
  tablet: 1279,
} as const;

export function useResponsive(): BreakpointValues {
  const [breakpointValues, setBreakpointValues] = useState<BreakpointValues>({
    mobile: false,
    tablet: false,
    desktop: false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      
      setBreakpointValues({
        mobile: width <= breakpoints.mobile,
        tablet: width > breakpoints.mobile && width <= breakpoints.tablet,
        desktop: width > breakpoints.tablet,
      });
    };

    // Set initial values
    updateBreakpoints();

    // Add event listener
    window.addEventListener('resize', updateBreakpoints);

    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoints);
  }, []);

  return breakpointValues;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const updateMatches = () => setMatches(mediaQuery.matches);
    
    // Set initial value
    updateMatches();
    
    // Add listener
    mediaQuery.addEventListener('change', updateMatches);
    
    // Cleanup
    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}