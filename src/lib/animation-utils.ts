'use client';

import { Variants, Transition } from 'framer-motion';

// Optimized spring configurations for 60fps
export const springConfigs = {
  // Fast and snappy for UI interactions
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
  
  // Smooth for panel transitions
  smooth: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 1,
  },
  
  // Gentle for content animations
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
    mass: 1.2,
  },
  
  // Bouncy for playful interactions
  bouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 20,
    mass: 0.6,
  },
} as const;

// Optimized easing functions
export const easings = {
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  sharp: [0.4, 0.0, 0.6, 1],
} as const;

// Performance-optimized animation variants
export const fadeVariants: Variants = {
  initial: { 
    opacity: 0,
    // Use transform3d to trigger hardware acceleration
    transform: 'translate3d(0, 0, 0)',
  },
  animate: { 
    opacity: 1,
    transform: 'translate3d(0, 0, 0)',
    transition: springConfigs.gentle,
  },
  exit: { 
    opacity: 0,
    transform: 'translate3d(0, 0, 0)',
    transition: { duration: 0.2, ease: easings.easeIn },
  },
};

export const slideUpVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    transform: 'translate3d(0, 20px, 0)',
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transform: 'translate3d(0, 0, 0)',
    transition: springConfigs.smooth,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transform: 'translate3d(0, -10px, 0)',
    transition: { duration: 0.2, ease: easings.easeIn },
  },
};

export const slideInFromRightVariants: Variants = {
  initial: { 
    x: '100%',
    transform: 'translate3d(100%, 0, 0)',
  },
  animate: { 
    x: 0,
    transform: 'translate3d(0, 0, 0)',
    transition: springConfigs.smooth,
  },
  exit: { 
    x: '100%',
    transform: 'translate3d(100%, 0, 0)',
    transition: { duration: 0.3, ease: easings.easeIn },
  },
};

export const scaleVariants: Variants = {
  initial: { 
    scale: 0.95, 
    opacity: 0,
    transform: 'translate3d(0, 0, 0) scale(0.95)',
  },
  animate: { 
    scale: 1, 
    opacity: 1,
    transform: 'translate3d(0, 0, 0) scale(1)',
    transition: springConfigs.snappy,
  },
  exit: { 
    scale: 0.95, 
    opacity: 0,
    transform: 'translate3d(0, 0, 0) scale(0.95)',
    transition: { duration: 0.15, ease: easings.easeIn },
  },
};

// Stagger animations for lists
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { 
    opacity: 0, 
    y: 10,
    transform: 'translate3d(0, 10px, 0)',
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transform: 'translate3d(0, 0, 0)',
    transition: springConfigs.gentle,
  },
};

// Hover and tap animations
export const interactiveVariants = {
  hover: { 
    scale: 1.02,
    transform: 'translate3d(0, 0, 0) scale(1.02)',
    transition: { duration: 0.2, ease: easings.easeOut },
  },
  tap: { 
    scale: 0.98,
    transform: 'translate3d(0, 0, 0) scale(0.98)',
    transition: { duration: 0.1, ease: easings.easeOut },
  },
};

// Loading spinner animation
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Progress bar animation
export const progressVariants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.3, ease: easings.easeOut },
  }),
};

// Utility functions for performance optimization
export function useReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Create performance-aware transition
export function createTransition(
  baseTransition: Transition,
  reducedMotion = false
): Transition {
  if (reducedMotion) {
    return {
      ...baseTransition,
      duration: 0.01, // Nearly instant for reduced motion
    };
  }
  return baseTransition;
}

// Optimized layout animation props
export const layoutProps = {
  layout: true,
  layoutId: undefined, // Set this per component
  transition: springConfigs.smooth,
};

// Animation performance monitoring
export function measureAnimationPerformance(name: string, callback: () => void) {
  if (typeof window === 'undefined') return callback();
  
  const start = performance.now();
  
  requestAnimationFrame(() => {
    callback();
    
    requestAnimationFrame(() => {
      const end = performance.now();
      const duration = end - start;
      
      // Log slow animations (> 16.67ms for 60fps)
      if (duration > 16.67) {
        console.warn(`Slow animation "${name}": ${duration.toFixed(2)}ms`);
      }
    });
  });
}

// Batch DOM updates for better performance
export function batchUpdates(updates: (() => void)[]) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

// Throttle animation updates
export function throttleAnimation<T extends (...args: any[]) => void>(
  func: T,
  limit: number = 16.67 // 60fps
): T {
  let inThrottle: boolean;
  return (function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}