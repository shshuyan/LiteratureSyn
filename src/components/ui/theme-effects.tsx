'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { 
  springConfigs, 
  fadeVariants, 
  scaleVariants, 
  interactiveVariants,
  useReducedMotion,
  createTransition 
} from '@/lib/animation-utils';

// Theme transition wrapper component
export function ThemeTransition({ children }: { children: React.ReactNode }) {
  const { ui } = useUIStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), reducedMotion ? 50 : 300);
    return () => clearTimeout(timer);
  }, [ui.theme, reducedMotion]);

  return (
    <motion.div
      className={`theme-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}
      animate={{ 
        opacity: isTransitioning ? 0.95 : 1,
        transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
      }}
      transition={createTransition({ duration: 0.15, ease: 'easeInOut' }, reducedMotion)}
    >
      {children}
    </motion.div>
  );
}

// Floating action button with theme-aware styling
export function FloatingButton({
  children,
  onClick,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.button
      whileHover={reducedMotion ? undefined : { 
        scale: 1.05, 
        y: -2,
        transform: 'translate3d(0, -2px, 0) scale(1.05)',
        boxShadow: '0 8px 25px rgba(217, 193, 161, 0.3)'
      }}
      whileTap={reducedMotion ? undefined : { 
        scale: 0.95, 
        y: 0,
        transform: 'translate3d(0, 0, 0) scale(0.95)'
      }}
      transition={springConfigs.snappy}
      onClick={onClick}
      className={`
        transition-all duration-300 ease-out hover:shadow-xl hover:shadow-peach/20 hover:-translate-y-1
        bg-navy text-sand dark:bg-sand dark:text-navy hover:bg-navy/90 dark:hover:bg-sand/90
        rounded-full p-3 shadow-sm hover:shadow-md active:shadow-sm
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Enhanced card component with theme-aware animations
export function ThemeCard({
  children,
  className = '',
  interactive = false,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  [key: string]: any;
}) {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      whileHover={interactive && !reducedMotion ? { 
        y: -2,
        transform: 'translate3d(0, -2px, 0)',
        boxShadow: '0 8px 25px rgba(217, 193, 161, 0.15)' 
      } : undefined}
      transition={springConfigs.gentle}
      className={`
        bg-card border border-border rounded-lg shadow-sm
        hover:shadow-md hover:border-peach/30
        transition-all duration-200 ease-out
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-peach/10 active:translate-y-0 active:shadow-md' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Loading skeleton with theme-aware styling
export function ThemeSkeleton({
  className = '',
  lines = 1,
  ...props
}: {
  className?: string;
  lines?: number;
  [key: string]: any;
}) {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-gradient-to-r from-sand via-peach/20 to-sand dark:from-navy dark:via-sand/10 dark:to-navy animate-pulse rounded h-4"
          style={{ width: `${Math.random() * 40 + 60}%` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: 'easeInOut',
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
}

// Status indicator with enhanced animations
export function StatusIndicator({
  status,
  children,
  className = '',
  ...props
}: {
  status: 'idle' | 'processing' | 'ready' | 'error';
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  const statusConfig = {
    idle: { color: 'bg-sand/50 text-navy/60 dark:bg-slate-700 dark:text-slate-400', pulse: false },
    processing: { color: 'bg-peach/20 text-peach-800 dark:bg-peach/10 dark:text-peach-400', pulse: true },
    ready: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', pulse: false },
    error: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', pulse: false }
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ease-out
        ${config.color}
        ${config.pulse ? 'relative' : ''}
        ${className}
      `}
      {...props}
    >
      {config.pulse && (
        <motion.div
          className="w-2 h-2 bg-current rounded-full mr-1"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {children}
    </motion.div>
  );
}

// Progress bar with theme-aware styling and animations
export function ThemeProgressBar({
  progress,
  className = '',
  showLabel = false,
  ...props
}: {
  progress: number;
  className?: string;
  showLabel?: boolean;
  [key: string]: any;
}) {
  return (
    <div className={`transition-all duration-300 ease-out ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between text-sm text-medium-contrast mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-input rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-peach to-peach/80 transition-all duration-500 ease-out"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Interactive button with enhanced hover effects
export function InteractiveButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  [key: string]: any;
}) {
  const reducedMotion = useReducedMotion();
  
  const variants = {
    primary: 'bg-navy text-sand dark:bg-sand dark:text-navy hover:bg-navy/90 dark:hover:bg-sand/90 focus:ring-2 focus:ring-peach focus:ring-offset-2 shadow-sm hover:shadow-md active:shadow-sm',
    secondary: 'bg-peach text-navy hover:bg-peach/90 active:bg-peach/80 focus:ring-2 focus:ring-navy focus:ring-offset-2 shadow-sm hover:shadow-md active:shadow-sm',
    ghost: 'bg-transparent text-navy dark:text-sand hover:bg-accent-bg active:bg-accent-bg/80 focus:ring-2 focus:ring-peach focus:ring-offset-2'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <motion.button
      whileHover={reducedMotion ? undefined : interactiveVariants.hover}
      whileTap={reducedMotion ? undefined : interactiveVariants.tap}
      transition={springConfigs.snappy}
      className={`
        ${variants[variant]} ${sizes[size]}
        transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 hover:shadow-peach/20 active:translate-y-0 active:shadow-sm
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach focus-visible:ring-offset-2 focus-visible:ring-offset-background
        rounded-md font-medium
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Toast notification with theme-aware styling
export function ThemeToast({
  message,
  type = 'info',
  onClose,
  ...props
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  [key: string]: any;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    info: 'bg-card border-border text-foreground',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`
            fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg
            ${typeStyles[type]}
          `}
          {...props}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{message}</span>
            {onClose && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => onClose(), 300);
                }}
                className="text-current hover:opacity-70 transition-opacity"
              >
                ×
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Backdrop overlay with theme-aware styling
export function ThemeBackdrop({
  isOpen,
  onClose,
  className = '',
  ...props
}: {
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
  [key: string]: any;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          onClick={onClose}
          className={`
            fixed inset-0 z-40 bg-navy/50 dark:bg-sand/20 backdrop-blur-sm
            ${className}
          `}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}