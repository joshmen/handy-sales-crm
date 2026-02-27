'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  Save,
  Check,
} from 'lucide-react';
import {
  CreditCard,
  Buildings,
  CheckCircle,
  XCircle,
  Package,
  Users,
  UsersFour,
  ChartBar,
  Headset,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/hooks/useToast';
import {
  subscriptionPlanAdminService,
  SubscriptionPlanAdminDto,
  SubscriptionPlanCreateDto,
  SubscriptionPlanUpdateDto,
} from '@/services/api/subscriptionPlansAdmin';

export default function SubscriptionPlansAdminPage() {
  const [plans, setPlans] = useState<SubscriptionPlanAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanAdminDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [precioMensual, setPrecioMensual] = useState(0);
  const [precioAnual, setPrecioAnual] = useState(0);
  const [maxUsuarios, setMaxUsuarios] = useState(5);
  const [maxProductos, setMaxProductos] = useState(100);
  const [maxClientesPorMes, setMaxClientesPorMes] = useState(50);
  const [incluyeReportes, setIncluyeReportes] = useState(false);
  const [incluyeSoportePrioritario, setIncluyeSoportePrioritario] = useState(false);
  const [activo, setActivo] = useState(true);
  const [orden, setOrden] = useState(1);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionPlanAdminService.getAll();
      setPlans(data);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los planes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const resetForm = () => {
    setNombre('');
    setCodigo('');
    setPrecioMensual(0);
    setPrecioAnual(0);
    setMaxUsuarios(5);
    setMaxProductos(100);
    setMaxClientesPorMes(50);
    setIncluyeReportes(false);
    setIncluyeSoportePrioritario(false);
    setActivo(true);
    setOrden(plans.length + 1);
  };

  const openCreate = () => {
    setEditingPlan(null);
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (plan: SubscriptionPlanAdminDto) => {
    setEditingPlan(plan);
    setNombre(plan.nombre);
    setCodigo(plan.codigo);
    setPrecioMensual(plan.precioMensual);
    setPrecioAnual(plan.precioAnual);
    setMaxUsuarios(plan.maxUsuarios);
    setMaxProductos(plan.maxProductos);
    setMaxClientesPorMes(plan.maxClientesPorMes);
    setIncluyeReportes(plan.incluyeReportes);
    setIncluyeSoportePrioritario(plan.incluyeSoportePrioritario);
    setActivo(plan.activo);
    setOrden(plan.orden);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!nombre.trim() || (!editingPlan && !codigo.trim())) {
      toast({ title: 'Error', description: 'Nombre y código son requeridos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        const dto: SubscriptionPlanUpdateDto = {
          nombre, precioMensual, precioAnual,
          maxUsuarios, maxProductos, maxClientesPorMes,
          incluyeReportes, incluyeSoportePrioritario, activo, orden,
        };
        await subscriptionPlanAdminService.update(editingPlan.id, dto);
        toast({ title: 'Plan actualizado', description: `${nombre} se actualizó correctamente` });
      } else {
        const dto: SubscriptionPlanCreateDto = {
          nombre, codigo: codigo.toUpperCase(),
          precioMensual, precioAnual,
          maxUsuarios, maxProductos, maxClientesPorMes,
          incluyeReportes, incluyeSoportePrioritario, orden,
        };
        await subscriptionPlanAdminService.create(dto);
        toast({ title: 'Plan creado', description: `${nombre} se creó correctamente` });
      }
      setDrawerOpen(false);
      fetchPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: SubscriptionPlanAdminDto) => {
    try {
      await subscriptionPlanAdminService.toggle(plan.id);
      toast({ title: plan.activo ? 'Plan desactivado' : 'Plan activado' });
      fetchPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  // KPI calculations
  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.activo).length;
  const totalTenants = plans.reduce((sum, p) => sum + p.tenantCount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-gray-500">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900 dark:text-gray-100">Planes de Suscripción</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Planes de Suscripción
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los planes disponibles y sus límites
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPlans} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Plan
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <CreditCard className="h-5 w-5 text-blue-600" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Planes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalPlans}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Planes Activos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activePlans}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <Buildings className="h-5 w-5 text-violet-600" weight="duotone" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Empresas con Plan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTenants}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300" weight="duotone" />
            <p className="mt-4 text-gray-500">No hay planes de suscripción</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer plan
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500">Plan</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Código</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Mensual</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Anual</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Usuarios</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Productos</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Clientes</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Empresas</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Estado</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {plan.nombre}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {plan.codigo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatPrice(plan.precioMensual)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatPrice(plan.precioAnual)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {plan.maxUsuarios}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {plan.maxProductos}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {plan.maxClientesPorMes}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={plan.tenantCount > 0 ? 'default' : 'secondary'}>
                          {plan.tenantCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.activo ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(plan)}
                            className={plan.activo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {plan.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{plan.nombre}</h3>
                      <Badge variant="outline" className="mt-1 font-mono text-xs">{plan.codigo}</Badge>
                    </div>
                    {plan.activo ? (
                      <Badge className="bg-green-100 text-green-800">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Mensual:</span>{' '}
                      <span className="font-medium">{formatPrice(plan.precioMensual)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Anual:</span>{' '}
                      <span className="font-medium">{formatPrice(plan.precioAnual)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">Usuarios:</span> {plan.maxUsuarios}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">Productos:</span> {plan.maxProductos}
                    </div>
                    <div className="flex items-center gap-1">
                      <UsersFour className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">Clientes:</span> {plan.maxClientesPorMes}
                    </div>
                    <div className="flex items-center gap-1">
                      <Buildings className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">Empresas:</span> {plan.tenantCount}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggle(plan)}
                    >
                      {plan.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Create/Edit Drawer */}
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-500">
                {editingPlan ? 'Modifica los detalles del plan' : 'Crea un nuevo plan de suscripción'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Plan Profesional"
                />
              </div>

              {!editingPlan && (
                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: PRO"
                    className="font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Identificador único. No se puede cambiar después.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="precioMensual">Precio Mensual (MXN)</Label>
                  <Input
                    id="precioMensual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioMensual}
                    onChange={(e) => setPrecioMensual(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="precioAnual">Precio Anual (MXN)</Label>
                  <Input
                    id="precioAnual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioAnual}
                    onChange={(e) => setPrecioAnual(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxUsuarios">Max Usuarios</Label>
                  <Input
                    id="maxUsuarios"
                    type="number"
                    min="1"
                    value={maxUsuarios}
                    onChange={(e) => setMaxUsuarios(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxProductos">Max Productos</Label>
                  <Input
                    id="maxProductos"
                    type="number"
                    min="1"
                    value={maxProductos}
                    onChange={(e) => setMaxProductos(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxClientes">Max Clientes</Label>
                  <Input
                    id="maxClientes"
                    type="number"
                    min="1"
                    value={maxClientesPorMes}
                    onChange={(e) => setMaxClientesPorMes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  min="1"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChartBar className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="reportes" className="cursor-pointer">Incluye Reportes</Label>
                  </div>
                  <Switch
                    id="reportes"
                    checked={incluyeReportes}
                    onCheckedChange={setIncluyeReportes}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headset className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="soporte" className="cursor-pointer">Soporte Prioritario</Label>
                  </div>
                  <Switch
                    id="soporte"
                    checked={incluyeSoportePrioritario}
                    onCheckedChange={setIncluyeSoportePrioritario}
                  />
                </div>
                {editingPlan && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activo ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Label htmlFor="activo" className="cursor-pointer">Plan Activo</Label>
                    </div>
                    <Switch
                      id="activo"
                      checked={activo}
                      onCheckedChange={setActivo}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDrawerOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingPlan ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    </div>
  );
}
