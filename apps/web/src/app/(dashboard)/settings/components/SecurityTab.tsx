'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import {
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Save,
  KeyRound,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { profileService, TwoFactorStatus } from '@/services/api/profileService';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { TwoFactorDisable } from '@/components/settings/TwoFactorDisable';
import { toast } from '@/hooks/useToast';

export const SecurityTab: React.FC = () => {
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [tfaStatus, setTfaStatus] = useState<TwoFactorStatus | null>(null);
  const [tfaLoading, setTfaLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const loadTfaStatus = useCallback(async () => {
    setTfaLoading(true);
    try {
      const response = await profileService.get2FAStatus();
      if (response.success && response.data) {
        setTfaStatus(response.data);
      }
    } catch {
      // Silent fail — will show as "no cargado"
    } finally {
      setTfaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTfaStatus();
  }, [loadTfaStatus]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Completa todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await profileService.changePassword('me', { password: newPassword });
      if (response.success) {
        toast.success('Contraseña actualizada exitosamente');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(response.error || 'Error al cambiar contraseña');
      }
    } catch {
      toast.error('Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const cleanCode = regenerateCode.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Ingresa un código de 6 dígitos');
      return;
    }

    setRegenerating(true);
    try {
      const response = await profileService.regenerateRecoveryCodes(cleanCode);
      if (response.success && response.data) {
        const codes = response.data;
        // Copy to clipboard
        navigator.clipboard.writeText(codes.join('\n'));
        toast.success(`${codes.length} códigos nuevos generados y copiados al portapapeles`);
        setRegenerateOpen(false);
        setRegenerateCode('');
        loadTfaStatus();
      } else {
        toast.error(response.error || 'Código inválido');
        setRegenerateCode('');
      }
    } catch {
      toast.error('Error al regenerar códigos');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="current-password"
                type="password"
                placeholder="Ingresa tu contraseña actual"
                className="pl-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="Ingresa tu nueva contraseña"
                className="pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirma tu nueva contraseña"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || changingPassword}
              loading={changingPassword}
            >
              <Save className="mr-2 h-4 w-4" />
              Actualizar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Autenticación de dos factores (2FA)
              </CardTitle>
              <CardDescription className="mt-1">
                Protege tu cuenta con un código de verificación de tu app de autenticación
              </CardDescription>
            </div>
            {tfaStatus && (
              <Badge variant={tfaStatus.enabled ? 'success' : 'secondary'}>
                {tfaStatus.enabled ? 'Activo' : 'Inactivo'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tfaLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando estado de 2FA...</span>
            </div>
          ) : tfaStatus?.enabled ? (
            /* 2FA Enabled State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">2FA está activo</p>
                  <p className="text-sm text-green-700">
                    {tfaStatus.enabledAt && (
                      <>Activado el {new Date(tfaStatus.enabledAt).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Recovery codes info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Códigos de recuperación restantes:{' '}
                    <span className={`font-semibold ${
                      tfaStatus.remainingRecoveryCodes <= 2 ? 'text-destructive' : ''
                    }`}>
                      {tfaStatus.remainingRecoveryCodes}
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRegenerateOpen(true)}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Regenerar
                </Button>
              </div>

              {tfaStatus.remainingRecoveryCodes <= 2 && (
                <p className="text-sm text-destructive">
                  Tienes pocos códigos de recuperación. Te recomendamos regenerarlos.
                </p>
              )}

              <Separator />

              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDisableOpen(true)}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Desactivar 2FA
              </Button>
            </div>
          ) : (
            /* 2FA Disabled State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Shield className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">2FA no está configurado</p>
                  <p className="text-sm text-muted-foreground">
                    Agrega una capa extra de seguridad usando Google Authenticator, Microsoft Authenticator u otra app compatible con TOTP.
                  </p>
                </div>
              </div>

              <Button onClick={() => setSetupOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Configurar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <TwoFactorSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onComplete={loadTfaStatus}
      />

      {/* Disable Dialog */}
      <TwoFactorDisable
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onComplete={loadTfaStatus}
      />

      {/* Regenerate Recovery Codes Dialog */}
      {regenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80" onClick={() => { setRegenerateOpen(false); setRegenerateCode(''); }} />
          <div className="relative bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Regenerar códigos de recuperación
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Los códigos anteriores serán invalidados. Ingresa un código TOTP para confirmar.
              </p>
            </div>

            <div className="flex justify-center">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={regenerateCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setRegenerateCode(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && regenerateCode.replace(/\s/g, '').length === 6) {
                    handleRegenerateRecoveryCodes();
                  }
                }}
                className="text-center text-2xl tracking-[0.5em] font-mono w-48 h-14"
                disabled={regenerating}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRegenerateOpen(false); setRegenerateCode(''); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleRegenerateRecoveryCodes}
                disabled={regenerateCode.replace(/\s/g, '').length !== 6 || regenerating}
                loading={regenerating}
              >
                Regenerar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
