'use client';

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { ClienteVisitaCreateDto, TipoVisita } from '@/types/visits';
import { Client } from '@/types';

// Schema de validación para visitas - sincronizado con backend
const visitFormSchema = z.object({
  clienteId: z
    .number({ required_error: 'Debe seleccionar un cliente' })
    .int()
    .positive('Debe seleccionar un cliente'),
  tipoVisita: z.nativeEnum(TipoVisita).default(TipoVisita.Rutina),
  fechaProgramada: z.string().optional(),
  notas: z.string().max(2000, 'Las notas no pueden exceder 2000 caracteres').optional(),
});

type VisitFormData = z.infer<typeof visitFormSchema>;
type VisitFormInput = z.input<typeof visitFormSchema>;

interface VisitFormProps {
  clients: Client[];
  onSave: (data: ClienteVisitaCreateDto) => void;
  onCancel: () => void;
}

export const VisitForm: React.FC<VisitFormProps> = ({
  clients,
  onSave,
  onCancel,
}) => {
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
      fechaProgramada: '',
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente <span className="text-red-500">*</span>
        </label>
        <SearchableSelect
          options={clientOptions}
          value={clienteId || null}
          onChange={(val) => setValue('clienteId', val ? Number(val) : 0, { shouldValidate: true })}
          placeholder="Seleccionar cliente..."
          searchPlaceholder="Buscar por nombre o dirección..."
          emptyMessage="No se encontraron clientes"
          error={!!errors.clienteId}
        />
        {errors.clienteId && (
          <p className="mt-1 text-sm text-red-500">{errors.clienteId.message}</p>
        )}
      </div>

      {/* Tipo de visita */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Visita
        </label>
        <SearchableSelect
          options={[
            { value: TipoVisita.Rutina, label: 'Rutina' },
            { value: TipoVisita.Cobranza, label: 'Cobranza' },
            { value: TipoVisita.Entrega, label: 'Entrega' },
            { value: TipoVisita.Prospeccion, label: 'Prospección' },
            { value: TipoVisita.Seguimiento, label: 'Seguimiento' },
            { value: TipoVisita.Otro, label: 'Otro' },
          ]}
          value={watch('tipoVisita') ?? null}
          onChange={(val) => setValue('tipoVisita', val != null ? Number(val) as unknown as TipoVisita : TipoVisita.Rutina, { shouldValidate: true })}
          placeholder="Seleccionar tipo de visita"
        />
      </div>

      {/* Fecha programada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha Programada (opcional)
        </label>
        <input
          type="datetime-local"
          {...register('fechaProgramada')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Deja vacío para visita inmediata
        </p>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          {...register('notas')}
          rows={3}
          placeholder="Notas adicionales sobre la visita..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.notas ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.notas && (
          <p className="mt-1 text-sm text-red-500">{errors.notas.message}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Programar Visita</Button>
      </div>
    </form>
  );
};
