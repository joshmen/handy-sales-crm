'use client';

import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useTour } from '@/hooks/useTour';

interface TourButtonProps {
  onStartTour: () => void;
}

export function TourButton({ onStartTour }: TourButtonProps) {
  const { hasTour, isCompleted, tourConfig, startTour } = useTour();

  if (!hasTour || !tourConfig) return null;

  const handleClick = () => {
    onStartTour(); // Close HelpPanel first
    // Wait for panel close animation before starting tour
    setTimeout(() => {
      startTour();
    }, 350);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-green-50 hover:bg-green-100 border-b border-green-100 transition-colors group"
    >
      {isCompleted ? (
        <RotateCcw className="w-4 h-4 text-green-500 group-hover:text-green-600 flex-shrink-0" />
      ) : (
        <Play className="w-4 h-4 text-green-500 group-hover:text-green-600 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-green-700">
          {isCompleted ? 'Repetir tour de esta página' : 'Iniciar tour interactivo'}
        </span>
        <p className="text-xs text-green-600 mt-0.5">
          {tourConfig.description}
        </p>
      </div>
    </button>
  );
}
