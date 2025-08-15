/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, Button } from '@/components/ui';
// ⬇️ Import correcto de shadcn/ui Select
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select';
import { CalendarView } from '@/components/calendar/CalendarView';
import { VisitModal } from '@/components/calendar/VisitModal';
import { Visit } from '@/types/calendar';
import { Client, ClientType, User, UserRole } from '@/types';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState('1');
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Datos de ejemplo
  const users: User[] = [
    {
      id: '1',
      name: 'Josué Mendoza',
      email: 'josue@handycrm.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const clients: Client[] = [
    {
      id: '1',
      name: 'Abarrotes Benítez',
      email: 'carlos@abarrotes.com',
      phone: '+52 664 123 4567',
      address: 'Av. Revolución 123, Tijuana',
      code: '',
      type: ClientType.MAYORISTA,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Supermercado Morelos',
      email: 'info@supermorelos.mx',
      phone: '+52 664 987 6543',
      address: 'Calle Morelos 456, Tijuana',
      code: 'Zona 2',
      type: ClientType.MAYORISTA,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const [visits, setVisits] = useState<Visit[]>([
    {
      id: '1',
      clientId: '1',
      client: clients[0],
      userId: '1',
      user: users[0],
      date: new Date(2025, 4, 2, 10, 0), // 2 de mayo de 2025
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      type: 'sales',
      priority: 'high',
      notes: 'Visita de seguimiento para nuevos productos',
      address: 'Av. Revolución 123, Tijuana',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      clientId: '2',
      client: clients[1],
      userId: '1',
      user: users[0],
      date: new Date(2025, 4, 2, 14, 0), // 2 de mayo de 2025
      startTime: '14:00',
      status: 'completed',
      type: 'delivery',
      priority: 'medium',
      notes: 'Entrega de pedido especial',
      address: 'Calle Morelos 456, Tijuana',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name,
  }));

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // Handlers
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedVisit(null);
    setShowVisitModal(true);
  };

  const handleVisitClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setSelectedDate(null);
    setShowVisitModal(true);
  };

  const handleSaveVisit = (visitData: Partial<Visit>) => {
    if (selectedVisit) {
      // Actualizar
      setVisits(
        visits.map(visit =>
          visit.id === selectedVisit.id ? { ...visit, ...visitData, updatedAt: new Date() } : visit
        )
      );
      alert('Visita actualizada exitosamente');
    } else {
      // Crear
      const newVisit: Visit = {
        id: `visit-${Date.now()}`,
        clientId: visitData.clientId!,
        client: clients.find(c => c.id === visitData.clientId)!,
        userId: visitData.userId!,
        user: users.find(u => u.id === visitData.userId)!,
        date: visitData.date!,
        startTime: visitData.startTime!,
        status: 'scheduled',
        type: visitData.type as any,
        priority: visitData.priority as any,
        notes: visitData.notes,
        address: visitData.address,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setVisits([...visits, newVisit]);
      alert('Visita creada exitosamente');
    }
  };

  const handleDeleteVisits = () => {
    if (confirm('¿Estás seguro de que quieres eliminar todas las visitas?')) {
      setVisits([]);
      alert('Todas las visitas han sido eliminadas');
    }
  };

  const handleProgramarVisita = () => {
    setSelectedVisit(null);
    setSelectedDate(new Date());
    setShowVisitModal(true);
  };

  return (
    <Layout>
      <div className="p-6">
        <Card>
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Calendario de visitas</h2>
              <div className="flex gap-2">
                <Button onClick={handleProgramarVisita}>+ Programar visita</Button>
                <Button variant="destructive" onClick={handleDeleteVisits}>
                  Borrar visitas
                </Button>
                <Button variant="outline">Reglas de nuevos prospectos</Button>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  ←
                </Button>
                <Button variant="default" size="sm">
                  May
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  →
                </Button>
              </div>

              <Button variant="outline" size="sm">
                Semana
              </Button>
              <Button variant="outline" size="sm">
                Día
              </Button>

              {/* ✅ Select de shadcn/ui correctamente usado */}
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecciona usuario" />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => {
                  console.log('Actualizando calendario...');
                  alert('Calendario actualizado');
                }}
              >
                Actualizar
              </Button>
            </div>
          </div>

          <CardContent>
            <CalendarView
              visits={visits}
              currentDate={currentDate}
              onDateSelect={handleDateSelect}
              onVisitClick={handleVisitClick}
              selectedUser={selectedUser}
            />
          </CardContent>
        </Card>

        <VisitModal
          isOpen={showVisitModal}
          onClose={() => {
            setShowVisitModal(false);
            setSelectedVisit(null);
            setSelectedDate(null);
          }}
          visit={selectedVisit}
          clients={clients}
          users={users}
          onSave={handleSaveVisit}
          selectedDate={selectedDate}
        />
      </div>
    </Layout>
  );
}
