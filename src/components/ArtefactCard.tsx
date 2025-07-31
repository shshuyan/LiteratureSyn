'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Artefact } from '@/lib/types';
import { useArtefactsStore, useUIStore } from '@/lib/store';

interface ArtefactCardProps {
  artefact: Artefact;
  onRegenerate?: (id: string) => void;
  onDownload?: (id: string) => void;
  onExpand?: (id: string) => void;
}

export function ArtefactCard({ 
  artefact, 
  onRegenerate, 
  onDownload, 
  onExpand 
}: ArtefactCardProps) {
  const { regenerateArtefact } = useArtefactsStore();
  const { setActiveModal } = useUIStore();

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(artefact.id);
    } else {
      regenerateArtefact(artefact.type);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(artefact.id);
    } else {
      // Default download implementation
      const content = [
        `# ${artefact.title}`,
        '',
        ...artefact.bullets.map(bullet => `• ${bullet}`),
        '',
        `Generated: ${artefact.lastGenerated?.toLocaleString() || 'Not generated'}`
      ].join('\n');
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artefact.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExpand = () => {
    if (onExpand) {
      onExpand(artefact.id);
    } else {
      setActiveModal(`artefact-detail-${artefact.type}`);
    }
  };

  const getStatusColor = (status: Artefact['status']) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'generating':
        return 'bg-peach/20 text-navy dark:bg-peach/10 dark:text-peach';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-sand/50 text-navy/60 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  const getStatusText = (status: Artefact['status']) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'generating':
        return 'Generating...';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="bg-card rounded-lg border border-border shadow-sm card-hover cursor-pointer"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-high-contrast">
              {artefact.title}
            </h3>
            <Badge 
              variant="outline" 
              className={getStatusColor(artefact.status)}
            >
              {artefact.status === 'generating' && (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              )}
              {getStatusText(artefact.status)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={artefact.status === 'generating'}
              className="h-8 w-8 p-0 hover:bg-accent-bg btn-hover-lift focus-ring"
              title="Regenerate"
            >
              <RefreshCw className={`h-4 w-4 ${artefact.status === 'generating' ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={artefact.status !== 'ready' || artefact.bullets.length === 0}
              className="h-8 w-8 p-0 hover:bg-accent-bg btn-hover-lift focus-ring"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="h-8 w-8 p-0 hover:bg-accent-bg btn-hover-lift focus-ring"
              title="Expand details"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {artefact.status === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8 bg-peach/5 dark:bg-peach/10 rounded-md"
            >
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-peach mx-auto mb-2" />
                <p className="text-sm text-medium-contrast">
                  Generating insights...
                </p>
              </div>
            </motion.div>
          )}

          {artefact.status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                {artefact.errorMessage || 'Failed to generate insights'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="text-xs"
              >
                Try Again
              </Button>
            </motion.div>
          )}

          {artefact.status === 'ready' && artefact.bullets.length > 0 && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ul className="space-y-3">
                {artefact.bullets.slice(0, 3).map((bullet, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 text-sm text-medium-contrast"
                  >
                    <span className="w-2 h-2 bg-peach rounded-full mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{bullet}</span>
                  </motion.li>
                ))}
              </ul>
              
              {artefact.bullets.length > 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 pt-3 border-t border-border"
                >
                  <button
                    onClick={handleExpand}
                    className="text-sm text-peach hover:text-peach/80 font-medium flex items-center gap-1 transition-all duration-200 hover:gap-2 focus-ring rounded-md px-2 py-1"
                  >
                    View {artefact.bullets.length - 3} more insights
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {artefact.status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <p className="text-sm text-medium-contrast mb-3">
                No insights generated yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="text-xs"
              >
                Generate Insights
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {artefact.lastGenerated && artefact.status === 'ready' && (
        <div className="px-4 pb-4">
          <p className="text-xs text-low-contrast">
            Generated: {artefact.lastGenerated.toLocaleString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}