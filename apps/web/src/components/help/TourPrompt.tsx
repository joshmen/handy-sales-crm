'use client';

import React, { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { useTour } from '@/hooks/useTour';
import { useTranslations } from 'next-intl';

const PROMPT_STORAGE_KEY = 'handy-tours-prompt';

interface PromptState {
  /** How many times the prompt has been shown per tour ID */
  visits: Record<string, number>;
  /** Tour IDs the user permanently dismissed */
  dismissed: string[];
}

function getPromptState(): PromptState {
  if (typeof window === 'undefined') return { visits: {}, dismissed: [] };
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { visits: {}, dismissed: [] };
  } catch {
    return { visits: {}, dismissed: [] };
  }
}

function savePromptState(state: PromptState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(state));
}

const MAX_PROMPT_SHOWS = 3;

export function TourPrompt() {
  const t = useTranslations('help.tourPrompt');
  const tc = useTranslations('common');
  const { hasTour, tourConfig, isCompleted, startTour } = useTour();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!hasTour || !tourConfig || isCompleted) {
      setVisible(false);
      return;
    }

    const state = getPromptState();
    const tourId = tourConfig.id;

    // User permanently dismissed this tour's prompt
    if (state.dismissed.includes(tourId)) {
      setVisible(false);
      return;
    }

    const visitCount = state.visits[tourId] || 0;

    // Already shown MAX times
    if (visitCount >= MAX_PROMPT_SHOWS) {
      setVisible(false);
      return;
    }

    // Increment visit count
    state.visits[tourId] = visitCount + 1;
    savePromptState(state);

    // Show after a short delay so the page renders first
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasTour, tourConfig, isCompleted]);

  const handleStartTour = () => {
    setExpanded(false);
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      startTour();
    }, 200);
  };

  const handleCollapse = () => {
    setExpanded(false);
  };

  const handleNeverShow = () => {
    if (tourConfig) {
      const state = getPromptState();
      if (!state.dismissed.includes(tourConfig.id)) {
        state.dismissed.push(tourConfig.id);
        savePromptState(state);
      }
    }
    setExpanded(false);
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 200);
  };

  if (!visible || !tourConfig) return null;

  // Collapsed: small pill FAB
  if (!expanded) {
    return (
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
          animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-success/40 animate-ping opacity-30" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative h-10 px-4 rounded-full bg-success hover:bg-success/90 text-success-foreground shadow-lg hover:shadow-xl flex items-center gap-1.5 transition-all active:scale-95"
          aria-label={t('tourAvailable')}
        >
          <Play className="w-4 h-4 ml-0.5" />
          <span className="text-sm font-medium">Tour</span>
        </button>
      </div>
    );
  }

  // Expanded: full card
  return (
    <div
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 sm:w-[320px] bg-white rounded-xl shadow-xl border border-border-subtle overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-success/10 border-b border-success/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-success ml-0.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">{t('tourAvailable')}</span>
        </div>
        <button
          type="button"
          onClick={handleCollapse}
          className="p-1 text-muted-foreground hover:text-foreground/70 hover:bg-success/10 rounded transition-colors"
          aria-label={tc('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground/70 leading-relaxed">
          {tourConfig.description}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartTour}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5 ml-0.5" />
          {t('startTour')}
        </button>
        <button
          type="button"
          onClick={handleCollapse}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground/80 hover:bg-surface-3 rounded-lg transition-colors"
        >
          {t('notNow')}
        </button>
      </div>

      {/* Don't remind me */}
      <div className="px-4 pb-3 pt-0">
        <button
          type="button"
          onClick={handleNeverShow}
          className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          {t('dontShowAgain')}
        </button>
      </div>
    </div>
  );
}
