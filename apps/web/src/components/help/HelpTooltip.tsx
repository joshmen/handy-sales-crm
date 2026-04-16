'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { tooltips } from '@/data/help-content';

interface HelpTooltipProps {
  tooltipKey: string;
  className?: string;
}

export function HelpTooltip({ tooltipKey, className }: HelpTooltipProps) {
  const t = useTranslations('tooltips');
  const tHelp = useTranslations('helpContent');

  // Resolve tooltip: try dedicated tooltips namespace first, then helpContent namespace
  let text: string | undefined;
  try {
    const translated = t(tooltipKey);
    if (!translated.startsWith('tooltips.')) {
      text = translated;
    }
  } catch {
    // key not in tooltips namespace
  }

  // Fallback: resolve via helpContent namespace using the key stored in help-content.ts
  if (!text) {
    const helpKey = tooltips[tooltipKey];
    if (helpKey) {
      try {
        text = tHelp(helpKey);
      } catch {
        // key not in helpContent namespace either
      }
    }
  }

  if (!text) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground/70 transition-colors focus:outline-none ${className ?? ''}`}
          aria-label={t('moreInfo')}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 text-sm text-foreground/80 leading-relaxed"
        sideOffset={6}
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
