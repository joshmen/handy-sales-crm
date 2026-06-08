'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { SbSecurity, SbAlert } from '@/components/layout/DashboardIcons';
import { profileService } from '@/services/api/profileService';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';

interface TwoFactorDisableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const TwoFactorDisable: React.FC<TwoFactorDisableProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const t = useTranslations('settings.security.twoFactorDisable');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDisable = async () => {
    const cleanCode = code.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error(t('codeRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await profileService.disable2FA(cleanCode);
      if (response.success) {
        toast.success(t('disabledSuccess'));
        onOpenChange(false);
        onComplete();
      } else {
        toast.error(response.error || t('invalidCode'));
        setCode('');
        inputRef.current?.focus();
      }
    } catch {
      toast.error(t('disableError'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.replace(/\s/g, '').length === 6) {
      handleDisable();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SbSecurity size={20} />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
            <SbAlert size={16} className="mt-0.5 flex-shrink-0" />
            <span>{t('securityWarning')}</span>
          </div>

          <div className="flex justify-center">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t('codePlaceholder')}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-[0.5em] font-mono w-48 h-14"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={code.replace(/\s/g, '').length !== 6 || loading}
            loading={loading}
          >
            {t('disableButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
