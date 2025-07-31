'use client';

import { useEffect, useState } from 'react';
import { useSourcesStore, useArtefactsStore, useGlobalStore } from '@/lib/store';
import { useGlobalLoading, useGlobalError } from './GlobalStateProvider';

export function SampleDataInitializer() {
  const { sources, addSource, updateSource } = useSourcesStore();
  const { artefacts, updateArtefact } = useArtefactsStore();
  const { withLoading } = useGlobalLoading();
  const { handleError } = useGlobalError();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize sample data with loading states and error handling
  useEffect(() => {
    if (sources.length === 0 && !hasInitialized) {
      const initializeSampleData = async () => {
        try {
          await withLoading(
            async () => {
              // Simulate loading delay for demonstration
              await new Promise(resolve => setTimeout(resolve, 1500));
              
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
                  status: 'processing' as const,
                  progress: 25,
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

              // Add sources with staggered timing to demonstrate loading states
              for (const source of sampleSources) {
                addSource(source);
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              
              setHasInitialized(true);
            },
            {
              operation: 'Loading sample documents',
              message: 'Initializing literature database...',
            }
          );
        } catch (error) {
          handleError(error, { 
            operation: 'sample_data_initialization',
            component: 'SampleDataInitializer' 
          });
        }
      };

      initializeSampleData();
    }
  }, [sources.length, hasInitialized, addSource, withLoading, handleError]);

  // Add sample artefact data
  useEffect(() => {
    // Check if artefacts need sample data (only if they're still in idle state)
    const needsSampleData = Object.values(artefacts).every(a => a.status === 'idle' && a.bullets.length === 0);
    
    if (needsSampleData) {
      // Add sample MoA data
      updateArtefact('moa', {
        bullets: [
          'Primary mechanism involves inhibition of key enzymatic pathways',
          'Secondary effects on cellular signaling cascades observed',
          'Dose-dependent response relationship established in preclinical studies',
          'Bioavailability enhanced through novel formulation approach'
        ],
        status: 'ready',
        lastGenerated: new Date(),
        metadata: {
          sourceCount: 4,
          confidence: 0.85,
          lastUpdated: new Date().toISOString()
        }
      });

      // Add sample Safety data
      updateArtefact('safety', {
        bullets: [
          'Well-tolerated across all dosage groups in Phase II trials',
          'Most common adverse events: mild headache (12%), nausea (8%)',
          'No serious adverse events related to treatment reported',
          'Favorable drug-drug interaction profile established'
        ],
        status: 'ready',
        lastGenerated: new Date(),
        metadata: {
          sourceCount: 6,
          confidence: 0.92,
          lastUpdated: new Date().toISOString()
        }
      });

      // Add sample KOL data
      updateArtefact('kol', {
        bullets: [
          'Leading experts express cautious optimism about therapeutic potential',
          'Consensus on need for larger Phase III trials before regulatory submission',
          'Positive reception at recent medical conferences and symposiums',
          'Key opinion leaders highlight innovative mechanism of action'
        ],
        status: 'ready',
        lastGenerated: new Date(),
        metadata: {
          sourceCount: 3,
          confidence: 0.78,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  }, [artefacts, updateArtefact]);

  // Simulate progress updates and error scenarios for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      sources.forEach(source => {
        // Handle embedding progress
        if (source.status === 'embedding' && source.progress < 100) {
          const newProgress = Math.min(source.progress + Math.random() * 10, 100);
          updateSource(source.id, { 
            progress: newProgress,
            status: newProgress >= 100 ? 'ready' : 'embedding'
          });
        }
        
        // Handle processing progress
        if (source.status === 'processing' && source.progress < 100) {
          const increment = Math.random() * 15;
          const newProgress = Math.min(source.progress + increment, 100);
          
          // Simulate occasional processing errors for demonstration
          if (Math.random() < 0.05 && source.progress > 50) { // 5% chance of error after 50%
            updateSource(source.id, {
              status: 'error',
              progress: source.progress,
              errorMessage: 'Processing failed due to network timeout. Click retry to continue.'
            });
          } else {
            updateSource(source.id, { 
              progress: newProgress,
              status: newProgress >= 100 ? 'ready' : 'processing'
            });
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [sources, updateSource]);

  // Demonstrate error recovery mechanism
  useEffect(() => {
    const errorRecoveryInterval = setInterval(() => {
      sources.forEach(source => {
        // Simulate automatic retry for some error states after a delay
        if (source.status === 'error' && source.errorMessage?.includes('network timeout')) {
          // Simulate retry after 10 seconds for network errors
          const errorTime = source.uploadDate.getTime();
          const now = Date.now();
          
          if (now - errorTime > 10000) { // 10 seconds
            updateSource(source.id, {
              status: 'processing',
              progress: Math.max(source.progress - 10, 0), // Restart from slightly earlier
              errorMessage: undefined
            });
          }
        }
      });
    }, 5000);

    return () => clearInterval(errorRecoveryInterval);
  }, [sources, updateSource]);

  return null; // This component doesn't render anything
}