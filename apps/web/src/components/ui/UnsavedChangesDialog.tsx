'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { SbAlert } from '@/components/layout/DashboardIcons';
import { useTranslations } from 'next-intl';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onContinue: () => void;
  onCancel: () => void;
  onSave?: () => void;
  showSaveOption?: boolean;
  isLoading?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  title,
  description,
  onContinue,
  onCancel,
  onSave,
  showSaveOption = false,
  isLoading = false,
}: UnsavedChangesDialogProps) {
  const tc = useTranslations('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full max-w-[95vw] mx-4">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <SbAlert size={20} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left break-words">{title ?? tc('discardChangesTitle')}</DialogTitle>
              <DialogDescription className="mt-1.5 text-left break-words whitespace-normal">
                {description ?? tc('discardChangesDesc')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {tc('stayHere')}
          </Button>
          
          <Button
            variant="destructive"
            onClick={onContinue}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {tc('discardChanges')}
          </Button>
          
          {showSaveOption && onSave && (
            <Button
              onClick={onSave}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? tc('saving') : tc('saveAndContinue')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UnsavedChangesDialog;