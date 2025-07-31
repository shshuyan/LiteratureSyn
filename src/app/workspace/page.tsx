'use client';

import { useEffect } from 'react';
import { PanelRightOpen, PanelRightClose, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

import { SourcesRail } from '@/components/SourcesRail';
import { ChatPanel } from '@/components/ChatPanel';
import { InsightPanel } from '@/components/InsightPanel';
import { SlideOverManager } from '@/components/SlideOver';
import { SampleDataInitializer } from '@/components/SampleDataInitializer';
import { BottomSheet, useBottomSheet } from '@/components/BottomSheet';
import { useResponsive } from '@/lib/hooks/useResponsive';
import { useTouchButton } from '@/lib/hooks/useTouchFriendly';
import { useUIStore } from '@/lib/store';

export default function WorkspacePage() {
  const { ui, toggleInsightPanel } = useUIStore();
  const { mobile, tablet, desktop } = useResponsive();
  const bottomSheet = useBottomSheet(false);
  
  // Touch-friendly button handlers
  const tabletToggleButton = useTouchButton(toggleInsightPanel, { enableHapticFeedback: true });
  const mobileToggleButton = useTouchButton(bottomSheet.toggle, { enableHapticFeedback: true });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close bottom sheet or collapse insight panel
      if (e.key === 'Escape') {
        if (mobile && bottomSheet.isOpen) {
          bottomSheet.close();
        } else if (tablet && ui.insightPanelCollapsed === false) {
          toggleInsightPanel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobile, tablet, bottomSheet.isOpen, ui.insightPanelCollapsed, toggleInsightPanel, bottomSheet]);

  // Close bottom sheet when switching to tablet/desktop
  useEffect(() => {
    if (!mobile && bottomSheet.isOpen) {
      bottomSheet.close();
    }
  }, [mobile, bottomSheet]);

  return (
    <>
      <SampleDataInitializer />
      <div className={`h-full grid gap-0 ${
        mobile 
          ? 'grid-cols-1 grid-rows-[auto_1fr]' 
          : tablet && !ui.insightPanelCollapsed
            ? 'grid-cols-[minmax(280px,1fr)_2fr_minmax(320px,1fr)] grid-rows-1'
            : tablet
              ? 'grid-cols-[minmax(280px,1fr)_2fr] grid-rows-1'
              : 'grid-cols-[minmax(280px,1fr)_2.2fr_minmax(320px,1fr)] grid-rows-1'
      }`} style={{
        gridTemplateAreas: mobile 
          ? '"sources" "chat"'
          : tablet && !ui.insightPanelCollapsed
            ? '"sources chat insights"'
            : tablet
              ? '"sources chat"'
              : '"sources chat insights"'
      }}>
        {/* Sources Rail */}
        <div className="overflow-y-auto border-r border-border" style={{ gridArea: 'sources' }}>
          <SourcesRail />
        </div>

        {/* Chat Panel */}
        <div className="overflow-y-auto" style={{ gridArea: 'chat' }}>
          <ChatPanel />
        </div>
        
        {/* Insight Panel - Desktop and Tablet when expanded */}
        {desktop && (
          <div className="overflow-y-auto border-l border-border" style={{ gridArea: 'insights' }}>
            <InsightPanel />
          </div>
        )}
        
        {tablet && !ui.insightPanelCollapsed && (
          <motion.div 
            className="overflow-y-auto border-l border-border"
            style={{ gridArea: 'insights' }}
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <InsightPanel />
          </motion.div>
        )}
      </div>

      {/* Panel Toggle Button for Tablet */}
      {tablet && (
        <motion.button
          {...tabletToggleButton.buttonProps}
          className={`fixed right-4 top-1/2 -translate-y-1/2 z-30 bg-card border border-border rounded-full p-3 shadow-lg transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2 ${tabletToggleButton.buttonProps.className}`}
          aria-label={ui.insightPanelCollapsed ? 'Show insights panel' : 'Hide insights panel'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: ui.insightPanelCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            {ui.insightPanelCollapsed ? (
              <PanelRightOpen className="w-5 h-5 text-card-foreground" />
            ) : (
              <PanelRightClose className="w-5 h-5 text-card-foreground" />
            )}
          </motion.div>
        </motion.button>
      )}

      {/* Mobile Bottom Sheet Toggle */}
      {mobile && (
        <motion.button
          {...mobileToggleButton.buttonProps}
          className={`fixed bottom-6 right-6 bg-card border border-border rounded-full p-4 shadow-lg z-40 ${mobileToggleButton.buttonProps.className}`}
          style={{ 
            paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`,
            ...mobileToggleButton.buttonProps.style
          }}
          aria-label={bottomSheet.isOpen ? "Close insights" : "Open insights"}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ 
            boxShadow: bottomSheet.isOpen 
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <motion.div
            animate={{ rotate: bottomSheet.isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="w-6 h-6 text-card-foreground" />
          </motion.div>
        </motion.button>
      )}

      {/* Bottom Sheet for Mobile */}
      {mobile && (
        <BottomSheet
          isOpen={bottomSheet.isOpen}
          onClose={bottomSheet.close}
          title="Insights"
          maxHeight="75vh"
        >
          <InsightPanel />
        </BottomSheet>
      )}

      {/* Slide-over Detail Panels */}
      <SlideOverManager />
    </>
  );
}