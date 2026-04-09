'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
import { useSession } from 'next-auth/react';
import { profileService, TwoFactorStatus } from '@/services/api/profileService';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { TwoFactorDisable } from '@/components/settings/TwoFactorDisable';
import { ImpersonationHistoryCard } from '@/components/settings/ImpersonationHistoryCard';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';

export const SecurityTab: React.FC = () => {
  const t = useTranslations('settings.security');
  const tc = useTranslations('common');
  const { formatDate } = useFormatters();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

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
      toast.error(t('fillAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('passwordTooShort'));
      return;
    }

    setChangingPassword(true);
    try {
      const response = await profileService.changePassword({ currentPassword, newPassword });
      if (response.success) {
        toast.success(t('passwordUpdated'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(response.error || t('passwordError'));
      }
    } catch {
      toast.error(t('passwordError'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const cleanCode = regenerateCode.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error(t('enterSixDigits'));
      return;
    }

    setRegenerating(true);
    try {
      const response = await profileService.regenerateRecoveryCodes(cleanCode);
      if (response.success && response.data) {
        const codes = response.data;
        // Copy to clipboard
        navigator.clipboard.writeText(codes.join('\n'));
        toast.success(t('codesRegenerated', { count: codes.length }));
        setRegenerateOpen(false);
        setRegenerateCode('');
        loadTfaStatus();
      } else {
        toast.error(response.error || t('invalidCode'));
        setRegenerateCode('');
      }
    } catch {
      toast.error(t('regenerateError'));
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
            {t('changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('currentPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="current-password"
                type="password"
                placeholder={t('currentPasswordPlaceholder')}
                className="pl-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder={t('newPasswordPlaceholder')}
                className="pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder={t('confirmPasswordPlaceholder')}
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
              {t('updatePassword')}
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
                {t('twoFactorTitle')}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('twoFactorDesc')}
              </CardDescription>
            </div>
            {tfaStatus && (
              <Badge variant={tfaStatus.enabled ? 'success' : 'secondary'}>
                {tfaStatus.enabled ? t('tfaActive') : t('tfaInactive')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tfaLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('loadingTfa')}</span>
            </div>
          ) : tfaStatus?.enabled ? (
            /* 2FA Enabled State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">{t('tfaIsActive')}</p>
                  <p className="text-sm text-green-700">
                    {tfaStatus.enabledAt && (
                      <>{t('tfaActivatedOn', { date: formatDate(tfaStatus.enabledAt, {
                        year: 'numeric', month: 'long', day: 'numeric',
                      }) })}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Recovery codes info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {t('recoveryCodesRemaining')}{' '}
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
                  {t('regenerate')}
                </Button>
              </div>

              {tfaStatus.remainingRecoveryCodes <= 2 && (
                <p className="text-sm text-destructive">
                  {t('fewRecoveryCodes')}
                </p>
              )}

              <Separator />

              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDisableOpen(true)}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                {t('disableTfa')}
              </Button>
            </div>
          ) : (
            /* 2FA Disabled State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Shield className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{t('tfaNotConfigured')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('tfaNotConfiguredDesc')}
                  </p>
                </div>
              </div>

              <Button onClick={() => setSetupOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                {t('configureTfa')}
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

      {/* Impersonation History (Admin only) */}
      {isAdmin && <ImpersonationHistoryCard />}

      {/* Regenerate Recovery Codes Dialog */}
      {regenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80" onClick={() => { setRegenerateOpen(false); setRegenerateCode(''); }} />
          <div className="relative bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                {t('regenerateTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('regenerateDesc')}
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
                {tc('cancel')}
              </Button>
              <Button
                onClick={handleRegenerateRecoveryCodes}
                disabled={regenerateCode.replace(/\s/g, '').length !== 6 || regenerating}
                loading={regenerating}
              >
                {t('regenerateBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
