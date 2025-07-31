'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, FileText, Info, Calendar, User, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Chart, generateSampleChartData } from './ui/chart';
import { useUIStore, useArtefactsStore } from '@/lib/store';

type TabType = 'summary' | 'graphs' | 'metadata';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  artefactId: string;
}

export function SlideOver({ isOpen, onClose, artefactId }: SlideOverProps) {
  const { artefacts } = useArtefactsStore();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstTabRef = useRef<HTMLButtonElement>(null);
  
  // Extract artefact type from ID
  const artefactType = artefactId.replace('artefact-detail-', '') as 'moa' | 'safety' | 'kol';
  const artefact = artefacts[artefactType];

  // Handle escape key and focus management
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isOpen) {
        // Basic tab trapping - focus management for accessibility
        const focusableElements = document.querySelectorAll(
          '[data-slide-over] button:not([disabled]), [data-slide-over] [tabindex]:not([tabindex="-1"])'
        );
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
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('summary');
    }
  }, [isOpen]);

  if (!artefact) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          />

          {/* Slide-over panel */}
          <motion.div
            data-slide-over
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slide-over-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sand-200 dark:border-slate-700">
              <h2 id="slide-over-title" className="text-lg font-semibold text-navy dark:text-slate-100">
                {artefact.title}
              </h2>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-peach/10 dark:hover:bg-peach/20 focus-ring"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-sand-200 dark:border-slate-700" role="tablist">
              <button
                ref={firstTabRef}
                role="tab"
                aria-selected={activeTab === 'summary'}
                aria-controls="summary-panel"
                onClick={() => setActiveTab('summary')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 focus-ring ${
                  activeTab === 'summary'
                    ? 'text-navy dark:text-slate-100 border-b-2 border-peach bg-peach/5 dark:bg-peach/10'
                    : 'text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-100 hover:bg-sand/30 dark:hover:bg-slate-700/50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Summary
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'graphs'}
                aria-controls="graphs-panel"
                onClick={() => setActiveTab('graphs')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 focus-ring ${
                  activeTab === 'graphs'
                    ? 'text-navy dark:text-slate-100 border-b-2 border-peach bg-peach/5 dark:bg-peach/10'
                    : 'text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-100 hover:bg-sand/30 dark:hover:bg-slate-700/50'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Graphs
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'metadata'}
                aria-controls="metadata-panel"
                onClick={() => setActiveTab('metadata')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 focus-ring ${
                  activeTab === 'metadata'
                    ? 'text-navy dark:text-slate-100 border-b-2 border-peach bg-peach/5 dark:bg-peach/10'
                    : 'text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-slate-100 hover:bg-sand/30 dark:hover:bg-slate-700/50'
                }`}
              >
                <Info className="h-4 w-4 inline mr-2" />
                Metadata
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                  <motion.div
                    key="summary"
                    id="summary-panel"
                    role="tabpanel"
                    aria-labelledby="summary-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {artefact.bullets.length > 0 ? (
                      <>
                        <div>
                          <h3 className="font-medium text-navy dark:text-slate-100 mb-3">
                            Key Insights
                          </h3>
                          <ul className="space-y-3">
                            {artefact.bullets.map((bullet, index) => (
                              <motion.li
                                key={index}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-start gap-3 text-sm text-navy/80 dark:text-slate-300"
                              >
                                <span className="w-2 h-2 bg-peach rounded-full mt-2 flex-shrink-0" />
                                <span className="leading-relaxed">{bullet}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        {/* Additional details based on artefact type */}
                        <div className="pt-4 border-t border-sand-200 dark:border-slate-700">
                          <h3 className="font-medium text-navy dark:text-slate-100 mb-3">
                            {artefactType === 'moa' && 'Mechanism Details'}
                            {artefactType === 'safety' && 'Safety Profile'}
                            {artefactType === 'kol' && 'Sentiment Analysis'}
                          </h3>
                          <div className="prose prose-sm max-w-none text-navy/70 dark:text-slate-400">
                            <p className="leading-relaxed">
                              {artefactType === 'moa' && 'Detailed mechanism of action analysis based on the selected literature sources. This includes pathway interactions, molecular targets, and therapeutic implications.'}
                              {artefactType === 'safety' && 'Comprehensive safety assessment derived from clinical and preclinical data. Includes adverse events, contraindications, and risk-benefit analysis.'}
                              {artefactType === 'kol' && 'Key opinion leader sentiment and perspective analysis from the literature. Captures expert opinions, consensus views, and emerging perspectives.'}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-sand/50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-6 w-6 text-navy/40 dark:text-slate-500" />
                        </div>
                        <p className="text-navy/60 dark:text-slate-400 text-sm">
                          No content available yet. Generate insights to see detailed analysis.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Graphs Tab */}
                {activeTab === 'graphs' && (
                  <motion.div
                    key="graphs"
                    id="graphs-panel"
                    role="tabpanel"
                    aria-labelledby="graphs-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {artefact.bullets.length > 0 ? (
                      <>
                        <div>
                          <h3 className="font-medium text-navy dark:text-slate-100 mb-4">
                            Visual Analysis
                          </h3>
                          
                          <div className="space-y-4">
                            {/* Trend Chart */}
                            <Chart
                              type="line"
                              title={
                                artefactType === 'moa' ? 'Pathway Activity Trends' :
                                artefactType === 'safety' ? 'Safety Event Frequency' :
                                'Sentiment Trends Over Time'
                              }
                              data={[
                                { label: 'Q1', value: Math.floor(Math.random() * 100) + 20 },
                                { label: 'Q2', value: Math.floor(Math.random() * 100) + 30 },
                                { label: 'Q3', value: Math.floor(Math.random() * 100) + 25 },
                                { label: 'Q4', value: Math.floor(Math.random() * 100) + 40 },
                              ]}
                            />

                            {/* Distribution Chart */}
                            <Chart
                              type="bar"
                              title={
                                artefactType === 'moa' ? 'Target Distribution' :
                                artefactType === 'safety' ? 'Event Severity Distribution' :
                                'Opinion Distribution'
                              }
                              data={generateSampleChartData(artefactType)}
                            />

                            {/* Pie Chart for additional insights */}
                            <Chart
                              type="pie"
                              title={
                                artefactType === 'moa' ? 'Mechanism Categories' :
                                artefactType === 'safety' ? 'Risk Categories' :
                                'Sentiment Categories'
                              }
                              data={generateSampleChartData(artefactType).slice(0, 3)}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-sand/50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="h-6 w-6 text-navy/40 dark:text-slate-500" />
                        </div>
                        <p className="text-navy/60 dark:text-slate-400 text-sm">
                          No data available for visualization. Generate insights first.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Metadata Tab */}
                {activeTab === 'metadata' && (
                  <motion.div
                    key="metadata"
                    id="metadata-panel"
                    role="tabpanel"
                    aria-labelledby="metadata-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    <div>
                      <h3 className="font-medium text-navy dark:text-slate-100 mb-4">
                        Generation Details
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Generation Info */}
                        <div className="bg-sand/20 dark:bg-slate-700/30 rounded-lg p-4">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-peach flex-shrink-0" />
                              <div>
                                <p className="text-xs text-navy/60 dark:text-slate-400">Generated</p>
                                <p className="text-sm text-navy dark:text-slate-100">
                                  {artefact.lastGenerated?.toLocaleString() || 'Not generated'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-peach flex-shrink-0" />
                              <div>
                                <p className="text-xs text-navy/60 dark:text-slate-400">Type</p>
                                <p className="text-sm text-navy dark:text-slate-100 capitalize">
                                  {artefact.type} Analysis
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Tag className="h-4 w-4 text-peach flex-shrink-0" />
                              <div>
                                <p className="text-xs text-navy/60 dark:text-slate-400">Status</p>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    artefact.status === 'ready' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      : artefact.status === 'generating'
                                      ? 'bg-peach/20 text-navy dark:bg-peach/10 dark:text-peach'
                                      : 'bg-sand/50 text-navy/60 dark:bg-slate-700 dark:text-slate-400'
                                  }
                                >
                                  {artefact.status === 'ready' ? 'Ready' : 
                                   artefact.status === 'generating' ? 'Generating...' : 'Idle'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Source Information */}
                        {artefact.metadata && Object.keys(artefact.metadata).length > 0 && (
                          <div className="bg-sand/20 dark:bg-slate-700/30 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-navy dark:text-slate-100 mb-3">
                              Source Information
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(artefact.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span className="text-xs text-navy/60 dark:text-slate-400 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <span className="text-xs text-navy dark:text-slate-100">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Statistics */}
                        <div className="bg-sand/20 dark:bg-slate-700/30 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-navy dark:text-slate-100 mb-3">
                            Content Statistics
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-navy/60 dark:text-slate-400">Insights</p>
                              <p className="text-lg font-semibold text-navy dark:text-slate-100">
                                {artefact.bullets.length}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-navy/60 dark:text-slate-400">Word Count</p>
                              <p className="text-lg font-semibold text-navy dark:text-slate-100">
                                {artefact.bullets.join(' ').split(' ').length}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {artefact.lastGenerated && (
              <div className="p-4 border-t border-sand-200 dark:border-slate-700 bg-sand/20 dark:bg-slate-700/30">
                <p className="text-xs text-navy/60 dark:text-slate-400">
                  Generated: {artefact.lastGenerated.toLocaleString()}
                </p>
                {artefact.metadata && Object.keys(artefact.metadata).length > 0 && (
                  <p className="text-xs text-navy/60 dark:text-slate-400 mt-1">
                    Based on {Object.keys(artefact.metadata).length} source(s)
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Modal manager component to handle slide-over state
export function SlideOverManager() {
  const { ui, setActiveModal } = useUIStore();
  
  const handleClose = () => {
    setActiveModal(null);
  };

  // Check if active modal is an artefact detail modal
  const isArtefactModal = ui.activeModal?.startsWith('artefact-detail-');
  
  if (!isArtefactModal || !ui.activeModal) return null;

  return (
    <SlideOver
      isOpen={true}
      onClose={handleClose}
      artefactId={ui.activeModal}
    />
  );
}