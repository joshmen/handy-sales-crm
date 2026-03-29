'use client';

import React, { useEffect, useState } from 'react';
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
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = isSuperAdmin || isAdmin;
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  useEffect(() => {
    notificationSettingsService.get()
      .then((data) => { setSettings(data); setOriginal(data); })
      .catch(() => toast({ title: 'Error', description: 'No se pudo cargar la configuracion', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationSettingsService.save(settings);
      setOriginal(settings);
      toast({ title: 'Guardado', description: 'Configuracion de notificaciones actualizada' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
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
            Control Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleRow
            label="Push Notifications"
            description="Habilitar/deshabilitar todas las notificaciones push al movil"
            checked={settings.pushEnabled}
            onChange={(v) => update('pushEnabled', v)}
            disabled={loading || !canEdit}
            icon={<Bell className="h-4 w-4 text-blue-500" />}
          />
          <Separator />
          <ToggleRow
            label="Notificaciones por Email"
            description="Habilitar/deshabilitar todos los correos automaticos"
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
            Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label="Pedido confirmado" description="Cuando un pedido se confirma" checked={settings.orderConfirmed} onChange={(v) => update('orderConfirmed', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Pedido en ruta" description="Cuando un pedido sale a entrega" checked={settings.orderEnRoute} onChange={(v) => update('orderEnRoute', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Pedido entregado" description="Cuando un pedido se entrega al cliente" checked={settings.orderDelivered} onChange={(v) => update('orderDelivered', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Pedido cancelado" description="Cuando un pedido se cancela" checked={settings.orderCancelled} onChange={(v) => update('orderCancelled', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Route notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Rutas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label="Ruta asignada" description="Cuando se asigna o actualiza una ruta a un vendedor" checked={settings.routeAssigned} onChange={(v) => update('routeAssigned', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Inventory notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label="Stock bajo" description="Cuando un producto baja del minimo" checked={settings.stockLow} onChange={(v) => update('stockLow', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Alerta stock bajo (automatizacion)" description="Revision periodica de productos con stock bajo" checked={settings.stockBajoAlerta} onChange={(v) => update('stockBajoAlerta', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Inventario critico" description="Cuando un producto llega a 0 unidades" checked={settings.inventarioCritico} onChange={(v) => update('inventarioCritico', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Cobranza notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Cobranza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label="Cobro exitoso" description="Cuando se registra un cobro" checked={settings.cobroExitoso} onChange={(v) => update('cobroExitoso', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Cobros vencidos" description="Recordatorio diario de cobros pendientes" checked={settings.cobroVencido} onChange={(v) => update('cobroVencido', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Operations notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Operacion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow label="Meta no cumplida" description="Cuando un vendedor no alcanza su meta" checked={settings.metaNoCumplida} onChange={(v) => update('metaNoCumplida', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Cliente inactivo" description="Clientes sin visitar por varios dias" checked={settings.clienteInactivo} onChange={(v) => update('clienteInactivo', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Bienvenida cliente" description="Aviso cuando se registra un nuevo cliente" checked={settings.bienvenidaCliente} onChange={(v) => update('bienvenidaCliente', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
          <ToggleRow label="Resumen diario" description="Resumen de KPIs al final del dia" checked={settings.resumenDiario} onChange={(v) => update('resumenDiario', v)} disabled={loading || !canEdit || !settings.pushEnabled} />
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving || !hasChanges || !canEdit}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Estas configuraciones aplican a nivel empresa. Cada usuario puede tener preferencias adicionales desde su perfil.
        Los toggles deshabilitados dependen del toggle global de Push.
      </p>
    </div>
  );
};
