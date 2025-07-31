'use client';

import React, { useEffect } from 'react';
import { SourcesRail } from './SourcesRail';
import { useSourcesStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function SourcesRailDemo() {
  const { sources, addSource, updateSource } = useSourcesStore();

  // Add sample data on mount
  useEffect(() => {
    if (sources.length === 0) {
      // Add sample sources
      const sampleSources = [
        {
          title: "Machine Learning in Healthcare: A Comprehensive Review",
          status: 'ready' as const,
          progress: 100,
          selected: false,
          tags: ['healthcare', 'machine-learning', 'review'],
        },
        {
          title: "Deep Learning Applications in Medical Imaging",
          status: 'embedding' as const,
          progress: 65,
          selected: false,
          tags: ['deep-learning', 'medical-imaging', 'AI'],
        },
        {
          title: "Natural Language Processing for Clinical Notes",
          status: 'ready' as const,
          progress: 100,
          selected: false,
          tags: ['NLP', 'clinical', 'healthcare'],
        },
        {
          title: "Ethical Considerations in AI-Driven Healthcare",
          status: 'error' as const,
          progress: 0,
          selected: false,
          tags: ['ethics', 'AI', 'healthcare'],
          errorMessage: 'Failed to process document. Please try again.',
        },
        {
          title: "Federated Learning for Medical Data Privacy",
          status: 'idle' as const,
          progress: 0,
          selected: false,
          tags: ['federated-learning', 'privacy', 'medical-data'],
        },
        {
          title: "Computer Vision in Radiology: Current State and Future Prospects",
          status: 'ready' as const,
          progress: 100,
          selected: false,
          tags: ['computer-vision', 'radiology', 'medical-imaging'],
        },
      ];

      sampleSources.forEach(source => addSource(source));
    }
  }, [sources.length, addSource]);

  // Simulate progress updates for embedding sources
  useEffect(() => {
    const interval = setInterval(() => {
      sources.forEach(source => {
        if (source.status === 'embedding' && source.progress < 100) {
          const newProgress = Math.min(source.progress + Math.random() * 10, 100);
          updateSource(source.id, { 
            progress: newProgress,
            status: newProgress >= 100 ? 'ready' : 'embedding'
          });
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [sources, updateSource]);

  const addNewSource = () => {
    const titles = [
      "Transformer Models in Biomedical Text Analysis",
      "Reinforcement Learning for Drug Discovery",
      "Blockchain Applications in Healthcare Data Management",
      "Quantum Computing Potential in Medical Research",
      "IoT Devices in Patient Monitoring Systems",
    ];
    
    const tags = [
      ['transformers', 'biomedical', 'NLP'],
      ['reinforcement-learning', 'drug-discovery', 'AI'],
      ['blockchain', 'healthcare', 'data-management'],
      ['quantum-computing', 'medical-research'],
      ['IoT', 'patient-monitoring', 'healthcare'],
    ];

    const randomIndex = Math.floor(Math.random() * titles.length);
    
    addSource({
      title: titles[randomIndex],
      status: Math.random() > 0.7 ? 'embedding' : 'ready',
      progress: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 100,
      selected: false,
      tags: tags[randomIndex],
    });
  };

  return (
    <div className="h-screen flex">
      <div className="w-80 border-r border-border">
        <SourcesRail />
      </div>
      <div className="flex-1 p-8">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-4">SourcesRail Demo</h1>
          <p className="text-muted-foreground mb-6">
            This demo shows the SourcesRail component with sample data. You can:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mb-6 space-y-1">
            <li>Search sources by title</li>
            <li>Filter by tags using the filter button</li>
            <li>Select/deselect sources with checkboxes</li>
            <li>See progress bars for embedding sources</li>
            <li>View error states and status indicators</li>
          </ul>
          <Button onClick={addNewSource} className="mb-4">
            Add Random Source
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>Total sources: {sources.length}</p>
            <p>Ready: {sources.filter(s => s.status === 'ready').length}</p>
            <p>Processing: {sources.filter(s => s.status === 'embedding').length}</p>
            <p>Errors: {sources.filter(s => s.status === 'error').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}