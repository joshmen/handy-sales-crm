'use client';

import React, { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { useTour } from '@/hooks/useTour';

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

  // Collapsed: small FAB
  if (!expanded) {
    return (
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
          animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
          aria-label="Tour disponible"
        >
          <Play className="w-5 h-5 ml-0.5" />
        </button>
      </div>
    );
  }

  // Expanded: full card
  return (
    <div
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 sm:w-[320px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-green-600 ml-0.5" />
          </div>
          <span className="text-sm font-semibold text-green-900">Tour disponible</span>
        </div>
        <button
          type="button"
          onClick={handleCollapse}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-green-100 rounded transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          {tourConfig.description}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartTour}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5 ml-0.5" />
          Iniciar tour
        </button>
        <button
          type="button"
          onClick={handleCollapse}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Ahora no
        </button>
      </div>

      {/* Don't remind me */}
      <div className="px-4 pb-3 pt-0">
        <button
          type="button"
          onClick={handleNeverShow}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          No volver a mostrar
        </button>
      </div>
    </div>
  );
}
