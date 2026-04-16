'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { helpPages, type HelpArticle } from '@/data/help-content';
import { TourButton } from './TourButton';
import { useTranslations } from 'next-intl';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function ArticleItem({ article, defaultExpanded = false, tHelp }: { article: HelpArticle; defaultExpanded?: boolean; tHelp: (key: string) => string }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface-1 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${expanded ? 'text-foreground' : 'text-foreground/70'}`}>
            {tHelp(article.title)}
          </span>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{tHelp(article.summary)}</p>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-10">
          <p className="text-sm text-foreground/70 leading-relaxed">{tHelp(article.body)}</p>
        </div>
      )}
    </div>
  );
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const t = useTranslations('help.panel');
  const tHelp = useTranslations('helpContent');
  const pathname = usePathname();

  // Find matching help page - try exact match first, then parent paths
  const getHelpPage = useCallback(() => {
    // Remove leading slash for dashboard paths and try exact match
    const normalizedPath = pathname.replace(/^\/(dashboard)?/, '') || '/';

    // Try exact match
    if (helpPages[pathname]) return helpPages[pathname];
    if (helpPages[normalizedPath]) return helpPages[normalizedPath];

    // Try removing trailing segments to find a parent match
    const segments = pathname.split('/').filter(Boolean);
    while (segments.length > 0) {
      const testPath = '/' + segments.join('/');
      if (helpPages[testPath]) return helpPages[testPath];
      segments.pop();
    }

    return null;
  }, [pathname]);

  const helpPage = getHelpPage();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-[100] h-screen w-[360px] max-w-[90vw] bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.08)] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-blue-900">
              {helpPage ? t('helpTitleWithPage', { page: tHelp(helpPage.title) }) : t('helpTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground/80 hover:bg-blue-100 rounded transition-colors"
            aria-label={t('closePanel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-60px)] overflow-y-auto">
          {/* Tour button */}
          <TourButton onStartTour={onClose} />

          {helpPage ? (
            <>
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-xs text-muted-foreground">{tHelp(helpPage.description)}</p>
              </div>
              <div>
                {helpPage.articles.map((article, index) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    defaultExpanded={index < 2}
                    tHelp={tHelp}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/60 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {t('noContentTitle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('noContentHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
