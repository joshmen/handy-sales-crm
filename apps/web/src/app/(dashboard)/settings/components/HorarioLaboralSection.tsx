'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Save, Check, Loader2, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslations } from 'next-intl';

const DAYS = [
  { value: '1', shortKey: 'mon' },
  { value: '2', shortKey: 'tue' },
  { value: '3', shortKey: 'wed' },
  { value: '4', shortKey: 'thu' },
  { value: '5', shortKey: 'fri' },
  { value: '6', shortKey: 'sat' },
  { value: '7', shortKey: 'sun' },
] as const;

/**
 * Horario laboral del tenant para tracking GPS de vendedores. Si admin define
 * horario, mobile detiene la jornada automáticamente al salir del rango. Si no
 * define nada, vendedor controla manualmente desde el botón "Iniciar/Finalizar
 * jornada" en home.
 */
export const HorarioLaboralSection: React.FC = () => {
  const t = useTranslations('settings.workSchedule');
  const { settings, updateSettings, isUpdating } = useCompany();

  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [diasSet, setDiasSet] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setHoraInicio(settings.horaInicioJornada ?? '');
    setHoraFin(settings.horaFinJornada ?? '');
    const csv = settings.diasLaborables ?? '';
    setDiasSet(new Set(csv.split(',').map(s => s.trim()).filter(Boolean)));
  }, [settings]);

  const toggleDia = (value: string) => {
    setDiasSet(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const diasCsv = useMemo(() => {
    const sorted = Array.from(diasSet).sort();
    return sorted.join(',');
  }, [diasSet]);

  const validRange = !horaInicio || !horaFin || horaInicio < horaFin;

  const handleSave = async () => {
    if (!validRange) return;
    const success = await updateSettings({
      horaInicioJornada: horaInicio,
      horaFinJornada: horaFin,
      diasLaborables: diasCsv,
    });
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = async () => {
    setHoraInicio('');
    setHoraFin('');
    setDiasSet(new Set());
    await updateSettings({
      horaInicioJornada: '',
      horaFinJornada: '',
      diasLaborables: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <CardTitle>{t('title')}</CardTitle>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="horaInicio">{t('startTime')}</Label>
            <input
              id="horaInicio"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={cn(
                'mt-1 w-full px-3 py-2 border rounded-md bg-background text-foreground',
                !validRange && 'border-red-500'
              )}
            />
          </div>
          <div>
            <Label htmlFor="horaFin">{t('endTime')}</Label>
            <input
              id="horaFin"
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className={cn(
                'mt-1 w-full px-3 py-2 border rounded-md bg-background text-foreground',
                !validRange && 'border-red-500'
              )}
            />
          </div>
        </div>

        {!validRange && (
          <p className="text-[12px] text-red-500">{t('invalidRange')}</p>
        )}

        <div>
          <Label>{t('workDays')}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS.map(d => {
              const selected = diasSet.has(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDia(d.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface-2 text-foreground/70 border-border hover:bg-surface-3'
                  )}
                  aria-pressed={selected}
                >
                  {t(`days.${d.shortKey}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-blue-900 dark:text-blue-200">{t('hint')}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isUpdating}
          >
            {t('clear')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUpdating || !validRange}
          >
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
