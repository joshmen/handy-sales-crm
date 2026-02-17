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
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 border-b border-blue-100 transition-colors group"
    >
      {isCompleted ? (
        <RotateCcw className="w-4 h-4 text-blue-500 group-hover:text-blue-600 flex-shrink-0" />
      ) : (
        <Play className="w-4 h-4 text-blue-500 group-hover:text-blue-600 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-blue-700">
          {isCompleted ? 'Repetir tour de esta página' : 'Iniciar tour interactivo'}
        </span>
        <p className="text-xs text-blue-500 mt-0.5">
          {tourConfig.description}
        </p>
      </div>
    </button>
  );
}
