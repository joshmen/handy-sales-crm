'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { supervisorService } from '@/services/api';
import type { SupervisorVendedor, SupervisorDashboard } from '@/services/api/supervisor';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
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

const KPI_BG: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30',
  blue: 'bg-blue-50 dark:bg-blue-900/30',
  amber: 'bg-amber-50 dark:bg-amber-900/30',
  rose: 'bg-rose-50 dark:bg-rose-900/30',
};

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
  const [confirmDesasignar, setConfirmDesasignar] = useState<{ id: number; nombre: string } | null>(null);

  const role = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const isSupervisor = role === 'SUPERVISOR';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Filter out the current user — admin should not see themselves in "Mi Equipo"
  const filteredVendedores = vendedores.filter(v => String(v.id) !== userId);

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
      } else if (isAdmin) {
        const v = await supervisorService.getVendedoresDisponibles();
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

  const handleDesasignar = async () => {
    if (!userId || !confirmDesasignar) return;
    try {
      await supervisorService.desasignarVendedor(Number(userId), confirmDesasignar.id);
      toast({ title: `${confirmDesasignar.nombre} desasignado` });
      setConfirmDesasignar(null);
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
      <div role="status" className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
        <span className="sr-only">Cargando...</span>
      </div>
    );
  }

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Mi Equipo' },
      ]}
      title="Mi Equipo"
      subtitle={isSupervisor
        ? 'Gestiona tu equipo de vendedores y monitorea su rendimiento'
        : 'Estructura de tu equipo — asigna vendedores a supervisores para gestionar rutas y metas'}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              onClick={handleOpenAsignar}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              Asignar Vendedores
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
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
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isAdmin ? `Equipo (${filteredVendedores.length})` : `Vendedores del Equipo (${filteredVendedores.length})`}
          </h2>
        </div>

        {filteredVendedores.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay vendedores asignados</p>
            {isAdmin && (
              <button
                onClick={handleOpenAsignar}
                className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Asignar vendedores
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVendedores.map(v => (
              <div key={v.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                      {getInitials(v.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                    <p className="text-xs text-muted-foreground">{v.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    v.activo
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {v.rol}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDesasignar({ id: v.id, nombre: v.nombre })}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      aria-label={`Desasignar a ${v.nombre}`}
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
      </div>

      {/* Confirm Desasignar Modal */}
      {confirmDesasignar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDesasignar(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-desasignar-title"
            className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <UserMinus className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 id="confirm-desasignar-title" className="text-lg font-semibold text-foreground mb-2">
              ¿Desasignar vendedor?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {confirmDesasignar.nombre} será removido de tu equipo.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDesasignar(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDesasignar}>
                Desasignar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Asignar Modal */}
      {showAsignar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAsignar(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="asignar-title"
            className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border">
              <h3 id="asignar-title" className="text-lg font-semibold text-foreground">Asignar Vendedores</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona los vendedores a asignar al equipo
              </p>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay vendedores disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {disponibles.map(v => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        selectedIds.has(v.id) ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="h-4 w-4 text-green-600 rounded border-border"
                      />
                      <Avatar className="h-8 w-8">
                        {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {getInitials(v.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                        <p className="text-xs text-muted-foreground">{v.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAsignar(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAsignar}
                disabled={selectedIds.size === 0 || assignLoading}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              >
                {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Asignar ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
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
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${KPI_BG[color] ?? 'bg-muted'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
