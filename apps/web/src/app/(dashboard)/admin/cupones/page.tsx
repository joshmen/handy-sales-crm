'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { Ticket, CheckCircle } from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';
import {
  cuponAdminService,
  CuponAdminDto,
  CuponCreateDto,
  CuponUpdateDto,
  TipoCupon,
  TIPO_CUPON_OPTIONS,
} from '@/services/api/cuponesAdmin';

type DrawerMode = 'none' | 'create' | 'edit';

function formatTipo(tipo: TipoCupon): string {
  return TIPO_CUPON_OPTIONS.find(o => o.value === tipo)?.label ?? tipo;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function CuponesAdminPage() {
  const [cupones, setCupones] = useState<CuponAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [editingCupon, setEditingCupon] = useState<CuponAdminDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCupon>('MesesGratis');
  const [mesesGratis, setMesesGratis] = useState<number>(1);
  const [planObjetivo, setPlanObjetivo] = useState('PRO');
  const [mesesUpgrade, setMesesUpgrade] = useState<number>(1);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(10);
  const [maxUsos, setMaxUsos] = useState<number>(1);
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [activo, setActivo] = useState(true);

  const fetchCupones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cuponAdminService.getAll();
      setCupones(data);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los cupones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCupones(); }, [fetchCupones]);

  const resetForm = () => {
    setNombre('');
    setTipo('MesesGratis');
    setMesesGratis(1);
    setPlanObjetivo('PRO');
    setMesesUpgrade(1);
    setDescuentoPorcentaje(10);
    setMaxUsos(1);
    setFechaExpiracion('');
    setActivo(true);
  };

  const openCreate = () => {
    setEditingCupon(null);
    resetForm();
    setDrawerMode('create');
  };

  const openEdit = (cupon: CuponAdminDto) => {
    setEditingCupon(cupon);
    setNombre(cupon.nombre);
    setTipo(cupon.tipo);
    setMesesGratis(cupon.mesesGratis ?? 1);
    setPlanObjetivo(cupon.planObjetivo ?? 'PRO');
    setMesesUpgrade(cupon.mesesUpgrade ?? 1);
    setDescuentoPorcentaje(cupon.descuentoPorcentaje ?? 10);
    setMaxUsos(cupon.maxUsos);
    setFechaExpiracion(
      cupon.fechaExpiracion
        ? new Date(cupon.fechaExpiracion).toISOString().split('T')[0]
        : ''
    );
    setActivo(cupon.activo);
    setDrawerMode('edit');
  };

  const closeDrawer = () => {
    setDrawerMode('none');
    setEditingCupon(null);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (drawerMode === 'edit' && editingCupon) {
        const dto: CuponUpdateDto = {
          nombre,
          maxUsos,
          fechaExpiracion: fechaExpiracion || null,
          activo,
        };
        await cuponAdminService.update(editingCupon.id, dto);
        toast({ title: 'Cupón actualizado', description: `${nombre} se actualizó correctamente` });
      } else {
        const dto: CuponCreateDto = {
          nombre,
          tipo,
          mesesGratis: tipo === 'MesesGratis' ? mesesGratis : null,
          planObjetivo: tipo === 'UpgradePlan' ? planObjetivo : null,
          mesesUpgrade: tipo === 'UpgradePlan' ? mesesUpgrade : null,
          descuentoPorcentaje: tipo === 'DescuentoPorcentaje' ? descuentoPorcentaje : null,
          maxUsos,
          fechaExpiracion: fechaExpiracion || null,
        };
        await cuponAdminService.create(dto);
        toast({ title: 'Cupón creado', description: `${nombre} se creó correctamente` });
      }
      closeDrawer();
      fetchCupones();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cupon: CuponAdminDto) => {
    try {
      await cuponAdminService.update(cupon.id, { activo: !cupon.activo });
      toast({ title: cupon.activo ? 'Cupón desactivado' : 'Cupón activado' });
      fetchCupones();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Error al cambiar estado';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async (cupon: CuponAdminDto) => {
    try {
      await cuponAdminService.delete(cupon.id);
      toast({ title: 'Cupón eliminado', description: `${cupon.nombre} fue eliminado` });
      setDeleteConfirmId(null);
      fetchCupones();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Error al eliminar';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleCopy = async (codigo: string, id: number) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedId(id);
      toast({ title: 'Código copiado' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Error', description: 'No se pudo copiar al portapapeles', variant: 'destructive' });
    }
  };

  // KPI calculations
  const totalCupones = cupones.length;
  const activeCupones = cupones.filter(c => c.activo).length;
  const totalRedenciones = cupones.reduce((sum, c) => sum + c.usosActuales, 0);

  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

  // --- Drawer ---
  const renderDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={closeDrawer} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-violet-600" weight="duotone" />
            {drawerMode === 'edit' ? 'Editar Cupón' : 'Nuevo Cupón'}
          </h2>
          <button onClick={closeDrawer} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Cupón <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClasses}
              placeholder="Ej: Bienvenida 3 meses gratis"
            />
          </div>

          {/* Tipo (solo crear) */}
          {drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cupón <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCupon)}
                className={inputClasses}
              >
                {TIPO_CUPON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campos condicionales por tipo */}
          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'MesesGratis' && drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meses Gratis
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={mesesGratis}
                onChange={(e) => setMesesGratis(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
          )}

          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'UpgradePlan' && drawerMode === 'create' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Objetivo
                </label>
                <select
                  value={planObjetivo}
                  onChange={(e) => setPlanObjetivo(e.target.value)}
                  className={inputClasses}
                >
                  <option value="BASICO">Básico</option>
                  <option value="PRO">Profesional</option>
                  <option value="ENTERPRISE">Empresarial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meses de Upgrade
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={mesesUpgrade}
                  onChange={(e) => setMesesUpgrade(Number(e.target.value))}
                  className={inputClasses}
                />
              </div>
            </>
          )}

          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'DescuentoPorcentaje' && drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje de Descuento
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={descuentoPorcentaje}
                onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                className={inputClasses}
              />
              <p className="text-xs text-gray-500 mt-1">1-100%</p>
            </div>
          )}

          {/* Max Usos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máximo de Usos
            </label>
            <input
              type="number"
              min="1"
              value={maxUsos}
              onChange={(e) => setMaxUsos(Number(e.target.value))}
              className={inputClasses}
            />
          </div>

          {/* Fecha Expiración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Expiración
            </label>
            <input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className={inputClasses}
            />
            <p className="text-xs text-gray-500 mt-1">Dejar vacío para sin expiración</p>
          </div>

          {/* Activo (solo editar) */}
          {drawerMode === 'edit' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setActivo(!activo)}
              >
                <span className={`text-sm ${activo ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}>
                  {activo ? 'Cupón Activo' : 'Cupón Inactivo'}
                </span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activo ? 'bg-green-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </div>
          )}

          {/* Código generado (solo editar, read-only) */}
          {drawerMode === 'edit' && editingCupon && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código (auto-generado)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingCupon.codigo}
                  readOnly
                  className={`${inputClasses} font-mono bg-gray-50 text-gray-600`}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(editingCupon.codigo, editingCupon.id)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copiar código"
                >
                  {copiedId === editingCupon.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Info resumen (solo editar) */}
          {drawerMode === 'edit' && editingCupon && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{formatTipo(editingCupon.tipo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Redenciones:</span>
                <span className="font-medium">{editingCupon.usosActuales} / {editingCupon.maxUsos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Creado:</span>
                <span className="font-medium">{formatDate(editingCupon.creadoEn)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeDrawer}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              drawerMode === 'edit' ? 'Guardar Cambios' : 'Crear Cupón'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Administración</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Cupones</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-violet-600" weight="duotone" />
            Cupones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona cupones de descuento y promociones para tenants
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCupones}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cupón
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <Ticket className="h-5 w-5 text-violet-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cupones</p>
              <p className="text-2xl font-bold text-gray-900">{totalCupones}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cupones Activos</p>
              <p className="text-2xl font-bold text-gray-900">{activeCupones}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Ticket className="h-5 w-5 text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Redenciones</p>
              <p className="text-2xl font-bold text-gray-900">{totalRedenciones}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : cupones.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Ticket className="mx-auto h-12 w-12 text-gray-300" weight="duotone" />
          <p className="mt-4 text-gray-500">No hay cupones creados</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crear primer cupón
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Nombre</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Código</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Usos</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Expiración</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Estado</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cupones.map((cupon) => (
                  <tr key={cupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {cupon.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-gray-200 text-gray-600">
                          {cupon.codigo}
                        </span>
                        <button
                          onClick={() => handleCopy(cupon.codigo, cupon.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Copiar código"
                        >
                          {copiedId === cupon.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                        {formatTipo(cupon.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        cupon.usosActuales >= cupon.maxUsos ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {cupon.usosActuales}/{cupon.maxUsos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className={isExpired(cupon.fechaExpiracion) ? 'text-red-600' : ''}>
                        {formatDate(cupon.fechaExpiracion)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        cupon.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {cupon.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cupon)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(cupon)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cupon.activo
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={cupon.activo ? 'Desactivar' : 'Activar'}
                        >
                          {cupon.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                        {deleteConfirmId === cupon.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(cupon)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Confirmar eliminar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cupon.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {cupones.map((cupon) => (
              <div
                key={cupon.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{cupon.nombre}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-gray-200 text-gray-600">
                        {cupon.codigo}
                      </span>
                      <button
                        onClick={() => handleCopy(cupon.codigo, cupon.id)}
                        className="p-0.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                      >
                        {copiedId === cupon.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    cupon.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cupon.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Tipo:</span>{' '}
                    <span className="font-medium">{formatTipo(cupon.tipo)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Usos:</span>{' '}
                    <span className="font-medium">{cupon.usosActuales}/{cupon.maxUsos}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expira:</span>{' '}
                    <span className={`font-medium ${isExpired(cupon.fechaExpiracion) ? 'text-red-600' : ''}`}>
                      {formatDate(cupon.fechaExpiracion)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Creado:</span>{' '}
                    <span className="font-medium">{formatDate(cupon.creadoEn)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => openEdit(cupon)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(cupon)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                      cupon.activo
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {cupon.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    {cupon.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Drawer */}
      {drawerMode !== 'none' && renderDrawer()}
    </div>
  );
}
