'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';

interface BatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'activate' | 'deactivate';
  selectedCount: number;
  entityLabel: string;
  loading?: boolean;
  consequenceActivate?: string;
  consequenceDeactivate?: string;
}

export const BatchConfirmModal: React.FC<BatchConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedCount,
  entityLabel,
  loading = false,
  consequenceActivate,
  consequenceDeactivate,
}) => {
  const tc = useTranslations('common');
  const isActivate = action === 'activate';
  const actionVerb = isActivate ? tc('activate') : tc('deactivate');
  const consequence = isActivate
    ? (consequenceActivate ?? tc('batchConsequenceActivateDefault', { label: entityLabel }))
    : (consequenceDeactivate ?? tc('batchConsequenceDeactivateDefault', { label: entityLabel }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tc('batchConfirmTitle', { action: actionVerb, count: selectedCount, label: entityLabel })}
    >
      <div className="py-4">
        <p className="text-gray-500">
          {tc('batchConfirmMessage', { action: actionVerb.toLowerCase(), count: selectedCount, label: entityLabel })}{' '}
          {consequence}
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {tc('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
            isActivate ? 'bg-success hover:bg-success/90' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {actionVerb} ({selectedCount})
        </button>
      </div>
    </Modal>
  );
};
