'use client';

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';

export interface DrawerHandle {
  requestClose: () => void;
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  isDirty?: boolean;
  onSave?: () => void;
}

const widthClasses = {
  sm: 'max-w-md max-sm:max-w-full',
  md: 'max-w-lg max-sm:max-w-full',
  lg: 'max-w-2xl max-sm:max-w-full',
  xl: 'max-w-3xl max-sm:max-w-full',
};

export const Drawer = forwardRef<DrawerHandle, DrawerProps>(({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  width = 'lg',
  isDirty = false,
  onSave,
}, ref) => {
  const [showUnsaved, setShowUnsaved] = useState(false);

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  useImperativeHandle(ref, () => ({
    requestClose: handleRequestClose,
  }));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleRequestClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
      setShowUnsaved(false);
    }
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 max-sm:top-16 z-50 flex justify-end" data-drawer-root>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={handleRequestClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full flex flex-col bg-white shadow-xl animate-in slide-in-from-right duration-300',
          widthClasses[width]
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              {icon}
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={handleRequestClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-[18px] h-[18px] text-gray-500" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsaved}
        onOpenChange={setShowUnsaved}
        onCancel={() => setShowUnsaved(false)}
        onContinue={() => {
          setShowUnsaved(false);
          onClose();
        }}
        onSave={onSave ? () => {
          setShowUnsaved(false);
          onSave();
        } : undefined}
        showSaveOption={!!onSave}
      />
    </div>
  );
});

Drawer.displayName = 'Drawer';
