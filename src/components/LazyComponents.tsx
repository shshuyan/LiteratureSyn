'use client';

import { lazy, Suspense } from 'react';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

// Lazy load heavy components
const LazyInsightPanel = lazy(() => import('@/components/InsightPanel').then(module => ({ default: module.InsightPanel })));
const LazySlideOverManager = lazy(() => import('@/components/SlideOver').then(module => ({ default: module.SlideOverManager })));
const LazyBottomSheet = lazy(() => import('@/components/BottomSheet').then(module => ({ default: module.BottomSheet })));

// Wrapper components with loading states
export function LazyInsightPanelWrapper(props: any) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-32">
        <LoadingIndicator size="sm" />
      </div>
    }>
      <LazyInsightPanel {...props} />
    </Suspense>
  );
}

export function LazySlideOverManagerWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <LazySlideOverManager {...props} />
    </Suspense>
  );
}

export function LazyBottomSheetWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyBottomSheet {...props} />
    </Suspense>
  );
}