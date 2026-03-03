'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { Driver } from 'driver.js';
import { getTourForPathname } from '@/data/tours';
import { restoreDrawerFromTour, closeDrawerForTour, consumeTourContinuation } from '@/data/tours/types';

const STORAGE_KEY = 'handy-tours-completed';

function getCompletedTours(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markTourCompleted(tourId: string): void {
  if (typeof window === 'undefined') return;
  const completed = getCompletedTours();
  if (!completed.includes(tourId)) {
    completed.push(tourId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

export function isTourCompleted(tourId: string): boolean {
  return getCompletedTours().includes(tourId);
}

let cssLoaded = false;
function ensureDriverCSS() {
  if (cssLoaded || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.css';
  document.head.appendChild(link);
  cssLoaded = true;
}

export function useTour() {
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);

  const tourConfig = getTourForPathname(pathname);

  // Cleanup on unmount or page change
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [pathname]);

  const startTour = useCallback(async () => {
    if (!tourConfig || tourConfig.steps.length === 0) return;

    // Destroy previous instance
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    // Dynamically import driver.js and load CSS
    const { driver } = await import('driver.js');
    ensureDriverCSS();

    const tourId = tourConfig.id;

    const instance = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: false,
      overlayOpacity: 0.55,
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'handy-tour-popover',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: tourConfig.doneBtnText || 'Terminar',
      progressText: '{{current}} de {{total}}',
      onDestroyed: () => {
        if (driverRef.current?.isLastStep()) {
          markTourCompleted(tourId);
        }
        // Cleanup drawer z-index and close any open drawer left by tour
        restoreDrawerFromTour();
        closeDrawerForTour();
        driverRef.current = null;
      },
      steps: tourConfig.steps.map((step) => ({
        ...(step.element ? { element: step.element } : {}),
        ...(step.onHighlighted ? { onHighlighted: step.onHighlighted } : {}),
        ...(step.onDeselected ? { onDeselected: step.onDeselected } : {}),
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side,
          align: step.popover.align,
          ...(step.popover.popoverClass
            ? { popoverClass: `handy-tour-popover ${step.popover.popoverClass}` }
            : {}),
          ...(step.popover.onNextClick
            ? { onNextClick: () => driverRef.current && step.popover.onNextClick!(driverRef.current) }
            : {}),
          ...(step.popover.onPrevClick
            ? { onPrevClick: () => driverRef.current && step.popover.onPrevClick!(driverRef.current) }
            : {}),
        },
      })),
    });

    driverRef.current = instance;

    // Small delay to ensure data-tour elements are rendered
    requestAnimationFrame(() => {
      instance.drive();
    });
  }, [tourConfig]);

  // Auto-start tour if navigated from another tour (cross-page continuation)
  useEffect(() => {
    const continueId = consumeTourContinuation();
    if (continueId && tourConfig?.id === continueId) {
      // Delay to ensure DOM is rendered with data-tour attributes
      const timer = setTimeout(() => startTour(), 600);
      return () => clearTimeout(timer);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  return {
    startTour,
    stopTour,
    tourConfig,
    hasTour: !!tourConfig,
    isCompleted: tourConfig ? isTourCompleted(tourConfig.id) : false,
  };
}
