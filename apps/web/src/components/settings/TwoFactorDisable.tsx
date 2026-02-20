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
import { ShieldOff, AlertTriangle } from 'lucide-react';
import { profileService } from '@/services/api/profileService';
import { toast } from '@/hooks/useToast';

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
      toast.error('Ingresa un código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await profileService.disable2FA(cleanCode);
      if (response.success) {
        toast.success('2FA desactivado exitosamente');
        onOpenChange(false);
        onComplete();
      } else {
        toast.error(response.error || 'Código inválido');
        setCode('');
        inputRef.current?.focus();
      }
    } catch {
      toast.error('Error al desactivar 2FA');
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
            <ShieldOff className="h-5 w-5 text-destructive" />
            Desactivar 2FA
          </DialogTitle>
          <DialogDescription>
            Ingresa un código de tu app de autenticación para confirmar la desactivación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Tu cuenta será menos segura sin 2FA. Cualquiera con tu contraseña podrá acceder.</span>
          </div>

          <div className="flex justify-center">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
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
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={code.replace(/\s/g, '').length !== 6 || loading}
            loading={loading}
          >
            Desactivar 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
