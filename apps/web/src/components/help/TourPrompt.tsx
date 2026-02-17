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
      // Trigger animation after mount
      requestAnimationFrame(() => setAnimateIn(true));
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasTour, tourConfig, isCompleted]);

  const handleStartTour = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      startTour();
    }, 200);
  };

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 200);
  };

  const handleNeverShow = () => {
    if (tourConfig) {
      const state = getPromptState();
      if (!state.dismissed.includes(tourConfig.id)) {
        state.dismissed.push(tourConfig.id);
        savePromptState(state);
      }
    }
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 200);
  };

  if (!visible || !tourConfig) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:w-[320px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-out ${
        animateIn
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-blue-600 ml-0.5" />
          </div>
          <span className="text-sm font-semibold text-blue-900">Tour disponible</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-blue-100 rounded transition-colors"
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
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5 ml-0.5" />
          Iniciar tour
        </button>
        <button
          type="button"
          onClick={handleDismiss}
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
