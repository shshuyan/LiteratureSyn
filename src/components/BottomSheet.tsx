'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
  showDragHandle?: boolean;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '75vh',
  showDragHandle = true,
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle drag gestures for closing
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Close if dragged down significantly or with high velocity
    if (offset > threshold || velocity > 500) {
      onClose();
    }
  };

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeDown: onClose,
    threshold: 50,
    preventDefaultTouchMove: isOpen,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      // Focus the sheet for accessibility
      sheetRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            className={`fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-lg shadow-2xl overflow-hidden focus:outline-none ${className}`}
            style={{ 
              maxHeight,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              mass: 0.8
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            {...swipeHandlers}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Bottom sheet"}
          >
            {/* Header with drag handle */}
            <div className="flex flex-col">
              {showDragHandle && (
                <div className="flex justify-center py-3 px-4 cursor-grab active:cursor-grabbing">
                  <div className="w-8 h-1 bg-border rounded-full" />
                </div>
              )}
              
              {title && (
                <div className="px-4 pb-2 border-b border-border/50">
                  <h2 className="text-lg font-semibold text-card-foreground">
                    {title}
                  </h2>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div 
              className="overflow-y-auto flex-1"
              style={{ 
                maxHeight: title 
                  ? `calc(${maxHeight} - 80px)` 
                  : `calc(${maxHeight} - 40px)`
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for managing bottom sheet state
export function useBottomSheet(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}