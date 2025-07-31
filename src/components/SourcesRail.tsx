'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSourcesStore } from '@/lib/store';
import { Source } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SourcesRailProps {
  className?: string;
}

export function SourcesRail({ className }: SourcesRailProps) {
  const {
    sources,
    selectedSourceIds,
    sourceFilters,
    toggleSourceSelection,
    selectAllSources,
    clearSourceSelection,
    setSourceFilters,
    getFilteredSources,
  } = useSourcesStore();

  const [showTagFilter, setShowTagFilter] = useState(false);
  
  const filteredSources = useMemo(() => getFilteredSources(), [sources, sourceFilters]);
  
  // Get all unique tags from sources
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sources.forEach(source => {
      source.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [sources]);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSourceFilters({ search: value });
  };

  // Handle tag filter toggle
  const handleTagToggle = (tag: string) => {
    const currentTags = sourceFilters.tags;
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    setSourceFilters({ tags: newTags });
  };

  // Clear all filters
  const clearFilters = () => {
    setSourceFilters({ search: '', tags: [] });
  };

  // Check if all filtered sources are selected
  const allFilteredSelected = filteredSources.length > 0 && 
    filteredSources.every(source => selectedSourceIds.includes(source.id));

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      // Deselect all filtered sources
      filteredSources.forEach(source => {
        if (selectedSourceIds.includes(source.id)) {
          toggleSourceSelection(source.id);
        }
      });
    } else {
      // Select all filtered sources
      filteredSources.forEach(source => {
        if (!selectedSourceIds.includes(source.id)) {
          toggleSourceSelection(source.id);
        }
      });
    }
  };

  // Get status icon for source
  const getStatusIcon = (source: Source) => {
    switch (source.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'embedding':
        return <Clock className="h-4 w-4 text-peach animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Highlight matching text in source titles
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-peach/30 text-navy rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  const hasActiveFilters = sourceFilters.search || sourceFilters.tags.length > 0;

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Sources</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={cn(
                "h-8 w-8 p-0 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 hover:shadow-peach/20 active:translate-y-0 active:shadow-sm focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2",
                showTagFilter && "bg-accent text-accent-foreground"
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 hover:shadow-peach/20 active:translate-y-0 active:shadow-sm focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={sourceFilters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tag Filter */}
        <AnimatePresence>
          {showTagFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={sourceFilters.tags.includes(tag) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2",
                        sourceFilters.tags.includes(tag) 
                          ? "bg-peach text-navy hover:bg-peach/80 shadow-sm" 
                          : "hover:bg-accent hover:shadow-sm"
                      )}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tags available</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection Controls */}
        {filteredSources.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAllToggle}
                className="data-[state=checked]:bg-peach data-[state=checked]:border-peach"
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredSources.length})
              </span>
            </div>
            {selectedSourceIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSourceSelection}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear ({selectedSourceIds.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredSources.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 text-center"
            >
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasActiveFilters ? 'No matching sources' : 'No sources yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload documents to get started with your analysis'
                }
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="p-2">
              {filteredSources.map((source, index) => (
                <SourceItem
                  key={source.id}
                  source={source}
                  isSelected={selectedSourceIds.includes(source.id)}
                  onToggle={() => toggleSourceSelection(source.id)}
                  searchTerm={sourceFilters.search}
                  index={index}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface SourceItemProps {
  source: Source;
  isSelected: boolean;
  onToggle: () => void;
  searchTerm: string;
  index: number;
}

function SourceItem({ source, isSelected, onToggle, searchTerm, index }: SourceItemProps) {
  const getStatusIcon = (source: Source) => {
    switch (source.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'embedding':
        return <Clock className="h-4 w-4 text-peach animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-peach/30 text-navy rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.05,
        type: "spring",
        stiffness: 120
      }}
      className={cn(
        "group p-3 rounded-lg border transition-all duration-200 mb-2",
        "hover:shadow-sm hover:border-peach/50",
        isSelected 
          ? "bg-accent-bg border-peach shadow-sm" 
          : "bg-card border-border hover:bg-accent/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-0.5 data-[state=checked]:bg-peach data-[state=checked]:border-peach"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(source)}
            <h3 className="font-medium text-sm text-foreground truncate">
              {highlightText(source.title, searchTerm)}
            </h3>
          </div>
          
          {/* Progress bar for embedding status */}
          {source.status === 'embedding' && (
            <div className="mb-2">
              <Progress 
                value={source.progress} 
                className="h-2 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Processing... {source.progress}%
              </p>
            </div>
          )}
          
          {/* Error message */}
          {source.status === 'error' && source.errorMessage && (
            <p className="text-xs text-red-600 mb-2">
              {source.errorMessage}
            </p>
          )}
          
          {/* Tags */}
          {source.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {source.tags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5 h-auto"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Upload date */}
          <p className="text-xs text-muted-foreground">
            {source.uploadDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}