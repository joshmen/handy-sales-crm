'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Plus, Trash2, Building2, Layers } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { toast } from '@/hooks/useToast';
import {
  modulesAdminService,
  type ModuloMatrizDto,
  type ModuloOverrideDto,
  type ActualizarModuloDto,
  type CrearOverrideDto,
} from '@/services/api/modulesAdmin';
import { tenantService } from '@/services/api/tenants';
import type { Tenant } from '@/types/tenant';
import { getApiErrorMessage } from '@/lib/api';

/** Llaves de tier de la matriz (columnas). */
type TierKey = 'disponibleBasico' | 'disponiblePro' | 'disponibleEnterprise';

const TIER_COLUMNS: { key: TierKey; label: string }[] = [
  { key: 'disponibleBasico', label: 'Basico' },
  { key: 'disponiblePro', label: 'Pro' },
  { key: 'disponibleEnterprise', label: 'Enterprise' },
];

export default function ModulesPage() {
  const [matriz, setMatriz] = useState<ModuloMatrizDto[]>([]);
  const [overrides, setOverrides] = useState<ModuloOverrideDto[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Celdas en proceso de PATCH: "<id>:<tier>" para deshabilitar el switch tocado.
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  // Overrides en proceso de eliminacion.
  const [deletingOverrides, setDeletingOverrides] = useState<Set<number>>(new Set());

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matrizData, overridesData, tenantsData] = await Promise.all([
        modulesAdminService.getMatriz(),
        modulesAdminService.getOverrides(),
        tenantService.getAll(),
      ]);
      setMatriz(matrizData);
      setOverrides(overridesData);
      setTenants(tenantsData);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los modulos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Mapa tenantId -> nombre de empresa, para la tabla de overrides.
  const tenantNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of tenants) map.set(t.id, t.nombreEmpresa);
    return map;
  }, [tenants]);

  // Mapa moduloId -> nombre, para la tabla de overrides.
  const moduloNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of matriz) map.set(m.id, m.nombre);
    return map;
  }, [matriz]);

  const totalModulos = matriz.length;
  const totalOverrides = overrides.length;
  const enterpriseDisponibles = matriz.filter(m => m.disponibleEnterprise).length;

  /** Togglea un tier de un modulo via PATCH, conservando nombre/descripcion. */
  const handleToggleTier = useCallback(
    async (modulo: ModuloMatrizDto, tier: TierKey) => {
      const cellKey = `${modulo.id}:${tier}`;
      setSavingCells(prev => new Set(prev).add(cellKey));

      const dto: ActualizarModuloDto = {
        nombre: modulo.nombre,
        descripcion: modulo.descripcion ?? null,
        disponibleBasico: modulo.disponibleBasico,
        disponiblePro: modulo.disponiblePro,
        disponibleEnterprise: modulo.disponibleEnterprise,
        [tier]: !modulo[tier],
      };

      try {
        await modulesAdminService.update(modulo.id, dto);
        await loadData();
        toast.success('Disponibilidad actualizada', `${modulo.nombre}.`);
      } catch (err) {
        toast.error('No se pudo actualizar', getApiErrorMessage(err));
      } finally {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }
    },
    [loadData]
  );

  /** Elimina un override por tenant. */
  const handleDeleteOverride = useCallback(
    async (id: number) => {
      setDeletingOverrides(prev => new Set(prev).add(id));
      try {
        await modulesAdminService.removeOverride(id);
        await loadData();
        toast.success('Override eliminado');
      } catch (err) {
        toast.error('No se pudo eliminar el override', getApiErrorMessage(err));
      } finally {
        setDeletingOverrides(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [loadData]
  );

  /** Crea un override; recarga al terminar. */
  const handleCreateOverride = useCallback(
    async (dto: CrearOverrideDto) => {
      await modulesAdminService.createOverride(dto);
      await loadData();
      toast.success('Override creado');
    },
    [loadData]
  );

  const headerActions = (
    <Button
      variant="wbOutline"
      size="sm"
      onClick={() => setOverrideModalOpen(true)}
      disabled={loading || !!error || matriz.length === 0}
    >
      <Plus size={16} className="mr-1.5" />
      Nuevo override
    </Button>
  );

  return (
    <PageHeader
      section="superadmin"
      icon={Flag}
      title="Modulos"
      subtitle="Disponibilidad de modulos por plan y overrides por empresa."
      actions={headerActions}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Modulos totales"
          value={loading ? 0 : totalModulos}
          icon={Layers}
          tone="primary"
          loading={loading}
        />
        <StatCard
          label="Disponibles en Enterprise"
          value={loading ? 0 : enterpriseDisponibles}
          icon={Flag}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Overrides por empresa"
          value={loading ? 0 : totalOverrides}
          icon={Building2}
          tone="default"
          loading={loading}
        />
      </div>

      {error ? (
        <ErrorState description={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          {/* Matriz de disponibilidad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matriz de disponibilidad</CardTitle>
              <CardDescription>
                Activa o desactiva cada modulo por tier de plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <MatrizSkeleton />
              ) : matriz.length === 0 ? (
                <EmptyState
                  icon={Flag}
                  title="Sin modulos"
                  description="Aun no hay modulos de plataforma configurados."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2.5 pr-4 font-semibold text-muted-foreground">Modulo</th>
                        {TIER_COLUMNS.map(col => (
                          <th
                            key={col.key}
                            className="py-2.5 px-4 font-semibold text-muted-foreground text-center"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matriz.map(modulo => (
                        <tr key={modulo.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4 align-top">
                            <div className="font-medium text-foreground">{modulo.nombre}</div>
                            <div className="text-xs text-muted-foreground font-mono">{modulo.clave}</div>
                            {modulo.descripcion && (
                              <div className="text-xs text-muted-foreground mt-0.5 max-w-md">
                                {modulo.descripcion}
                              </div>
                            )}
                            {modulo.overridesCount > 0 && (
                              <div className="mt-1.5">
                                <Badge variant="info">
                                  {modulo.overridesCount} override
                                  {modulo.overridesCount === 1 ? '' : 's'}
                                </Badge>
                              </div>
                            )}
                          </td>
                          {TIER_COLUMNS.map(col => {
                            const cellKey = `${modulo.id}:${col.key}`;
                            return (
                              <td key={col.key} className="py-3 px-4 text-center align-middle">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={modulo[col.key]}
                                    disabled={savingCells.has(cellKey)}
                                    onCheckedChange={() => handleToggleTier(modulo, col.key)}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overrides por empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overrides por empresa</CardTitle>
              <CardDescription>
                Habilita o deshabilita un modulo para una empresa especifica, sin importar su plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <OverridesSkeleton />
              ) : overrides.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Sin overrides"
                  description="No hay excepciones por empresa configuradas."
                  action={
                    matriz.length > 0
                      ? { label: 'Crear override', onClick: () => setOverrideModalOpen(true) }
                      : undefined
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2.5 pr-4 font-semibold text-muted-foreground">Empresa</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">Modulo</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">Estado</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">Motivo</th>
                        <th className="py-2.5 pl-4 font-semibold text-muted-foreground text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overrides.map(ov => (
                        <tr key={ov.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4 align-middle text-foreground">
                            {tenantNameById.get(ov.tenantId) ?? `Empresa #${ov.tenantId}`}
                          </td>
                          <td className="py-3 px-4 align-middle text-foreground">
                            {moduloNameById.get(ov.moduloPlataformaId) ??
                              `Modulo #${ov.moduloPlataformaId}`}
                          </td>
                          <td className="py-3 px-4 align-middle">
                            <Badge variant={ov.habilitado ? 'success' : 'secondary'}>
                              {ov.habilitado ? 'Habilitado' : 'Deshabilitado'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 align-middle text-muted-foreground max-w-xs">
                            {ov.motivo || 'Sin datos'}
                          </td>
                          <td className="py-3 pl-4 align-middle text-right">
                            <Button
                              variant="wbDanger"
                              size="sm"
                              loading={deletingOverrides.has(ov.id)}
                              onClick={() => handleDeleteOverride(ov.id)}
                            >
                              <Trash2 size={14} className="mr-1.5" />
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {overrideModalOpen && (
        <CrearOverrideModal
          modulos={matriz}
          tenants={tenants}
          existingOverrides={overrides}
          onClose={() => setOverrideModalOpen(false)}
          onCreate={handleCreateOverride}
        />
      )}
    </PageHeader>
  );
}

// ============ Skeletons ============

function MatrizSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-6">
          <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
          <div className="h-6 w-11 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-11 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-11 rounded-full bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function OverridesSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

// ============ Modal de creacion de override ============

interface CrearOverrideModalProps {
  modulos: ModuloMatrizDto[];
  tenants: Tenant[];
  existingOverrides: ModuloOverrideDto[];
  onClose: () => void;
  onCreate: (dto: CrearOverrideDto) => Promise<void>;
}

function CrearOverrideModal({
  modulos,
  tenants,
  existingOverrides,
  onClose,
  onCreate,
}: CrearOverrideModalProps) {
  const [moduloId, setModuloId] = useState<number | ''>(modulos[0]?.id ?? '');
  const [tenantId, setTenantId] = useState<number | ''>(tenants[0]?.id ?? '');
  const [habilitado, setHabilitado] = useState(true);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Evita el conflicto 409: ya existe override para ese modulo + empresa.
  const duplicate = useMemo(() => {
    if (moduloId === '' || tenantId === '') return false;
    return existingOverrides.some(
      o => o.moduloPlataformaId === moduloId && o.tenantId === tenantId
    );
  }, [existingOverrides, moduloId, tenantId]);

  const canSubmit = moduloId !== '' && tenantId !== '' && !duplicate && !submitting;

  const handleSubmit = async () => {
    if (moduloId === '' || tenantId === '') {
      setFormError('Selecciona una empresa y un modulo.');
      return;
    }
    if (duplicate) {
      setFormError('Ya existe un override para esta empresa y modulo.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate({
        moduloPlataformaId: moduloId,
        tenantId,
        habilitado,
        motivo: motivo.trim() ? motivo.trim() : null,
      });
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'No se pudo crear el override.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-elevation-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Nuevo override por empresa</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Fuerza la disponibilidad de un modulo para una empresa concreta.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Empresa */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Empresa</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={tenantId}
              onChange={e => setTenantId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={submitting}
            >
              {tenants.length === 0 && <option value="">Sin empresas</option>}
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombreEmpresa}
                </option>
              ))}
            </select>
          </div>

          {/* Modulo */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Modulo</label>
            <select
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={moduloId}
              onChange={e => setModuloId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={submitting}
            >
              {modulos.length === 0 && <option value="">Sin modulos</option>}
              {modulos.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado habilitado */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Habilitado</div>
              <div className="text-xs text-muted-foreground">
                {habilitado
                  ? 'El modulo estara disponible para la empresa.'
                  : 'El modulo quedara bloqueado para la empresa.'}
              </div>
            </div>
            <Switch checked={habilitado} onCheckedChange={setHabilitado} disabled={submitting} />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              className="w-full min-h-[72px] rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Cortesia comercial, prueba piloto."
              disabled={submitting}
            />
          </div>

          {duplicate && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Ya existe un override para esta empresa y modulo.
            </p>
          )}
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="wbOutline" size="sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="wbPrimary"
            size="sm"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          >
            Crear override
          </Button>
        </div>
      </div>
    </div>
  );
}
