'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Bell, ShoppingCart, Package, CreditCard, BarChart3, Save, MapPin } from 'lucide-react';
import { notificationSettingsService, type NotificationSettings } from '@/services/api/notificationSettings';
import { toast } from '@/hooks/useToast';

interface NotificationsTabProps {
  notifications: { email: boolean; push: boolean; sms: boolean; desktop: boolean };
  setNotifications: React.Dispatch<React.SetStateAction<{ email: boolean; push: boolean; sms: boolean; desktop: boolean }>>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true, emailEnabled: true,
  orderConfirmed: true, orderEnRoute: true, orderDelivered: true, orderCancelled: true,
  stockLow: true, inventarioCritico: true,
  routeAssigned: true,
  cobroExitoso: true, cobroVencido: true,
  metaNoCumplida: true, clienteInactivo: true, bienvenidaCliente: true, stockBajoAlerta: true, resumenDiario: true,
  quietHoursStart: null, quietHoursEnd: null,
};

function ToggleRow({ label, description, checked, onChange, disabled, icon }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ isSuperAdmin, isAdmin }) => {
  const t = useTranslations('settings.notifications');
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = isSuperAdmin || isAdmin;
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  useEffect(() => {
    notificationSettingsService.get()
      .then((data) => { setSettings(data); setOriginal(data); })
      .catch(() => toast({ title: t('loadError'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationSettingsService.save(settings);
      setOriginal(settings);
      toast({ title: t('saved') });
    } catch {
      toast({ title: t('saveError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Global toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('globalControl')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleRow
            label={t('pushNotifications')}
            description={t('pushDesc')}
            checked={settings.pushEnabled}
            onChange={(v) => update('pushEnabled', v)}
            disabled={loading || !canEdit}
            icon={<Bell className="h-4 w-4 text-blue-500" />}
          />
          <Separator />
          <ToggleRow
            label={t('emailNotifications')}
            description={t('emailDesc')}
            checked={settings.emailEnabled}
            onChange={(v) => update('emailEnabled', v)}
            disabled={loading || !canEdit}
            icon={<Bell className="h-4 w-4 text-amber-500" />}
          />
        </CardContent>
      </Card>

      {/* Order notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            {t('orders')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label={t('orderConfirmed')} description={t('orderConfirmedDesc')} checked={settings.orderConfirmed} onChange={(v) => update('orderConfirmed', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('orderEnRoute')} description={t('orderEnRouteDesc')} checked={settings.orderEnRoute} onChange={(v) => update('orderEnRoute', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('orderDelivered')} description={t('orderDeliveredDesc')} checked={settings.orderDelivered} onChange={(v) => update('orderDelivered', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('orderCancelled')} description={t('orderCancelledDesc')} checked={settings.orderCancelled} onChange={(v) => update('orderCancelled', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Route notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            {t('routes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label={t('routeAssigned')} description={t('routeAssignedDesc')} checked={settings.routeAssigned} onChange={(v) => update('routeAssigned', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Inventory notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            {t('inventory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label={t('stockLow')} description={t('stockLowDesc')} checked={settings.stockLow} onChange={(v) => update('stockLow', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('stockLowAlert')} description={t('stockLowAlertDesc')} checked={settings.stockBajoAlerta} onChange={(v) => update('stockBajoAlerta', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('criticalInventory')} description={t('criticalInventoryDesc')} checked={settings.inventarioCritico} onChange={(v) => update('inventarioCritico', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Cobranza notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            {t('collections')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label={t('paymentSuccess')} description={t('paymentSuccessDesc')} checked={settings.cobroExitoso} onChange={(v) => update('cobroExitoso', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('paymentOverdue')} description={t('paymentOverdueDesc')} checked={settings.cobroVencido} onChange={(v) => update('cobroVencido', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Operations notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            {t('operations')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label={t('goalNotMet')} description={t('goalNotMetDesc')} checked={settings.metaNoCumplida} onChange={(v) => update('metaNoCumplida', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('inactiveClient')} description={t('inactiveClientDesc')} checked={settings.clienteInactivo} onChange={(v) => update('clienteInactivo', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('welcomeClient')} description={t('welcomeClientDesc')} checked={settings.bienvenidaCliente} onChange={(v) => update('bienvenidaCliente', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label={t('dailySummary')} description={t('dailySummaryDesc')} checked={settings.resumenDiario} onChange={(v) => update('resumenDiario', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving || !hasChanges || !canEdit}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? t('saving') : t('saveConfig')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('footerNote')}
      </p>
    </div>
  );
};
