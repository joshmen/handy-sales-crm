'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { supervisorService } from '@/services/api';
import type { SupervisorVendedor, SupervisorDashboard } from '@/services/api/supervisor';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import {
  Users,
  ShoppingBag,
  Building2,
  TrendingUp,
  UserPlus,
  UserMinus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';

function formatCurrency(amount: number): string {
  return formatCurrency(amount);
}

export default function TeamPage() {
  const { formatCurrency } = useFormatters();
  const { data: session } = useSession();
  const [vendedores, setVendedores] = useState<SupervisorVendedor[]>([]);
  const [dashboard, setDashboard] = useState<SupervisorDashboard | null>(null);
  const [disponibles, setDisponibles] = useState<SupervisorVendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsignar, setShowAsignar] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const isSupervisor = role === 'SUPERVISOR';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupervisor) {
        const [v, d] = await Promise.all([
          supervisorService.getMisVendedores(),
          supervisorService.getDashboard(),
        ]);
        setVendedores(v);
        setDashboard(d);
      } else if (isAdmin && userId) {
        // Admin viewing a supervisor's team — load all supervisors' teams
        const v = await supervisorService.getVendedoresDeSupervisor(Number(userId));
        setVendedores(v);
      }
    } catch {
      toast({ title: 'Error al cargar datos del equipo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSupervisor, isAdmin, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAsignar = async () => {
    try {
      const d = await supervisorService.getVendedoresDisponibles();
      setDisponibles(d);
      setShowAsignar(true);
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Error al cargar vendedores disponibles', variant: 'destructive' });
    }
  };

  const handleAsignar = async () => {
    if (selectedIds.size === 0 || !userId) return;
    setAssignLoading(true);
    try {
      await supervisorService.asignarVendedores(Number(userId), Array.from(selectedIds));
      toast({ title: `${selectedIds.size} vendedor(es) asignados` });
      setShowAsignar(false);
      loadData();
    } catch {
      toast({ title: 'Error al asignar vendedores', variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDesasignar = async (vendedorId: number, nombre: string) => {
    if (!userId) return;
    if (!confirm(`¿Desasignar a ${nombre} de tu equipo?`)) return;
    try {
      await supervisorService.desasignarVendedor(Number(userId), vendedorId);
      toast({ title: `${nombre} desasignado` });
      loadData();
    } catch {
      toast({ title: 'Error al desasignar vendedor', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Mi Equipo' }]} />
          <p className="text-sm text-gray-500 mt-1">
            {isSupervisor
              ? 'Gestiona tu equipo de vendedores y monitorea su rendimiento'
              : 'Administra las asignaciones de vendedores a supervisores'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenAsignar}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              Asignar Vendedores
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Supervisor only) */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            label="Vendedores"
            value={dashboard.totalVendedores}
            color="indigo"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
            label="Pedidos Hoy"
            value={dashboard.pedidosHoy}
            color="emerald"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
            label="Pedidos Mes"
            value={dashboard.pedidosMes}
            color="blue"
          />
          <KPICard
            icon={<Building2 className="h-5 w-5 text-amber-600" />}
            label="Clientes"
            value={dashboard.totalClientes}
            color="amber"
          />
          <KPICard
            icon={<TrendingUp className="h-5 w-5 text-rose-600" />}
            label="Ventas Mes"
            value={formatCurrency(dashboard.ventasMes)}
            color="rose"
          />
        </div>
      )}

      {/* Vendedores List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Vendedores del Equipo ({vendedores.length})
          </h2>
        </div>

        {vendedores.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay vendedores asignados</p>
            {isAdmin && (
              <button
                onClick={handleOpenAsignar}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Asignar vendedores
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {vendedores.map(v => (
              <div key={v.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {getInitials(v.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.nombre}</p>
                    <p className="text-xs text-gray-500">{v.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    v.activo
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                    {v.rol}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDesasignar(v.id, v.nombre)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Desasignar"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asignar Modal */}
      {showAsignar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Asignar Vendedores</h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona los vendedores a asignar al equipo
              </p>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay vendedores disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {disponibles.map(v => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        selectedIds.has(v.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                      />
                      <Avatar className="h-8 w-8">
                        {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                          {getInitials(v.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{v.nombre}</p>
                        <p className="text-xs text-gray-500">{v.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAsignar(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignar}
                disabled={selectedIds.size === 0 || assignLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Asignar ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
