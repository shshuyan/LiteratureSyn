'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string): string => {
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-navy dark:text-slate-100 mb-2 mt-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-navy dark:text-slate-100 mb-3 mt-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-navy dark:text-slate-100 mb-4 mt-4">$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-navy dark:text-slate-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-navy/80 dark:text-slate-300">$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-sand/30 dark:bg-slate-700/50 rounded-md p-3 text-sm font-mono text-navy dark:text-slate-200 overflow-x-auto my-3"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-sand/30 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-sm font-mono text-navy dark:text-slate-200">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-peach hover:text-peach/80 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="flex items-start gap-2 text-sm text-navy/80 dark:text-slate-300 mb-1"><span class="w-1.5 h-1.5 bg-peach rounded-full mt-2 flex-shrink-0"></span><span>$1</span></li>')
      .replace(/^- (.*$)/gim, '<li class="flex items-start gap-2 text-sm text-navy/80 dark:text-slate-300 mb-1"><span class="w-1.5 h-1.5 bg-peach rounded-full mt-2 flex-shrink-0"></span><span>$1</span></li>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="text-sm text-navy/80 dark:text-slate-300 leading-relaxed mb-3">')
      .replace(/\n/g, '<br />');
  };

  const htmlContent = parseMarkdown(content);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: `<div class="text-sm text-navy/80 dark:text-slate-300 leading-relaxed">${htmlContent}</div>` 
      }}
    />
  );
}

// Component for rendering markdown content in artefact bullets
export function ArtefactMarkdown({ bullets }: { bullets: string[] }) {
  return (
    <div className="space-y-2">
      {bullets.map((bullet, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-start gap-3"
        >
          <span className="w-2 h-2 bg-peach rounded-full mt-2 flex-shrink-0" />
          <MarkdownPreview 
            content={bullet} 
            className="flex-1"
          />
        </motion.div>
      ))}
    </div>
  );
}