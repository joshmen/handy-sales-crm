'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  Shield,
  QrCode,
  KeyRound,
  CheckCircle2,
  Copy,
  Download,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { profileService, TwoFactorSetupResponse } from '@/services/api/profileService';
import { toast } from '@/hooks/useToast';

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
        toast.error(response.error || 'Error al generar configuración 2FA');
        onOpenChange(false);
      }
    } catch {
      toast.error('Error de conexión al configurar 2FA');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

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
      toast.error('Ingresa un código de 6 dígitos');
      return;
    }

    setVerifying(true);
    try {
      const response = await profileService.enable2FA(cleanCode);
      if (response.success && response.data) {
        setRecoveryCodes(response.data.recoveryCodes);
        setStep('recovery');
        toast.success('2FA activado exitosamente');
      } else {
        toast.error(response.error || 'Código inválido. Verifica que tu reloj esté sincronizado.');
        setVerifyCode('');
        codeInputRef.current?.focus();
      }
    } catch {
      toast.error('Error al verificar código');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyManualKey = () => {
    if (setupData?.manualKey) {
      navigator.clipboard.writeText(setupData.manualKey.replace(/\s/g, ''));
      toast.success('Clave copiada al portapapeles');
    }
  };

  const handleCopyRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Códigos de recuperación copiados');
  };

  const handleDownloadRecoveryCodes = () => {
    const text = [
      'HandySales - Códigos de Recuperación 2FA',
      `Generados: ${new Date().toLocaleString('es-MX')}`,
      '',
      'Guarda estos códigos en un lugar seguro.',
      'Cada código solo puede usarse una vez.',
      '',
      ...recoveryCodes.map((code, i) => `${(i + 1).toString().padStart(2, '0')}. ${code}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'handysales-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Códigos descargados');
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
                      ? 'bg-green-100 text-green-700'
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
                Escanea el código QR
              </DialogTitle>
              <DialogDescription>
                Abre tu app de autenticación (Google Authenticator, Microsoft Authenticator, etc.) y escanea el código QR.
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Generando código QR...</p>
              </div>
            ) : setupData ? (
              <div className="space-y-4">
                {/* QR Code Image */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg border">
                    <img
                      src={`data:image/png;base64,${setupData.qrCodeBase64}`}
                      alt="Código QR para 2FA"
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
                    {showManualKey ? 'Ocultar clave manual' : 'No puedes escanear? Ingresa la clave manualmente'}
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
                        title="Copiar clave"
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
                Cancelar
              </Button>
              <Button
                onClick={() => setStep('verify')}
                disabled={!setupData}
              >
                Siguiente
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
                Verifica el código
              </DialogTitle>
              <DialogDescription>
                Ingresa el código de 6 dígitos que muestra tu app de autenticación para confirmar la configuración.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex justify-center">
                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
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
                El código cambia cada 30 segundos
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('qr')}>
                Volver
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifyCode.replace(/\s/g, '').length !== 6 || verifying}
                loading={verifying}
              >
                Verificar y activar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Recovery Codes */}
        {step === 'recovery' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                2FA activado exitosamente
              </DialogTitle>
              <DialogDescription>
                Guarda estos códigos de recuperación en un lugar seguro. Si pierdes acceso a tu app de autenticación, puedes usar uno de estos códigos para iniciar sesión.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Cada código solo puede usarse una vez. No podrás ver estos códigos de nuevo.</span>
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
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownloadRecoveryCodes}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar .txt
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => { setCodesConfirmed(true); handleFinish(); }}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                He guardado mis códigos
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
