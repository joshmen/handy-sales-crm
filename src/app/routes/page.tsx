'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import {
  MapPin,
  Calendar,
  Package,
  Users,
  Clock,
  TrendingUp,
  Filter,
  Plus,
  Search,
  ChevronRight,
  Truck,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Navigation,
  Target,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos
interface Route {
  id: string;
  name: string;
  description: string;
  zone: string;
  assignedTo: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'active' | 'in_progress' | 'completed' | 'scheduled';
  date: Date;
  clients: number;
  visits: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  inventory: {
    loaded: number;
    sold: number;
    returned: number;
  };
  sales: {
    total: number;
    cash: number;
    credit: number;
  };
  performance: {
    efficiency: number; // porcentaje
    avgTimePerVisit: number; // minutos
    conversionRate: number; // porcentaje
  };
}

// Datos mock mejorados
const mockRoutes: Route[] = [
  {
    id: 'R001',
    name: 'Ruta Centro Norte',
    description: 'Zona comercial centro-norte de la ciudad',
    zone: 'CENTRO_NORTE',
    assignedTo: {
      id: 'U001',
      name: 'Juan Pérez',
    },
    status: 'in_progress',
    date: new Date(),
    clients: 24,
    visits: {
      total: 24,
      completed: 18,
      pending: 4,
      cancelled: 2,
    },
    inventory: {
      loaded: 150,
      sold: 98,
      returned: 12,
    },
    sales: {
      total: 45300,
      cash: 28500,
      credit: 16800,
    },
    performance: {
      efficiency: 85,
      avgTimePerVisit: 22,
      conversionRate: 75,
    },
  },
  {
    id: 'R002',
    name: 'Ruta Sur',
    description: 'Zona residencial sur',
    zone: 'SUR',
    assignedTo: {
      id: 'U002',
      name: 'María García',
    },
    status: 'active',
    date: new Date(),
    clients: 31,
    visits: {
      total: 31,
      completed: 8,
      pending: 23,
      cancelled: 0,
    },
    inventory: {
      loaded: 200,
      sold: 45,
      returned: 0,
    },
    sales: {
      total: 22150,
      cash: 15000,
      credit: 7150,
    },
    performance: {
      efficiency: 65,
      avgTimePerVisit: 18,
      conversionRate: 60,
    },
  },
  {
    id: 'R003',
    name: 'Ruta Industrial',
    description: 'Zona industrial y empresarial',
    zone: 'INDUSTRIAL',
    assignedTo: {
      id: 'U003',
      name: 'Carlos López',
    },
    status: 'scheduled',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
    clients: 18,
    visits: {
      total: 18,
      completed: 0,
      pending: 18,
      cancelled: 0,
    },
    inventory: {
      loaded: 0,
      sold: 0,
      returned: 0,
    },
    sales: {
      total: 0,
      cash: 0,
      credit: 0,
    },
    performance: {
      efficiency: 0,
      avgTimePerVisit: 0,
      conversionRate: 0,
    },
  },
  {
    id: 'R004',
    name: 'Ruta Oriente',
    description: 'Zona comercial oriente',
    zone: 'ORIENTE',
    assignedTo: {
      id: 'U004',
      name: 'Ana Martínez',
    },
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
    clients: 28,
    visits: {
      total: 28,
      completed: 26,
      pending: 0,
      cancelled: 2,
    },
    inventory: {
      loaded: 180,
      sold: 165,
      returned: 15,
    },
    sales: {
      total: 67800,
      cash: 45000,
      credit: 22800,
    },
    performance: {
      efficiency: 93,
      avgTimePerVisit: 20,
      conversionRate: 88,
    },
  },
];

// Estadísticas generales
const mockStats = {
  activeRoutes: 2,
  totalVisitsToday: 55,
  completedVisits: 26,
  avgEfficiency: 78,
  totalSalesToday: 67450,
  inventoryOut: 350,
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');

  useEffect(() => {
    // Simular carga de datos
    const timer = setTimeout(() => {
      setRoutes(mockRoutes);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Filtrar rutas
  const filteredRoutes = routes.filter(route => {
    const matchesSearch =
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || route.status === filterStatus;
    const matchesZone = filterZone === 'all' || route.zone === filterZone;

    return matchesSearch && matchesStatus && matchesZone;
  });

  const getStatusColor = (status: Route['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Route['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={14} />;
      case 'in_progress':
        return <Clock size={14} />;
      case 'completed':
        return <CheckCircle size={14} />;
      case 'scheduled':
        return <Calendar size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const getStatusLabel = (status: Route['status']) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'scheduled':
        return 'Programada';
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rutas de Venta</h1>
            <p className="text-gray-600 mt-2">Gestión y seguimiento de rutas comerciales</p>
          </div>
          <div className="flex gap-3">
            <Link href="/routes/admin">
              <Button variant="outline">
                <Navigation size={16} className="mr-2" />
                Administrar
              </Button>
            </Link>
            <Button>
              <Plus size={16} className="mr-2" />
              Nueva Ruta
            </Button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rutas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.activeRoutes}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin size={20} className="text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Visitas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalVisitsToday}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Users size={20} className="text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.completedVisits}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle size={20} className="text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eficiencia</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.avgEfficiency}%</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp size={20} className="text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${mockStats.totalSalesToday.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productos</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.inventoryOut}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package size={20} className="text-indigo-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/routes/load">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Truck size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Cargar Inventario</h3>
                  <p className="text-sm text-gray-600 mt-1">Preparar productos para ruta</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </Card>
          </Link>

          <Link href="/routes/admin">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Administrar Rutas</h3>
                  <p className="text-sm text-gray-600 mt-1">Asignar vendedores y zonas</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </Card>
          </Link>

          <Link href="/routes/close">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 size={24} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Cerrar Ruta</h3>
                  <p className="text-sm text-gray-600 mt-1">Conciliar ventas del día</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <Input
                type="text"
                placeholder="Buscar por ruta, zona o vendedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full md:w-48"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completadas</option>
            <option value="scheduled">Programadas</option>
          </Select>
          <Select
            value={filterZone}
            onChange={e => setFilterZone(e.target.value)}
            className="w-full md:w-48"
          >
            <option value="all">Todas las zonas</option>
            <option value="CENTRO_NORTE">Centro Norte</option>
            <option value="SUR">Sur</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="ORIENTE">Oriente</option>
          </Select>
        </div>

        {/* Lista de rutas */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <EmptyState
            title="No se encontraron rutas"
            description="No hay rutas que coincidan con los filtros seleccionados"
            icon={MapPin}
            action={{
              // ← objeto con label/onClick/variant
              label: 'Limpiar filtros',
              onClick: () => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterZone('all');
              },
              variant: 'default',
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRoutes.map(route => (
              <Card key={route.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header de la tarjeta */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{route.name}</h3>
                        <Badge className={getStatusColor(route.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(route.status)}
                            {getStatusLabel(route.status)}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{route.description}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver detalles
                    </Button>
                  </div>

                  {/* Info del vendedor y fecha */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{route.assignedTo.name}</p>
                        <p className="text-xs text-gray-500">Zona: {route.zone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {format(route.date, 'EEEE', { locale: es })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(route.date, "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Estadísticas de visitas */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-semibold text-gray-900">{route.visits.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completadas</p>
                      <p className="text-lg font-semibold text-green-600">
                        {route.visits.completed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pendientes</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {route.visits.pending}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Canceladas</p>
                      <p className="text-lg font-semibold text-red-600">{route.visits.cancelled}</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Progreso de visitas</span>
                      <span className="text-xs font-medium text-gray-700">
                        {Math.round((route.visits.completed / route.visits.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(route.visits.completed / route.visits.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Métricas de rendimiento */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp size={14} className="text-blue-500" />
                        <span className="text-xs text-gray-500">Eficiencia</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {route.performance.efficiency}%
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign size={14} className="text-green-500" />
                        <span className="text-xs text-gray-500">Ventas</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        ${route.sales.total.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Package size={14} className="text-purple-500" />
                        <span className="text-xs text-gray-500">Vendido</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {route.inventory.sold} u.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
