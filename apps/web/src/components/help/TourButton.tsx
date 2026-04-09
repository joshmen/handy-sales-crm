'use client';

import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTour } from '@/hooks/useTour';

interface TourButtonProps {
  onStartTour: () => void;
}

export function TourButton({ onStartTour }: TourButtonProps) {
  const t = useTranslations('help.tourPrompt');
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
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-success/10 hover:bg-success/20 border-b border-success/20 transition-colors group"
    >
      {isCompleted ? (
        <RotateCcw className="w-4 h-4 text-success group-hover:text-success/80 flex-shrink-0" />
      ) : (
        <Play className="w-4 h-4 text-success group-hover:text-success/80 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-success">
          {isCompleted ? t('repeatTour') : t('startTour')}
        </span>
        <p className="text-xs text-success/80 mt-0.5">
          {tourConfig.description}
        </p>
      </div>
    </button>
  );
}
