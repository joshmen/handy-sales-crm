'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TableLoadingOverlayProps {
  loading: boolean;
  message?: string;
}

export const TableLoadingOverlay: React.FC<TableLoadingOverlayProps> = ({
  loading,
  message,
}) => {
  const tc = useTranslations('common');
  if (!loading) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="text-sm text-muted-foreground">{message || tc('loading')}</span>
      </div>
    </div>
  );
};
