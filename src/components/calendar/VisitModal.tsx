'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui';
import { Visit } from '@/types/calendar';
import { Client, User } from '@/types';

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
  const [formData, setFormData] = useState({
    clientId: visit?.clientId || '',
    userId: visit?.userId || '',
    date: visit?.date
      ? new Date(visit.date).toISOString().split('T')[0]
      : selectedDate
      ? selectedDate.toISOString().split('T')[0]
      : '',
    startTime: visit?.startTime || '09:00',
    type: visit?.type || 'sales',
    priority: visit?.priority || 'medium',
    notes: visit?.notes || '',
    address: visit?.address || '',
  });

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

  const handleSave = () => {
    if (!formData.clientId || !formData.userId || !formData.date) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const visitData = {
      ...formData,
      date: new Date(`${formData.date}T${formData.startTime}`),
    };

    onSave(visitData);
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={visit ? 'Editar Visita' : 'Programar Visita'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Cliente *"
            //options={[{ value: '', label: 'Seleccionar cliente' }, ...clientOptions]}
            value={formData.clientId}
            onChange={e => handleInputChange('clientId', e.target.value)}
          >
            <option value="">Seleccionar cliente</option>
            {clientOptions.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>

          <Select
            label="Usuario *"
            //options={[{ value: '', label: 'Seleccionar usuario' }, ...userOptions]}
            value={formData.userId}
            onChange={e => handleInputChange('userId', e.target.value)}
          >
            <option value="">Seleccionar usuario</option>
            {userOptions.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha *"
            type="date"
            value={formData.date}
            onChange={e => handleInputChange('date', e.target.value)}
          />

          <Input
            label="Hora de inicio *"
            type="time"
            value={formData.startTime}
            onChange={e => handleInputChange('startTime', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de visita"
            //options={typeOptions}
            value={formData.type}
            onChange={e => handleInputChange('type', e.target.value)}
          >
            <option value="">Tipo de visita</option>
            {typeOptions.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>

          <Select
            label="Prioridad"
            //options={priorityOptions}
            value={formData.priority}
            onChange={e => handleInputChange('priority', e.target.value)}
          >
            <option value="">Prioridad</option>
            {priorityOptions.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Dirección"
          value={formData.address}
          onChange={e => handleInputChange('address', e.target.value)}
          placeholder="Dirección de la visita"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comentarios de la visita
          </label>
          <textarea
            value={formData.notes}
            onChange={e => handleInputChange('notes', e.target.value)}
            placeholder="Comentarios a tu vendedor de qué quieres que haga lograr en esta visita"
            className="w-full p-2 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{visit ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </div>
    </Modal>
  );
};
