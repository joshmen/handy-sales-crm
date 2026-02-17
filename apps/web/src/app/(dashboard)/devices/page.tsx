'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/useToast';
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Tablet,
  Monitor,
  XCircle,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface DeviceSession {
  id: string;
  userName: string;
  userEmail: string;
  deviceName: string;
  deviceOS: string;
  appVersion: string;
  ipAddress: string;
  location: string;
  lastActivity: string;
  status: 'active' | 'idle' | 'expired';
  deviceType: 'phone' | 'tablet' | 'desktop';
}

const mockDeviceSessions: DeviceSession[] = [
  {
    id: '1',
    userName: 'María García',
    userEmail: 'maria@empresa.com',
    deviceName: 'iPhone 14 Pro',
    deviceOS: 'iOS 17.2',
    appVersion: 'HandySales v1.2.0',
    ipAddress: '189.203.45.123',
    location: 'CDMX, México',
    lastActivity: 'Hace 2 min',
    status: 'active',
    deviceType: 'phone',
  },
  {
    id: '2',
    userName: 'Carlos López',
    userEmail: 'carlos@empresa.com',
    deviceName: 'Samsung Galaxy S23',
    deviceOS: 'Android 14',
    appVersion: 'HandySales v1.1.8',
    ipAddress: '201.150.78.45',
    location: 'Guadalajara, México',
    lastActivity: 'Hace 15 min',
    status: 'active',
    deviceType: 'phone',
  },
  {
    id: '3',
    userName: 'Ana Martínez',
    userEmail: 'ana@empresa.com',
    deviceName: 'iPad Pro 12.9',
    deviceOS: 'iPadOS 17.1',
    appVersion: 'HandySales v1.2.0',
    ipAddress: '187.190.33.98',
    location: 'Monterrey, México',
    lastActivity: 'Hace 3 días',
    status: 'idle',
    deviceType: 'tablet',
  },
  {
    id: '4',
    userName: 'Juan Pérez',
    userEmail: 'juan@empresa.com',
    deviceName: 'Xiaomi Redmi Note 12',
    deviceOS: 'Android 13',
    appVersion: 'HandySales v1.1.5',
    ipAddress: '200.45.78.32',
    location: 'Tijuana, México',
    lastActivity: 'Hace 7 días',
    status: 'expired',
    deviceType: 'phone',
  },
];

export default function DevicesPage() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setSessions(mockDeviceSessions);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setSessions(mockDeviceSessions);
      setLoading(false);
      toast.success('Lista actualizada');
    }, 500);
  };

  const handleRevokeSession = (sessionId: string) => {
    if (confirm('¿Estás seguro de que deseas revocar esta sesión?')) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Sesión revocada exitosamente');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchTerm === '' ||
      session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredSessions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getDeviceIcon = (type: DeviceSession['deviceType']) => {
    switch (type) {
      case 'phone': return Smartphone;
      case 'tablet': return Tablet;
      case 'desktop': return Monitor;
    }
  };

  const getStatusBadge = (status: DeviceSession['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-[11px] font-medium text-green-700 bg-green-100 rounded-full">Activo</span>;
      case 'idle':
        return <span className="px-2 py-1 text-[11px] font-medium text-yellow-700 bg-yellow-100 rounded-full">Inactivo</span>;
      case 'expired':
        return <span className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full">Expirado</span>;
    }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <span className="text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Administración</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dispositivos</span>
          </div>

          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Sesiones de Dispositivos
            </h1>
            <button
              data-tour="devices-refresh"
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                data-tour="devices-search"
                type="text"
                placeholder="Buscar por usuario o dispositivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[320px] pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
            </div>

            {/* User Filter */}
            <div data-tour="devices-filter-user" className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos los usuarios' },
                  { value: 'maria', label: 'María García' },
                  { value: 'carlos', label: 'Carlos López' },
                ]}
                value={filterUser}
                onChange={(val) => setFilterUser(val ? String(val) : 'all')}
                placeholder="Usuario"
              />
            </div>

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'active', label: 'Activo' },
                  { value: 'idle', label: 'Inactivo' },
                  { value: 'expired', label: 'Expirado' },
                ]}
                value={filterStatus}
                onChange={(val) => setFilterStatus(val ? String(val) : 'all')}
                placeholder="Estado"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Table */}
            <div data-tour="devices-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : paginatedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <Smartphone className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay sesiones</h3>
                  <p className="text-sm text-gray-500 text-center">
                    No se encontraron dispositivos conectados
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[180px] text-xs font-medium text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Usuario</div>
                    <div className="w-[200px] text-xs font-medium text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dispositivo</div>
                    <div className="w-[160px] text-xs font-medium text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>IP / Ubicación</div>
                    <div className="w-[120px] text-xs font-medium text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Última actividad</div>
                    <div className="w-[100px] text-xs font-medium text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Estado</div>
                    <div className="flex-1 text-xs font-medium text-gray-500 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Acciones</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedSessions.map((session) => {
                    const DeviceIcon = getDeviceIcon(session.deviceType);
                    return (
                      <div
                        key={session.id}
                        className="flex items-center px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-[180px]">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.userName}
                          </div>
                          <div className="text-xs text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.userEmail}
                          </div>
                        </div>
                        <div className="w-[200px]">
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {session.deviceName}
                              </div>
                              <div className="text-xs text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {session.deviceOS} • {session.appVersion}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="w-[160px]">
                          <div className="text-sm text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.ipAddress}
                          </div>
                          <div className="text-xs text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.location}
                          </div>
                        </div>
                        <div className="w-[120px] text-sm text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {session.lastActivity}
                        </div>
                        <div className="w-[100px]">
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex-1 flex justify-end">
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Revocar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mostrando {startItem}-{endItem} de {totalItems} sesiones
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
