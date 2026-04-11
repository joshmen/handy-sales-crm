'use client';

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { ClienteVisitaCreateDto, TipoVisita } from '@/types/visits';
import { Client } from '@/types';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';

// Schema de validación para visitas - sincronizado con backend
const visitFormSchema = z.object({
  clienteId: z
    .number({ required_error: 'selectClient' })
    .int()
    .positive('selectClient'),
  tipoVisita: z.nativeEnum(TipoVisita).default(TipoVisita.Rutina),
  fechaProgramada: z.string().optional(),
  notas: z.string().max(2000, 'notesMax2000').optional(),
});

type VisitFormData = z.infer<typeof visitFormSchema>;
type VisitFormInput = z.input<typeof visitFormSchema>;

interface VisitFormProps {
  clients: Client[];
  onSave: (data: ClienteVisitaCreateDto) => void;
  onCancel: () => void;
  defaultDate?: string;
}

export const VisitForm: React.FC<VisitFormProps> = ({
  clients,
  onSave,
  onCancel,
  defaultDate,
}) => {
  const t = useTranslations('visits.form');
  const tc = useTranslations('common');
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<VisitFormInput>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      clienteId: 0,
      tipoVisita: TipoVisita.Rutina,
      fechaProgramada: defaultDate || '',
      notas: '',
    },
  });

  const clienteId = watch('clienteId');

  const clientOptions: SearchableSelectOption[] = useMemo(
    () =>
      clients.map((c) => ({
        value: parseInt(c.id),
        label: c.name,
        description: c.address || undefined,
      })),
    [clients]
  );

  const onFormSubmit = (formData: VisitFormInput) => {
    const data = formData as VisitFormData;
    const submitData: ClienteVisitaCreateDto = {
      clienteId: data.clienteId,
      tipoVisita: data.tipoVisita,
      notas: data.notas || undefined,
      fechaProgramada: data.fechaProgramada || undefined,
    };

    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Cliente */}
      <div data-tour="visits-form-client">
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {t('client')} <span className="text-red-500">*</span>
        </label>
        <SearchableSelect
          options={clientOptions}
          value={clienteId || null}
          onChange={(val) => setValue('clienteId', val ? Number(val) : 0, { shouldValidate: true })}
          placeholder={t('selectClient')}
          searchPlaceholder={t('searchClientPlaceholder')}
          emptyMessage={t('noClientsFound')}
          error={!!errors.clienteId}
        />
        {errors.clienteId && (
          <FieldError message={errors.clienteId.message} />
        )}
      </div>

      {/* Tipo de visita */}
      <div data-tour="visits-form-type">
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {t('visitType')}
        </label>
        <SearchableSelect
          options={[
            { value: TipoVisita.Rutina, label: t('typeRoutine') },
            { value: TipoVisita.Cobranza, label: t('typeCollection') },
            { value: TipoVisita.Entrega, label: t('typeDelivery') },
            { value: TipoVisita.Prospeccion, label: t('typeProspecting') },
            { value: TipoVisita.Seguimiento, label: t('typeFollowUp') },
            { value: TipoVisita.Otro, label: t('typeOther') },
          ]}
          value={watch('tipoVisita') ?? null}
          onChange={(val) => setValue('tipoVisita', val != null ? Number(val) as unknown as TipoVisita : TipoVisita.Rutina, { shouldValidate: true })}
          placeholder={t('selectVisitType')}
        />
      </div>

      {/* Fecha programada */}
      <div data-tour="visits-form-date">
        <DateTimePicker
          mode="datetime"
          label={t('scheduledDate')}
          value={watch('fechaProgramada') || ''}
          onChange={(val) => setValue('fechaProgramada', val, { shouldValidate: true, shouldDirty: true })}
          hint={t('scheduledDateHint')}
        />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {t('notesOptional')}
        </label>
        <textarea
          {...register('notas')}
          rows={3}
          placeholder={t('notesPlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.notas ? 'border-red-500' : 'border-border-default'
          }`}
        />
        {errors.notas && (
          <FieldError message={errors.notas.message} />
        )}
      </div>

      {/* Botones */}
      <div data-tour="visits-form-actions" className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button type="submit" variant="success">
          {t('scheduleVisit')}
        </Button>
      </div>
    </form>
  );
};
