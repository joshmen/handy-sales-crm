'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LifeBuoy,
  Inbox,
  UserX,
  AlertTriangle,
  Smile,
  Sparkles,
  X,
  Send,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ErrorState } from '@/components/common/EmptyState';
import {
  supportAdminService,
  type TicketSoporteDto,
  type TicketDetalleDto,
  type SupportKpisDto,
  type CanalTicket,
  type PrioridadTicket,
  type EstadoTicket,
} from '@/services/api/supportAdmin';
import { tenantService } from '@/services/api/tenants';

// ─────────────────────────── Mapeos de enums ───────────────────────────

const CANAL_LABEL: Record<CanalTicket, string> = {
  0: 'Web',
  1: 'Correo',
};

const PRIORIDAD_LABEL: Record<PrioridadTicket, string> = {
  0: 'Baja',
  1: 'Media',
  2: 'Alta',
  3: 'Urgente',
};

const PRIORIDAD_VARIANT: Record<
  PrioridadTicket,
  'secondary' | 'info' | 'warning' | 'destructive'
> = {
  0: 'secondary',
  1: 'info',
  2: 'warning',
  3: 'destructive',
};

const ESTADO_LABEL: Record<EstadoTicket, string> = {
  0: 'Abierto',
  1: 'Pendiente',
  2: 'Resuelto',
  3: 'Cerrado',
};

const ESTADO_VARIANT: Record<
  EstadoTicket,
  'info' | 'warning' | 'success' | 'secondary'
> = {
  0: 'info',
  1: 'warning',
  2: 'success',
  3: 'secondary',
};

const PRIORIDAD_OPTIONS: PrioridadTicket[] = [0, 1, 2, 3];
const ESTADO_OPTIONS: EstadoTicket[] = [0, 1, 2, 3];

// ─────────────────────────── Tabs ───────────────────────────

type TabKey = 'todos' | 'abiertos' | 'pendientes' | 'resueltos';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'abiertos', label: 'Abiertos' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'resueltos', label: 'Resueltos' },
];

function matchesTab(estado: EstadoTicket, tab: TabKey): boolean {
  switch (tab) {
    case 'abiertos':
      return estado === 0;
    case 'pendientes':
      return estado === 1;
    case 'resueltos':
      return estado === 2 || estado === 3;
    case 'todos':
    default:
      return true;
  }
}

// ─────────────────────────── Helpers ───────────────────────────

function formatFecha(value: string | null): string {
  if (!value) return 'Sin datos';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Sin datos';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Muestra el literal "Sin datos" cuando el backend devuelve null en un numero. */
function kpiValue(n: number | null | undefined): string | number {
  return n === null || n === undefined ? 'Sin datos' : n;
}

// ─────────────────────────── Operador (asignacion) ───────────────────────────

interface OperadorOption {
  id: number;
  nombre: string;
}

// ─────────────────────────── Pagina ───────────────────────────

export default function SupportPage() {
  const [kpis, setKpis] = useState<SupportKpisDto | null>(null);
  const [tickets, setTickets] = useState<TicketSoporteDto[]>([]);
  const [tenantNames, setTenantNames] = useState<Record<number, string>>({});
  const [operadores, setOperadores] = useState<OperadorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('todos');

  // Drawer de detalle
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportAdminService.getAll();
      setKpis(res.kpis);
      setTickets(res.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el soporte.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga auxiliar (no bloquea la pagina si falla): nombres de empresa + operadores SA.
  const loadAux = useCallback(async () => {
    try {
      const tenants = await tenantService.getAll();
      const map: Record<number, string> = {};
      for (const t of tenants) map[t.id] = t.nombreEmpresa;
      setTenantNames(map);
    } catch {
      /* la pagina funciona sin el mapa de empresas */
    }
    try {
      const res = await tenantService.getGlobalUsers({ rol: 'SUPER_ADMIN', pageSize: 100 });
      setOperadores(res.items.map((u) => ({ id: u.id, nombre: u.nombre })));
    } catch {
      /* la asignacion funciona sin la lista de operadores */
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadAux();
  }, [loadData, loadAux]);

  const filteredTickets = useMemo(
    () => tickets.filter((t) => matchesTab(t.estado, tab)),
    [tickets, tab],
  );

  const empresaNombre = useCallback(
    (tenantId: number): string => tenantNames[tenantId] ?? `Empresa #${tenantId}`,
    [tenantNames],
  );

  const operadorNombre = useCallback(
    (usuarioId: number | null): string => {
      if (usuarioId === null) return 'Sin asignar';
      const op = operadores.find((o) => o.id === usuarioId);
      return op ? op.nombre : `Operador #${usuarioId}`;
    },
    [operadores],
  );

  // ─────────────────────────── Render ───────────────────────────

  return (
    <PageHeader
      section="superadmin"
      icon={LifeBuoy}
      title="Soporte"
      subtitle="Tickets de soporte de las empresas."
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Abiertos"
          value={loading ? 0 : kpiValue(kpis?.abiertos)}
          tone="primary"
          icon={Inbox}
          loading={loading}
        />
        <StatCard
          label="Sin asignar"
          value={loading ? 0 : kpiValue(kpis?.sinAsignar)}
          tone="warning"
          icon={UserX}
          loading={loading}
        />
        <StatCard
          label="SLA en riesgo"
          value={loading ? 0 : kpiValue(kpis?.slaRiesgo)}
          tone="danger"
          icon={AlertTriangle}
          loading={loading}
        />
        <StatCard
          label="CSAT"
          value={loading ? 0 : kpis?.csat ?? 'Sin datos'}
          tone="default"
          icon={Smile}
          loading={loading}
        />
      </div>

      {/* Tarjeta destacada: Preguntale a Handy (informativa) */}
      <div className="mt-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50 dark:bg-purple-950/30 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold text-purple-900 dark:text-purple-100">
                Preguntale a Handy
              </h3>
              <Badge variant="secondary">Proximamente</Badge>
            </div>
            <p className="mt-1 text-[13px] text-purple-800/80 dark:text-purple-200/70">
              Un bot de soporte que respondera dudas frecuentes de las empresas y
              sugerira respuestas a tus operadores. Estara disponible pronto.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {error ? (
        <div className="mt-6">
          <ErrorState description={error} onRetry={loadData} />
        </div>
      ) : (
        <Card className="mt-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-4 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                  tab === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-2 text-muted-foreground hover:bg-surface-3'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto">
              <Button
                variant="wbSoft"
                size="sm"
                onClick={loadData}
                loading={loading}
              >
                <RefreshCw size={15} className="mr-1.5" />
                Actualizar
              </Button>
            </div>
          </div>

          <CardContent className="p-0 mt-3">
            <TicketsTable
              tickets={filteredTickets}
              loading={loading}
              empresaNombre={empresaNombre}
              operadorNombre={operadorNombre}
              onSelect={setSelectedId}
            />
          </CardContent>
        </Card>
      )}

      {/* Drawer de detalle */}
      {selectedId !== null && (
        <TicketDrawer
          ticketId={selectedId}
          operadores={operadores}
          empresaNombre={empresaNombre}
          operadorNombre={operadorNombre}
          onClose={() => setSelectedId(null)}
          onChanged={loadData}
        />
      )}
    </PageHeader>
  );
}

// ─────────────────────────── Tabla ───────────────────────────

interface TicketsTableProps {
  tickets: TicketSoporteDto[];
  loading: boolean;
  empresaNombre: (tenantId: number) => string;
  operadorNombre: (usuarioId: number | null) => string;
  onSelect: (id: number) => void;
}

function TicketsTable({
  tickets,
  loading,
  empresaNombre,
  operadorNombre,
  onSelect,
}: TicketsTableProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14">
        <Inbox className="h-12 w-12 text-muted-foreground mb-3" size={48} />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No hay tickets
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No hay tickets de soporte que coincidan con este filtro.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-[12px] font-semibold text-muted-foreground">
            <th className="px-4 py-2.5">Asunto</th>
            <th className="px-4 py-2.5">Empresa</th>
            <th className="px-4 py-2.5">Canal</th>
            <th className="px-4 py-2.5">Prioridad</th>
            <th className="px-4 py-2.5">Asignado</th>
            <th className="px-4 py-2.5">SLA</th>
            <th className="px-4 py-2.5">Estado</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="border-b border-border-subtle last:border-0 hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium text-foreground max-w-[260px]">
                <span className="block truncate">{t.asunto}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {empresaNombre(t.tenantId)}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{CANAL_LABEL[t.canal]}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={PRIORIDAD_VARIANT[t.prioridad]}>
                  {PRIORIDAD_LABEL[t.prioridad]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {operadorNombre(t.asignadoAUsuarioId)}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatFecha(t.slaVenceEn)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={ESTADO_VARIANT[t.estado]}>
                  {ESTADO_LABEL[t.estado]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────── Drawer de detalle ───────────────────────────

interface TicketDrawerProps {
  ticketId: number;
  operadores: OperadorOption[];
  empresaNombre: (tenantId: number) => string;
  operadorNombre: (usuarioId: number | null) => string;
  onClose: () => void;
  onChanged: () => void;
}

function TicketDrawer({
  ticketId,
  operadores,
  empresaNombre,
  operadorNombre,
  onClose,
  onChanged,
}: TicketDrawerProps) {
  const [detalle, setDetalle] = useState<TicketDetalleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de respuesta
  const [cuerpo, setCuerpo] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Estado de los selects (acciones PATCH)
  const [guardando, setGuardando] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);

  const loadDetalle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportAdminService.getById(ticketId);
      setDetalle(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadDetalle();
  }, [loadDetalle]);

  const handleResponder = async () => {
    if (!cuerpo.trim()) return;
    setEnviando(true);
    setAccionError(null);
    try {
      await supportAdminService.responder(ticketId, {
        cuerpo: cuerpo.trim(),
        esInterno,
      });
      setCuerpo('');
      setEsInterno(false);
      await loadDetalle();
      onChanged();
    } catch (err) {
      setAccionError(
        err instanceof Error ? err.message : 'No se pudo enviar la respuesta.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleActualizar = async (patch: {
    estado?: EstadoTicket;
    prioridad?: PrioridadTicket;
    asignadoAUsuarioId?: number | null;
  }) => {
    setGuardando(true);
    setAccionError(null);
    try {
      await supportAdminService.actualizar(ticketId, patch);
      await loadDetalle();
      onChanged();
    } catch (err) {
      setAccionError(
        err instanceof Error ? err.message : 'No se pudo actualizar el ticket.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl h-full bg-card shadow-xl border-l border-border flex flex-col animate-fade-in">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold tracking-wide text-muted-foreground">
              Ticket #{ticketId}
            </div>
            <h2 className="text-lg font-bold text-foreground leading-tight truncate">
              {detalle?.asunto ?? 'Cargando...'}
            </h2>
            {detalle && (
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                {empresaNombre(detalle.tenantId)}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </Button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <ErrorState description={error} onRetry={loadDetalle} />
          ) : detalle ? (
            <>
              {/* Selects de accion */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
                    Estado
                  </label>
                  <select
                    value={detalle.estado}
                    disabled={guardando}
                    onChange={(e) =>
                      handleActualizar({
                        estado: Number(e.target.value) as EstadoTicket,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    {ESTADO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {ESTADO_LABEL[opt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
                    Prioridad
                  </label>
                  <select
                    value={detalle.prioridad}
                    disabled={guardando}
                    onChange={(e) =>
                      handleActualizar({
                        prioridad: Number(e.target.value) as PrioridadTicket,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    {PRIORIDAD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {PRIORIDAD_LABEL[opt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
                    Asignado
                  </label>
                  <select
                    value={detalle.asignadoAUsuarioId ?? ''}
                    disabled={guardando}
                    onChange={(e) =>
                      handleActualizar({
                        asignadoAUsuarioId:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    <option value="">Sin asignar</option>
                    {operadores.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nombre}
                      </option>
                    ))}
                    {/* Asignado actual no listado entre operadores */}
                    {detalle.asignadoAUsuarioId !== null &&
                      !operadores.some(
                        (o) => o.id === detalle.asignadoAUsuarioId,
                      ) && (
                        <option value={detalle.asignadoAUsuarioId}>
                          {operadorNombre(detalle.asignadoAUsuarioId)}
                        </option>
                      )}
                  </select>
                </div>
              </div>

              {/* Metadatos */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
                <div className="text-muted-foreground">
                  Canal:{' '}
                  <span className="text-foreground font-medium">
                    {CANAL_LABEL[detalle.canal]}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Categoria:{' '}
                  <span className="text-foreground font-medium">
                    {detalle.categoria ?? 'Sin datos'}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  SLA vence:{' '}
                  <span className="text-foreground font-medium">
                    {formatFecha(detalle.slaVenceEn)}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Creado:{' '}
                  <span className="text-foreground font-medium">
                    {formatFecha(detalle.creadoEn)}
                  </span>
                </div>
              </div>

              {accionError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[12.5px] text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{accionError}</span>
                </div>
              )}

              {/* Hilo de mensajes */}
              <div className="mt-5">
                <h3 className="text-[13px] font-bold text-foreground mb-2">
                  Conversacion
                </h3>
                {detalle.mensajes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aun no hay mensajes en este ticket.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {detalle.mensajes.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-xl border p-3 ${
                          m.esOperador
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border-subtle bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[12.5px] font-semibold text-foreground">
                            {m.esOperador
                              ? 'Operador'
                              : operadorNombre(m.autorUsuarioId) === 'Sin asignar'
                                ? 'Cliente'
                                : `Cliente (#${m.autorUsuarioId ?? '?'})`}
                          </span>
                          {m.esInterno && (
                            <Badge variant="warning">Nota interna</Badge>
                          )}
                          <span className="ml-auto text-[11.5px] text-muted-foreground">
                            {formatFecha(m.creadoEn)}
                          </span>
                        </div>
                        <p className="text-[13px] text-foreground whitespace-pre-wrap break-words">
                          {m.cuerpo}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Pie: formulario de respuesta */}
        {!loading && !error && detalle && (
          <div className="border-t border-border px-5 py-4 bg-card">
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              placeholder="Escribe una respuesta al cliente..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esInterno}
                  onChange={(e) => setEsInterno(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
                Nota interna (no visible para el cliente)
              </label>
              <Button
                variant="wbPrimary"
                size="sm"
                onClick={handleResponder}
                loading={enviando}
                disabled={!cuerpo.trim()}
              >
                <Send size={15} className="mr-1.5" />
                Responder
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
