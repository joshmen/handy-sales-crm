'use client';

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
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
  description?: string;
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
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync visibility with isOpen
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setVisible(true);
      // Double rAF: first frame paints translate-x-full, second triggers transition to translate-x-0
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf);
    } else if (visible && !isClosing) {
      // Parent set isOpen=false programmatically (e.g. after save) → animate out
      performClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const performClose = useCallback(() => {
    setIsClosing(true);
    setEntered(false);
    setTimeout(() => {
      setVisible(false);
      setIsClosing(false);
      onClose();
    }, 300); // matches duration-300
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      performClose();
    }
  }, [isDirty, performClose]);

  useImperativeHandle(ref, () => ({
    requestClose: handleRequestClose,
  }));

  useEffect(() => {
    if (visible) {
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
  }, [visible, handleRequestClose]);

  if (!visible || !mounted) return null;

  const drawerContent = (
    <div className="fixed inset-0 max-sm:top-16 z-[100] flex justify-end" data-drawer-root>
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          entered ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleRequestClose}
      />

      {/* Panel */}
      <div
        data-drawer-panel
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full flex flex-col bg-card shadow-xl transition-transform duration-300 ease-out',
          entered ? 'translate-x-0' : 'translate-x-full',
          widthClasses[width]
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between h-16 px-6 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              {icon}
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <button
              onClick={handleRequestClose}
              aria-label="Cerrar"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent hover:bg-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1"
            >
              <X className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="drawer-footer flex-shrink-0 border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)] bg-card px-6 py-4">
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
          performClose();
        }}
        onSave={onSave ? () => {
          setShowUnsaved(false);
          onSave();
        } : undefined}
        showSaveOption={!!onSave}
      />
    </div>
  );

  return createPortal(drawerContent, document.body);
});

Drawer.displayName = 'Drawer';
