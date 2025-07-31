'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArtefactCard } from './ArtefactCard';
import { useArtefactsStore, useUIStore } from '@/lib/store';

interface InsightPanelProps {
  className?: string;
}

export function InsightPanel({ className = '' }: InsightPanelProps) {
  const { artefacts } = useArtefactsStore();

  // Fixed order of cards
  const cardOrder: Array<'moa' | 'safety' | 'kol'> = ['moa', 'safety', 'kol'];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 20
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`h-full flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-sand-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy dark:text-slate-100">
            Insights
          </h2>
          <div className="flex items-center gap-2">
            {/* Status indicator showing how many insights are ready */}
            <div className="flex items-center gap-1">
              {cardOrder.map((type) => (
                <div
                  key={type}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    artefacts[type].status === 'ready'
                      ? 'bg-green-500'
                      : artefacts[type].status === 'generating'
                      ? 'bg-peach animate-pulse'
                      : artefacts[type].status === 'error'
                      ? 'bg-red-500'
                      : 'bg-sand-300 dark:bg-slate-600'
                  }`}
                  title={`${artefacts[type].title}: ${artefacts[type].status}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {cardOrder.map((type) => (
            <motion.div
              key={type}
              variants={cardVariants}
              layout
            >
              <ArtefactCard
                artefact={artefacts[type]}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer with summary info */}
      <div className="p-4 border-t border-sand-200 dark:border-slate-700 bg-sand/20 dark:bg-slate-700/30">
        <div className="flex items-center justify-between text-xs text-navy/60 dark:text-slate-400">
          <span>
            {cardOrder.filter(type => artefacts[type].status === 'ready').length} of {cardOrder.length} insights ready
          </span>
          <span>
            {cardOrder.some(type => artefacts[type].lastGenerated) && (
              <>
                Last updated: {
                  Math.max(
                    ...cardOrder
                      .map(type => artefacts[type].lastGenerated?.getTime() || 0)
                      .filter(time => time > 0)
                  ) > 0
                    ? new Date(
                        Math.max(
                          ...cardOrder
                            .map(type => artefacts[type].lastGenerated?.getTime() || 0)
                            .filter(time => time > 0)
                        )
                      ).toLocaleTimeString()
                    : 'Never'
                }
              </>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Responsive wrapper component that handles different screen sizes
export function ResponsiveInsightPanel() {
  const { ui, toggleInsightPanel } = useUIStore();

  return (
    <>
      {/* Desktop and Tablet - Regular panel */}
      <div className="hidden md:flex md:flex-col h-full">
        {/* Tablet collapse button */}
        <div className="md:hidden lg:flex items-center justify-between p-2 border-b border-sand-200 dark:border-slate-700">
          <button
            onClick={toggleInsightPanel}
            className="p-2 hover:bg-sand/30 dark:hover:bg-slate-700 rounded-md transition-colors"
            title={ui.insightPanelCollapsed ? 'Expand insights' : 'Collapse insights'}
          >
            <motion.div
              animate={{ rotate: ui.insightPanelCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-4 h-4 text-navy dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.div>
          </button>
        </div>

        {/* Panel content */}
        <motion.div
          animate={{
            width: ui.insightPanelCollapsed ? 0 : 'auto',
            opacity: ui.insightPanelCollapsed ? 0 : 1
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-1 overflow-hidden"
        >
          <InsightPanel />
        </motion.div>
      </div>

      {/* Mobile - Bottom sheet (to be implemented in task 7) */}
      <div className="md:hidden">
        {/* Mobile implementation will be added in responsive behavior task */}
      </div>
    </>
  );
}