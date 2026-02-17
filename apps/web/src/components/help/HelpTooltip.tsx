'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { tooltips } from '@/data/help-content';

interface HelpTooltipProps {
  tooltipKey: string;
  className?: string;
}

export function HelpTooltip({ tooltipKey, className }: HelpTooltipProps) {
  const text = tooltips[tooltipKey];
  if (!text) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none ${className ?? ''}`}
          aria-label="Más información"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 text-sm text-gray-700 leading-relaxed"
        sideOffset={6}
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
