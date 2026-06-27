'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ListChecks,
  Plus,
  X,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import {
  statusAdminService,
  type IncidenteDto,
  type SaludServicioDto,
  type SeveridadIncidente,
  type EstadoIncidente,
  SEVERIDAD_LABEL,
  ESTADO_INCIDENTE_LABEL,
  SEVERIDAD_OPTIONS,
  ESTADO_INCIDENTE_OPTIONS,
} from '@/services/api/statusAdmin';

// ============ HELPERS ============

const ESTADO_RESUELTO: EstadoIncidente = 3;

function severidadVariant(
  severidad: SeveridadIncidente
): 'secondary' | 'warning' | 'destructive' {
  if (severidad === 2) return 'destructive';
  if (severidad === 1) return 'warning';
  return 'secondary';
}

function estadoVariant(
  estado: EstadoIncidente
): 'success' | 'info' | 'warning' {
  if (estado === ESTADO_RESUELTO) return 'success';
  if (estado === 2) return 'info';
  return 'warning';
}

/** Estilo del dot/badge segun el estado string de salud del servicio. */
function saludEstilo(estado: string): {
  dot: string;
  variant: 'success' | 'warning' | 'secondary';
} {
  if (estado === 'Operativo') return { dot: 'bg-emerald-500', variant: 'success' };
  if (estado === 'Degradado') return { dot: 'bg-amber-500', variant: 'warning' };
  return { dot: 'bg-muted-foreground/40', variant: 'secondary' };
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Sin datos';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sin datos';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============ MODAL NUEVO INCIDENTE ============

interface NuevoIncidenteModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NuevoIncidenteModal({ onClose, onCreated }: NuevoIncidenteModalProps) {
  const [titulo, setTitulo] = useState('');
  const [componente, setComponente] = useState('');
  const [severidad, setSeveridad] = useState<SeveridadIncidente>(0);
  const [estado, setEstado] = useState<EstadoIncidente>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!titulo.trim()) {
      setError('El titulo es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await statusAdminService.crearIncidente({
        titulo: titulo.trim(),
        componente: componente.trim(),
        severidad,
        estado,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el incidente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">Nuevo incidente</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Titulo</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Latencia elevada en la API"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Componente</label>
            <input
              type="text"
              value={componente}
              onChange={(e) => setComponente(e.target.value)}
              placeholder="Ej: API Gateway"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Severidad</label>
              <select
                value={severidad}
                onChange={(e) => setSeveridad(Number(e.target.value) as SeveridadIncidente)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {SEVERIDAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(Number(e.target.value) as EstadoIncidente)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {ESTADO_INCIDENTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="wbOutline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="wbPrimary" onClick={submit} loading={saving}>
            Crear incidente
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ PAGINA ============

export default function StatusPage() {
  const [incidentes, setIncidentes] = useState<IncidenteDto[]>([]);
  const [servicios, setServicios] = useState<SaludServicioDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resolviendo, setResolviendo] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [inc, health] = await Promise.all([
        statusAdminService.getIncidentes(),
        statusAdminService.getHealth(),
      ]);
      setIncidentes(inc);
      setServicios(health);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (id: number) => {
    setResolviendo(id);
    try {
      await statusAdminService.resolverIncidente(id);
      await cargar();
    } catch {
      setError(true);
    } finally {
      setResolviendo(null);
    }
  };

  const incidentesActivos = incidentes.filter((i) => i.estado !== ESTADO_RESUELTO);
  const hayActivos = incidentesActivos.length > 0;
  const serviciosOperativos = servicios.filter((s) => s.estado === 'Operativo').length;
  const serviciosDegradados = servicios.filter((s) => s.estado === 'Degradado').length;

  const actions = (
    <Button variant="wbPrimary" onClick={() => setModalOpen(true)}>
      <Plus size={16} className="mr-1.5" />
      Nuevo incidente
    </Button>
  );

  return (
    <PageHeader
      section="superadmin"
      icon={Gauge}
      title="Estado del sistema"
      subtitle="Estado y salud de los servicios de la plataforma."
      actions={actions}
    >
      {error ? (
        <ErrorState onRetry={cargar} />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Incidentes activos"
              value={loading ? 0 : incidentesActivos.length}
              tone={hayActivos ? 'warning' : 'success'}
              icon={Activity}
              loading={loading}
            />
            <StatCard
              label="Servicios operativos"
              value={loading ? 0 : serviciosOperativos}
              tone="success"
              icon={CheckCircle2}
              loading={loading}
              sub={loading ? undefined : `de ${servicios.length}`}
            />
            <StatCard
              label="Servicios degradados"
              value={loading ? 0 : serviciosDegradados}
              tone={serviciosDegradados > 0 ? 'danger' : 'default'}
              icon={AlertTriangle}
              loading={loading}
            />
            <StatCard
              label="Incidentes totales"
              value={loading ? 0 : incidentes.length}
              tone="default"
              icon={ListChecks}
              loading={loading}
            />
          </div>

          {/* Banner de estado global */}
          {!loading && (
            <div
              className={
                hayActivos
                  ? 'flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-700 dark:bg-amber-950/40'
                  : 'flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 dark:border-emerald-700 dark:bg-emerald-950/40'
              }
            >
              {hayActivos ? (
                <AlertTriangle size={22} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 size={22} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <div>
                <p
                  className={
                    hayActivos
                      ? 'font-semibold text-amber-800 dark:text-amber-300'
                      : 'font-semibold text-emerald-800 dark:text-emerald-300'
                  }
                >
                  {hayActivos ? 'Incidentes activos' : 'Todos los sistemas operativos'}
                </p>
                <p
                  className={
                    hayActivos
                      ? 'text-sm text-amber-700/90 dark:text-amber-400/80'
                      : 'text-sm text-emerald-700/90 dark:text-emerald-400/80'
                  }
                >
                  {hayActivos
                    ? `${incidentesActivos.length} incidente(s) en curso.`
                    : 'No hay incidentes en curso en este momento.'}
                </p>
              </div>
            </div>
          )}

          {/* Servicios */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Servicios
            </h2>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="divide-y divide-border">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-4">
                        <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                        <div className="h-4 w-40 rounded-md bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : servicios.length === 0 ? (
                  <div className="py-4">
                    <EmptyState
                      icon={Activity}
                      title="Sin servicios"
                      description="No hay informacion de salud de servicios disponible."
                      size="sm"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {servicios.map((s) => {
                      const estilo = saludEstilo(s.estado);
                      return (
                        <div
                          key={s.nombre}
                          className="flex items-center justify-between gap-3 px-5 py-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${estilo.dot}`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{s.nombre}</p>
                              <p className="truncate text-xs text-muted-foreground">{s.detalle}</p>
                            </div>
                          </div>
                          <Badge variant={estilo.variant} className="flex-shrink-0">
                            {s.estado}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Incidentes recientes */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Incidentes recientes
            </h2>
            {loading ? (
              <Card>
                <CardContent className="space-y-3 py-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </CardContent>
              </Card>
            ) : incidentes.length === 0 ? (
              <Card>
                <CardContent className="py-4">
                  <EmptyState
                    icon={ListChecks}
                    title="Sin incidentes"
                    description="No se ha registrado ningun incidente en la plataforma."
                    size="sm"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {incidentes.map((inc) => {
                  const resuelto = inc.estado === ESTADO_RESUELTO;
                  return (
                    <Card key={inc.id}>
                      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{inc.titulo}</span>
                            {inc.componente && (
                              <span className="text-xs text-muted-foreground">{inc.componente}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={severidadVariant(inc.severidad)}>
                              {SEVERIDAD_LABEL[inc.severidad]}
                            </Badge>
                            <Badge variant={estadoVariant(inc.estado)}>
                              {ESTADO_INCIDENTE_LABEL[inc.estado]}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              Inicio: {formatFecha(inc.iniciadoEn)}
                            </span>
                            <span>Resolucion: {formatFecha(inc.resueltoEn)}</span>
                          </div>
                        </div>

                        {!resuelto && (
                          <div className="flex-shrink-0">
                            <Button
                              variant="wbOutline"
                              size="sm"
                              loading={resolviendo === inc.id}
                              onClick={() => resolver(inc.id)}
                            >
                              Resolver
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <NuevoIncidenteModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            cargar();
          }}
        />
      )}
    </PageHeader>
  );
}
