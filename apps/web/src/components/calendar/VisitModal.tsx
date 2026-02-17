'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Calendar } from 'lucide-react';
import { Visit } from '@/types/calendar';
import { Client, User } from '@/types';

const visitSchema = z.object({
  clientId: z.string().min(1, 'Selecciona un cliente'),
  userId: z.string().min(1, 'Selecciona un vendedor'),
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().min(1, 'La hora es requerida'),
  type: z.enum(['sales', 'delivery', 'follow_up', 'meeting']),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string(),
  address: z.string(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit?: Visit | null;
  clients: Client[];
  users: User[];
  onSave: (visitData: Partial<Visit>) => void;
  selectedDate?: Date | null; // ← Cambiar a Date | null
}

export const VisitModal: React.FC<VisitModalProps> = ({
  isOpen,
  onClose,
  visit,
  clients,
  users,
  onSave,
  selectedDate,
}) => {
  const drawerRef = useRef<DrawerHandle>(null);

  const defaultValues = useMemo(() => ({
    clientId: visit?.clientId || '',
    userId: visit?.userId || '',
    date: visit?.date
      ? new Date(visit.date).toISOString().split('T')[0]
      : selectedDate
      ? selectedDate.toISOString().split('T')[0]
      : '',
    startTime: visit?.startTime || '09:00',
    type: (visit?.type || 'sales') as VisitFormData['type'],
    priority: (visit?.priority || 'medium') as VisitFormData['priority'],
    notes: visit?.notes || '',
    address: visit?.address || '',
  }), [visit, selectedDate]);

  const {
    register,
    handleSubmit: rhfSubmit,
    reset: resetForm,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues,
  });

  useEffect(() => {
    resetForm(defaultValues);
  }, [defaultValues, resetForm]);

  const typeOptions = [
    { value: 'sales', label: 'Venta' },
    { value: 'delivery', label: 'Entrega' },
    { value: 'follow_up', label: 'Seguimiento' },
    { value: 'meeting', label: 'Reunión' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
  ];

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name,
  }));

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name,
  }));

  const handleSave = rhfSubmit(async (data) => {
    const visitData = {
      ...data,
      date: new Date(`${data.date}T${data.startTime}`),
    };

    onSave(visitData);
    onClose();
  });

  return (
    <Drawer
      ref={drawerRef}
      isOpen={isOpen}
      onClose={onClose}
      title={visit ? 'Editar Visita' : 'Nueva Visita'}
      icon={<Calendar className="w-5 h-5 text-green-600" />}
      width="md"
      isDirty={isDirty}
      onSave={handleSave}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => drawerRef.current?.requestClose()}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{visit ? 'Actualizar' : 'Crear'}</Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Cliente *"
              value={watch('clientId')}
              onChange={(e) => setValue('clientId', e.target.value, { shouldDirty: true })}
            >
              <option value="">Seleccionar cliente</option>
              {clientOptions.map(u => (
                <option key={u.value} value={String(u.value)}>
                  {u.label}
                </option>
              ))}
            </Select>
            {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
          </div>

          <div>
            <Select
              label="Usuario *"
              value={watch('userId')}
              onChange={(e) => setValue('userId', e.target.value, { shouldDirty: true })}
            >
              <option value="">Seleccionar usuario</option>
              {userOptions.map(u => (
                <option key={u.value} value={String(u.value)}>
                  {u.label}
                </option>
              ))}
            </Select>
            {errors.userId && <p className="mt-1 text-sm text-red-600">{errors.userId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha *"
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />

          <Input
            label="Hora de inicio *"
            type="time"
            {...register('startTime')}
            error={errors.startTime?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Tipo de visita"
              value={watch('type')}
              onChange={(e) => setValue('type', e.target.value as VisitFormData['type'], { shouldDirty: true })}
            >
              {typeOptions.map(u => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
          </div>

          <div>
            <Select
              label="Prioridad"
              value={watch('priority')}
              onChange={(e) => setValue('priority', e.target.value as VisitFormData['priority'], { shouldDirty: true })}
            >
              {priorityOptions.map(u => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
            {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
          </div>
        </div>

        <Input
          label="Dirección"
          {...register('address')}
          error={errors.address?.message}
          placeholder="Dirección de la visita"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comentarios de la visita
          </label>
          <textarea
            {...register('notes')}
            placeholder="Comentarios a tu vendedor de qué quieres que haga lograr en esta visita"
            className="w-full p-2 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </div>
    </Drawer>
  );
};
