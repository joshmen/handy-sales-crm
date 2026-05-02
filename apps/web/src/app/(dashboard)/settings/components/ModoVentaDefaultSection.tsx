'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Save, Check, Loader2, ShoppingCart, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslations } from 'next-intl';

type ModoVentaDefault = 'Preventa' | 'VentaDirecta' | 'Preguntar';

const MODOS: { value: ModoVentaDefault; labelKey: string; descriptionKey: string }[] = [
  { value: 'Preventa', labelKey: 'modoPreventa', descriptionKey: 'modoPreventaDesc' },
  { value: 'VentaDirecta', labelKey: 'modoVentaDirecta', descriptionKey: 'modoVentaDirectaDesc' },
  { value: 'Preguntar', labelKey: 'modoPreguntar', descriptionKey: 'modoPreguntarDesc' },
];

/**
 * Modo de venta default que el mobile mostrará al iniciar una venta. Acelera
 * UX al saltar la pantalla de selección Preventa vs VentaDirecta cuando el
 * tenant tiene un modo dominante. "Preguntar" preserva el flow actual.
 */
export const ModoVentaDefaultSection: React.FC = () => {
  const t = useTranslations('settings.salesMode');
  const { settings, updateSettings, isUpdating } = useCompany();

  const [modo, setModo] = useState<ModoVentaDefault>('Preguntar');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const current = (settings.modoVentaDefault as ModoVentaDefault) || 'Preguntar';
    setModo(current);
  }, [settings]);

  const handleSave = async () => {
    const success = await updateSettings({ modoVentaDefault: modo });
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <CardTitle>{t('title')}</CardTitle>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {MODOS.map((m) => {
            const selected = modo === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setModo(m.value)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border transition-colors',
                  selected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-surface-2 border-border hover:bg-surface-3'
                )}
                aria-pressed={selected}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 transition-colors',
                      selected ? 'bg-primary border-primary' : 'bg-transparent border-border'
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px]">{t(m.labelKey)}</p>
                    <p className="text-[12px] text-foreground/70 mt-1">{t(m.descriptionKey)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-blue-900 dark:text-blue-200">{t('hint')}</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('saving')}</>
            ) : saved ? (
              <><Check className="w-4 h-4 mr-2" /> {t('saved')}</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> {t('save')}</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
