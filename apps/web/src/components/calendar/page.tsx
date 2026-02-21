/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, Button } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
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
      email: 'josue@handysuites.com',
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
      code: 'Zona 1',
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
      type: ClientType.MINORISTA,
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
      // Actualizar visita existente
      setVisits(
        visits.map(visit =>
          visit.id === selectedVisit.id ? { ...visit, ...visitData, updatedAt: new Date() } : visit
        )
      );
    } else {
      // Crear nueva visita
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
    }
  };

  const handleDeleteVisits = () => {
    if (confirm('¿Estás seguro de que quieres eliminar todas las visitas?')) {
      setVisits([]);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <Card className="shadow-lg">
          {/* 🎨 HEADER MEJORADO CON MEJORES COLORES */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center mb-6">
              {/* 🎨 TÍTULO CON MEJOR CONTRASTE */}
              <h2 className="text-2xl font-bold text-gray-900">📅 Calendario de visitas</h2>

              {/* 🎨 BOTONES PRINCIPALES CON MEJOR VISIBILIDAD */}
              <div className="flex gap-3">
                <Button
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium"
                  onClick={() => setShowVisitModal(true)}
                >
                  ➕ Programar visita
                </Button>
                <Button
                  variant="destructive"
                  className="bg-error-600 hover:bg-error-700 text-white font-medium"
                  onClick={handleDeleteVisits}
                >
                  🗑️ Borrar visitas
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-gray-400 text-gray-700 hover:bg-gray-100 font-medium"
                >
                  📋 Reglas de nuevos prospectos
                </Button>
              </div>
            </div>

            {/* 🎨 CONTROLES DE NAVEGACIÓN MEJORADOS */}
            <div className="flex gap-4 items-center">
              {/* Navegación de mes */}
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:bg-gray-100 border-gray-300"
                  onClick={() => navigateMonth('prev')}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium min-w-[80px]"
                >
                  {currentDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:bg-gray-100 border-gray-300"
                  onClick={() => navigateMonth('next')}
                >
                  Siguiente →
                </Button>
              </div>

              {/* Vistas */}
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:bg-blue-100 border-gray-300"
                >
                  📅 Mes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:bg-blue-100 border-gray-300"
                >
                  📊 Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:bg-blue-100 border-gray-300"
                >
                  📋 Día
                </Button>
              </div>

              {/* Selector de usuario */}
              <div className="bg-white rounded-lg shadow-sm border p-1">
                <Select
                  //options={userOptions}
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="min-w-[150px]"
                >
                  <option value="">Todos los usuarios</option>
                  {userOptions.map(u => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Botón actualizar */}
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-medium">
                🔄 Actualizar
              </Button>
            </div>
          </div>

          {/* 🎨 CONTENIDO CON MEJOR PADDING */}
          <CardContent className="p-6">
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
