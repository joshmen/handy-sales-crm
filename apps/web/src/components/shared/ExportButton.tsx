'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { exportToCsv, ExportEntity } from '@/services/api/importExport';
import { toast } from '@/hooks/useToast';

interface ExportButtonProps {
  entity: ExportEntity;
  label?: string;
  params?: { desde?: string; hasta?: string };
}

export function ExportButton({ entity, label, params }: ExportButtonProps) {
  const tc = useTranslations('common');
  const resolvedLabel = label || tc('export');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      await exportToCsv(entity, params);
      toast.success(tc('csvDownloaded'));
    } catch (err) {
      console.error('Error exporting:', err);
      toast.error(tc('errorExporting'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5 text-gray-500" />
      )}
      <span className="hidden sm:inline">{resolvedLabel}</span>
    </button>
  );
}
