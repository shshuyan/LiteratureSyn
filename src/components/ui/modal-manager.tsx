'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';
import { useUIStore } from '@/lib/store';

export interface ModalConfig {
  id: string;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
  persistent?: boolean; // Prevents closing on backdrop click
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModalConfig;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, config, children }: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key and focus management
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && config.closable !== false) {
        onClose();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isOpen) {
        // Focus trapping for accessibility
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the close button or first focusable element when modal opens
      setTimeout(() => {
        if (config.closable !== false) {
          closeButtonRef.current?.focus();
        } else {
          const firstFocusable = modalRef.current?.querySelector(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          firstFocusable?.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, config.closable]);

  const getSizeClasses = () => {
    switch (config.size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case 'full':
        return 'max-w-full mx-4';
      default:
        return 'max-w-md';
    }
  };

  const handleBackdropClick = () => {
    if (config.backdrop !== false && !config.persistent && config.closable !== false) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {config.backdrop !== false && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-center justify-center p-4"
            />
          )}

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none`}
          >
            <div
              className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-sand-200 dark:border-slate-700 w-full ${getSizeClasses()} max-h-[90vh] flex flex-col pointer-events-auto`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-sand-200 dark:border-slate-700">
                <h2 id="modal-title" className="text-lg font-semibold text-navy dark:text-slate-100">
                  {config.title}
                </h2>
                {config.closable !== false && (
                  <Button
                    ref={closeButtonRef}
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 hover:bg-peach/10 dark:hover:bg-peach/20 focus-ring"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      config={{
        id: 'confirmation',
        title,
        size: 'sm',
        closable: true,
        backdrop: true,
        persistent: false
      }}
    >
      <div className="p-4 space-y-4">
        <p className="text-sm text-navy/80 dark:text-slate-300 leading-relaxed">
          {message}
        </p>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="focus-ring"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleConfirm}
            className="focus-ring"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

// Alert Modal
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info'
}: AlertModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-green-800 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      config={{
        id: 'alert',
        title,
        size: 'sm',
        closable: true,
        backdrop: true,
        persistent: false
      }}
    >
      <div className="p-4 space-y-4">
        <div className={`p-3 rounded-md ${getVariantStyles()}`}>
          <p className="text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="focus-ring"
          >
            OK
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Manager Component
export function ModalManager() {
  const { ui, setActiveModal } = useUIStore();

  const handleClose = () => {
    setActiveModal(null);
  };

  // Handle different modal types
  const renderModal = () => {
    if (!ui.activeModal) return null;

    // Handle confirmation modals
    if (ui.activeModal.startsWith('confirm-')) {
      // This would be handled by specific confirmation modal instances
      return null;
    }

    // Handle alert modals
    if (ui.activeModal.startsWith('alert-')) {
      // This would be handled by specific alert modal instances
      return null;
    }

    // Handle custom modals
    if (ui.activeModal === 'settings') {
      return (
        <BaseModal
          isOpen={true}
          onClose={handleClose}
          config={{
            id: 'settings',
            title: 'Settings',
            size: 'md',
            closable: true,
            backdrop: true,
            persistent: false
          }}
        >
          <div className="p-4">
            <p className="text-sm text-navy/80 dark:text-slate-300">
              Settings panel would go here...
            </p>
          </div>
        </BaseModal>
      );
    }

    if (ui.activeModal === 'help') {
      return (
        <BaseModal
          isOpen={true}
          onClose={handleClose}
          config={{
            id: 'help',
            title: 'Help & Documentation',
            size: 'lg',
            closable: true,
            backdrop: true,
            persistent: false
          }}
        >
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-navy dark:text-slate-100 mb-2">
                Getting Started
              </h3>
              <p className="text-sm text-navy/80 dark:text-slate-300 leading-relaxed">
                Upload your literature sources, select them, and start asking questions to generate insights.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-navy dark:text-slate-100 mb-2">
                Keyboard Shortcuts
              </h3>
              <div className="space-y-1 text-sm text-navy/80 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Close modal</span>
                  <code className="bg-sand/30 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">Esc</code>
                </div>
                <div className="flex justify-between">
                  <span>Toggle theme</span>
                  <code className="bg-sand/30 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">Ctrl + D</code>
                </div>
              </div>
            </div>
          </div>
        </BaseModal>
      );
    }

    return null;
  };

  return renderModal();
}

// Hook for using modals
export function useModal() {
  const { setActiveModal } = useUIStore();

  const openModal = (modalId: string) => {
    setActiveModal(modalId);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const openConfirmation = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
  }) => {
    // This would typically be handled by a confirmation modal state
    // For now, we'll use a simple confirm dialog
    if (window.confirm(`${config.title}\n\n${config.message}`)) {
      config.onConfirm();
    }
  };

  const openAlert = (config: {
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }) => {
    // This would typically be handled by an alert modal state
    // For now, we'll use a simple alert dialog
    window.alert(`${config.title}\n\n${config.message}`);
  };

  return {
    openModal,
    closeModal,
    openConfirmation,
    openAlert
  };
}