'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import {
  QrCode,
  KeyRound,
  CheckCircle2,
  Copy,
  Download,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SbCheckCircle, SbAlert } from '@/components/layout/DashboardIcons';
import { Spinner } from '@/components/ui/Spinner';
import { profileService, TwoFactorSetupResponse } from '@/services/api/profileService';
import { downloadBlob } from '@/lib/download';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

type Step = 'qr' | 'verify' | 'recovery';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const { formatDate } = useFormatters();
  const t = useTranslations('settings.security.twoFactor');
  const [step, setStep] = useState<Step>('qr');
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showManualKey, setShowManualKey] = useState(false);
  const [codesConfirmed, setCodesConfirmed] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const startSetup = useCallback(async () => {
    setLoading(true);
    try {
      const response = await profileService.setup2FA();
      if (response.success && response.data) {
        setSetupData(response.data);
      } else {
        toast.error(response.error || t('setupError'));
        onOpenChange(false);
      }
    } catch {
      toast.error(t('connectionError'));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange, t]);

  // Start setup when dialog opens
  useEffect(() => {
    if (open) {
      setStep('qr');
      setSetupData(null);
      setVerifyCode('');
      setRecoveryCodes([]);
      setShowManualKey(false);
      setCodesConfirmed(false);
      startSetup();
    }
  }, [open, startSetup]);

  // Auto-focus code input when entering verify step
  useEffect(() => {
    if (step === 'verify' && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const handleVerify = async () => {
    const cleanCode = verifyCode.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error(t('codeRequired'));
      return;
    }

    setVerifying(true);
    try {
      const response = await profileService.enable2FA(cleanCode);
      if (response.success && response.data) {
        setRecoveryCodes(response.data.recoveryCodes);
        setStep('recovery');
        toast.success(t('activatedSuccess'));
      } else {
        toast.error(response.error || t('invalidCodeMessage'));
        setVerifyCode('');
        codeInputRef.current?.focus();
      }
    } catch {
      toast.error(t('verifyError'));
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyManualKey = () => {
    if (setupData?.manualKey) {
      navigator.clipboard.writeText(setupData.manualKey.replace(/\s/g, ''));
      toast.success(t('keyCopied'));
    }
  };

  const handleCopyRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    toast.success(t('recoveryCopied'));
  };

  const handleDownloadRecoveryCodes = () => {
    const text = [
      t('downloadFileHeader'),
      t('downloadFileGenerated', { date: formatDate(new Date()) }),
      '',
      t('downloadFileSaveHint'),
      t('downloadFileSingleUseHint'),
      '',
      ...recoveryCodes.map((code, i) => `${(i + 1).toString().padStart(2, '0')}. ${code}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    downloadBlob(blob, 'handysuites-recovery-codes.txt');
    toast.success(t('recoveryDownloaded'));
  };

  const handleFinish = () => {
    onOpenChange(false);
    onComplete();
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verifyCode.replace(/\s/g, '').length === 6) {
      handleVerify();
    }
  };

  // Prevent closing during recovery step (user must confirm they saved codes)
  const handleOpenChange = (value: boolean) => {
    if (!value && step === 'recovery' && !codesConfirmed) {
      return; // Block closing until codes are confirmed
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {(['qr', 'verify', 'recovery'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : (['qr', 'verify', 'recovery'].indexOf(step) > i)
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {(['qr', 'verify', 'recovery'].indexOf(step) > i) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: QR Code */}
        {step === 'qr' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t('qrTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('qrDescription')}
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Spinner size="lg" className="text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">{t('generatingQr')}</p>
              </div>
            ) : setupData ? (
              <div className="space-y-4">
                {/* QR Code Image */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg border">
                    <img
                      src={`data:image/png;base64,${setupData.qrCodeBase64}`}
                      alt={t('qrAlt')}
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Manual key toggle */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showManualKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showManualKey ? t('hideManualKey') : t('showManualKey')}
                  </button>

                  {showManualKey && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-sm font-mono tracking-wider break-all">
                        {setupData.manualKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyManualKey}
                        title={t('copyKey')}
                        aria-label={t('copyKey')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={() => setStep('verify')}
                disabled={!setupData}
              >
                {t('next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                {t('verifyTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('verifyDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex justify-center">
                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t('codePlaceholder')}
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerifyCode(val);
                  }}
                  onKeyDown={handleCodeKeyDown}
                  className="text-center text-2xl tracking-[0.5em] font-mono w-48 h-14"
                  disabled={verifying}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t('codeRotationHint')}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('qr')}>
                {t('back')}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifyCode.replace(/\s/g, '').length !== 6 || verifying}
                loading={verifying}
              >
                {t('verifyButton')}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Recovery Codes */}
        {step === 'recovery' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SbCheckCircle size={20} />
                {t('recoveryTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('recoveryDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
                <SbAlert size={16} className="mt-0.5 flex-shrink-0" />
                <span>{t('recoveryWarning')}</span>
              </div>

              {/* Recovery codes grid */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                {recoveryCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1">
                    {code}
                  </code>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyRecoveryCodes}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {t('copyButton')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownloadRecoveryCodes}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadButton')}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => { setCodesConfirmed(true); handleFinish(); }}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('savedCodes')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
