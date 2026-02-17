'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Users,
  Filter,
  Download,
  Upload,
  Settings,
  ChevronDown,
  Search,
  Map,
  Navigation,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useRouteStore from '@/stores/useRouteStore';
import { useToast } from '@/hooks/useToast';

// Tipos
interface RouteTemplate {
  id: string;
  name: string;
  description: string;
  zone: string;
  clients: string[];
  estimatedDuration: number; // horas
  optimalDistance: number; // km
  daysOfWeek: number[]; // 0-6 (domingo-sábado)
  isActive: boolean;
}

// Datos mock para templates de rutas
const mockTemplates: RouteTemplate[] = [
  {
    id: 'T001',
    name: 'Ruta Centro Norte - Lunes',
    description: 'Ruta comercial zona centro-norte',
    zone: 'CENTRO_NORTE',
    clients: ['C001', 'C002', 'C003', 'C004', 'C005'],
    estimatedDuration: 8,
    optimalDistance: 45,
    daysOfWeek: [1], // Lunes
    isActive: true,
  },
  {
    id: 'T002',
    name: 'Ruta Sur - Martes/Jueves',
    description: 'Zona residencial sur',
    zone: 'SUR',
    clients: ['C006', 'C007', 'C008', 'C009'],
    estimatedDuration: 6,
    optimalDistance: 38,
    daysOfWeek: [2, 4], // Martes y Jueves
    isActive: true,
  },
  {
    id: 'T003',
    name: 'Ruta Industrial - Miércoles',
    description: 'Zona industrial y empresarial',
    zone: 'INDUSTRIAL',
    clients: ['C010', 'C011', 'C012'],
    estimatedDuration: 7,
    optimalDistance: 52,
    daysOfWeek: [3], // Miércoles
    isActive: true,
  },
];

// Usuarios disponibles
const mockUsers = [
  { id: 'U001', name: 'Juan Pérez', role: 'vendedor', zones: ['CENTRO_NORTE', 'ORIENTE'] },
  { id: 'U002', name: 'María García', role: 'vendedor', zones: ['SUR'] },
  { id: 'U003', name: 'Carlos López', role: 'vendedor', zones: ['INDUSTRIAL', 'CENTRO_NORTE'] },
  { id: 'U004', name: 'Ana Martínez', role: 'vendedor', zones: ['ORIENTE', 'SUR'] },
  { id: 'U005', name: 'Roberto Díaz', role: 'supervisor', zones: ['TODAS'] },
];

// Zonas disponibles
const zones = [
  { id: 'CENTRO_NORTE', name: 'Centro Norte', color: 'blue' },
  { id: 'SUR', name: 'Sur', color: 'green' },
  { id: 'INDUSTRIAL', name: 'Industrial', color: 'purple' },
  { id: 'ORIENTE', name: 'Oriente', color: 'orange' },
  { id: 'PONIENTE', name: 'Poniente', color: 'red' },
];

export default function RouteAdminPage() {
  const { toast } = useToast();
  const { routes, addRoute, updateRoute, deleteRoute, getFilteredRoutes } = useRouteStore();

  const [templates, setTemplates] = useState<RouteTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState('');

  // Estado para el formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zone: '',
    clients: [] as string[],
    estimatedDuration: 8,
    daysOfWeek: [] as number[],
  });

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'all' || template.zone === filterZone;
    return matchesSearch && matchesZone;
  });

  // Días de la semana
  const weekDays = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
  ];

  // Crear ruta desde template
  const createRouteFromTemplate = (template: RouteTemplate, date: Date, userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
      toast.error('Usuario no encontrado');
      return;
    }

    const newRoute = {
      id: `R${Date.now()}`,
      name: `${template.name} - ${format(date, 'dd/MM/yyyy')}`,
      description: template.description,
      zone: template.zone,
      assignedTo: {
        id: user.id,
        name: user.name,
      },
      status: 'scheduled' as const,
      date: date,
      clients: template.clients.length,
      visits: [], // Se llenarían con los clientes del template
      inventory: [],
      sales: {
        total: 0,
        cash: 0,
        credit: 0,
        pending: 0,
      },
      performance: {
        efficiency: 0,
        avgTimePerVisit: 0,
        conversionRate: 0,
        distance: template.optimalDistance,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addRoute(newRoute);
    toast.success(`Ruta creada: ${newRoute.name}`);
    setShowAssignModal(false);
  };

  // Duplicar template
  const duplicateTemplate = (template: RouteTemplate) => {
    const newTemplate = {
      ...template,
      id: `T${Date.now()}`,
      name: `${template.name} (Copia)`,
    };
    setTemplates([...templates, newTemplate]);
    toast.success('Template duplicado exitosamente');
  };

  // Eliminar template
  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este template?')) {
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template eliminado');
    }
  };

  // Optimizar ruta (simulado)
  const optimizeRoute = (templateId: string) => {
    toast.info('Optimizando ruta con algoritmo de distancia mínima...');
    setTimeout(() => {
      toast.success('Ruta optimizada exitosamente');
    }, 2000);
  };

  // Exportar templates
  const exportTemplates = () => {
    const dataStr = JSON.stringify(templates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `routes_templates_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Templates exportados');
  };

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administración de Rutas</h1>
            <p className="text-gray-600 mt-2">
              Gestiona templates y asignación de rutas comerciales
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportTemplates}>
              <Download size={16} className="mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={16} className="mr-2" />
              Nuevo Template
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates Activos</p>
                <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
              </div>
              <Map size={24} className="text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Zonas Cubiertas</p>
                <p className="text-2xl font-bold">{new Set(templates.map(t => t.zone)).size}</p>
              </div>
              <MapPin size={24} className="text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Totales</p>
                <p className="text-2xl font-bold">
                  {templates.reduce((sum, t) => sum + t.clients.length, 0)}
                </p>
              </div>
              <Users size={24} className="text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Distancia Promedio</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    templates.reduce((sum, t) => sum + t.optimalDistance, 0) / templates.length
                  )}{' '}
                  km
                </p>
              </div>
              <Navigation size={24} className="text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <Input
                type="text"
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filterZone}
            onChange={e => setFilterZone(e.target.value)}
            className="w-full md:w-48"
          >
            <option value="all">Todas las zonas</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
          <Button variant="outline">
            <Filter size={16} className="mr-2" />
            Más filtros
          </Button>
        </div>

        {/* Lista de Templates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                  <Badge
                    className={
                      template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {template.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Zona:</span>
                    <span className="ml-2 font-medium">
                      {zones.find(z => z.id === template.zone)?.name}
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Users size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Clientes:</span>
                    <span className="ml-2 font-medium">{template.clients.length}</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Duración:</span>
                    <span className="ml-2 font-medium">{template.estimatedDuration}h</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Navigation size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Distancia:</span>
                    <span className="ml-2 font-medium">{template.optimalDistance} km</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Días:</span>
                    <div className="ml-2 flex gap-1">
                      {weekDays.map(day => (
                        <span
                          key={day.value}
                          className={`px-2 py-1 rounded text-xs ${
                            template.daysOfWeek.includes(day.value)
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {day.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowAssignModal(true);
                    }}
                  >
                    <Users size={14} className="mr-1" />
                    Asignar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => optimizeRoute(template.id)}>
                    <Target size={14} className="mr-1" />
                    Optimizar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateTemplate(template)}>
                    <Copy size={14} className="mr-1" />
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setFormData({
                        name: template.name,
                        description: template.description,
                        zone: template.zone,
                        clients: template.clients,
                        estimatedDuration: template.estimatedDuration,
                        daysOfWeek: template.daysOfWeek,
                      });
                      setShowEditModal(true);
                    }}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Modal de Asignación */}
        {showAssignModal && selectedTemplate && (
          <Modal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            title="Asignar Ruta"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template seleccionado
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de asignación
                </label>
                <Input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={e => setSelectedDate(new Date(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <Select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full"
                >
                  <option value="">Seleccionar vendedor</option>
                  {mockUsers
                    .filter(
                      u => u.zones.includes('TODAS') || u.zones.includes(selectedTemplate.zone)
                    )
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    createRouteFromTemplate(selectedTemplate, selectedDate, selectedUser)
                  }
                  disabled={!selectedUser}
                >
                  Asignar Ruta
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de Crear/Editar Template */}
        {(showCreateModal || showEditModal) && (
          <Modal
            isOpen={showCreateModal || showEditModal}
            onClose={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setFormData({
                name: '',
                description: '',
                zone: '',
                clients: [],
                estimatedDuration: 8,
                daysOfWeek: [],
              });
            }}
            title={showEditModal ? 'Editar Template' : 'Crear Template'}
          >
            <div className="space-y-4">
              <Input
                label="Nombre del template"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Ruta Centro - Lunes"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Describe la ruta..."
                />
              </div>

              <Select
                label="Zona"
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
              >
                <option value="">Seleccionar zona</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Duración estimada (horas)"
                type="number"
                value={formData.estimatedDuration}
                onChange={e =>
                  setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })
                }
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de la semana
                </label>
                <div className="flex gap-2">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const days = formData.daysOfWeek.includes(day.value)
                          ? formData.daysOfWeek.filter(d => d !== day.value)
                          : [...formData.daysOfWeek, day.value];
                        setFormData({ ...formData, daysOfWeek: days });
                      }}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        formData.daysOfWeek.includes(day.value)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (showEditModal && selectedTemplate) {
                      // Actualizar template
                      setTemplates(
                        templates.map(t =>
                          t.id === selectedTemplate.id ? { ...t, ...formData } : t
                        )
                      );
                      toast.success('Template actualizado');
                    } else {
                      // Crear nuevo template
                      const newTemplate: RouteTemplate = {
                        id: `T${Date.now()}`,
                        ...formData,
                        clients: [],
                        optimalDistance: 0,
                        isActive: true,
                      };
                      setTemplates([...templates, newTemplate]);
                      toast.success('Template creado');
                    }
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setFormData({
                      name: '',
                      description: '',
                      zone: '',
                      clients: [],
                      estimatedDuration: 8,
                      daysOfWeek: [],
                    });
                  }}
                  disabled={!formData.name || !formData.zone || formData.daysOfWeek.length === 0}
                >
                  {showEditModal ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
