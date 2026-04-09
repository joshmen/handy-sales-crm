'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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
  const isActivate = action === 'activate';
  const actionVerb = isActivate ? 'Activar' : 'Desactivar';
  const actionVerbLower = isActivate ? 'activar' : 'desactivar';
  const plural = selectedCount > 1 ? 's' : '';

  const defaultConsequence = isActivate
    ? `Los ${entityLabel} activados volverán a aparecer en las listas activas.`
    : `Los ${entityLabel} desactivados no aparecerán en las listas activas.`;

  const consequence = isActivate
    ? (consequenceActivate ?? defaultConsequence)
    : (consequenceDeactivate ?? defaultConsequence);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`¿${actionVerb} ${selectedCount} ${entityLabel}${plural !== 's' ? '' : ''}?`}
    >
      <div className="py-4">
        <p className="text-gray-500">
          ¿Estás seguro de que deseas {actionVerbLower}{' '}
          <strong>{selectedCount}</strong> {entityLabel} seleccionado{plural}?{' '}
          {consequence}
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
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
