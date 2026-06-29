'use client';

import { useEffect, useState, useCallback } from 'react';
import { Phone, Mail, Plus, X, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from '@/hooks/useToast';
import {
  supportService,
  type TicketSoporteDto,
  type TicketDetalleDto,
  type EstadoTicket,
  type PrioridadTicket,
  ESTADO_TICKET_LABEL,
  PRIORIDAD_TICKET_OPTIONS,
} from '@/services/api/support';

const CARD = 'rounded-2xl border border-border bg-card p-5 shadow-sm';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

const ESTADO_BADGE: Record<EstadoTicket, BadgeVariant> = {
  0: 'warning',
  1: 'info',
  2: 'success',
  3: 'secondary',
};

function fmtFecha(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============ MODAL: CREAR TICKET ============

function CrearTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [asunto, setAsunto] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTicket>(1);
  const [cuerpo, setCuerpo] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!asunto.trim()) {
      toast.error('El asunto es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await supportService.crear({ asunto: asunto.trim(), canal: 0, prioridad, cuerpo: cuerpo.trim() });
      toast.success('Ticket creado. Soporte te respondera pronto.');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el ticket.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">Crear ticket de soporte</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Asunto</label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Ej: No puedo timbrar una factura"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(Number(e.target.value) as PrioridadTicket)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {PRIORIDAD_TICKET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Mensaje</label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={4}
              placeholder="Describe el problema o tu pregunta."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="wbOutline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="wbPrimary" onClick={submit} loading={saving}>Crear ticket</Button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL: DETALLE + RESPONDER ============

function DetalleTicketModal({
  detail,
  loading,
  onClose,
  onReplied,
}: {
  detail: TicketDetalleDto | null;
  loading: boolean;
  onClose: () => void;
  onReplied: (id: number) => void;
}) {
  const [respuesta, setRespuesta] = useState('');
  const [sending, setSending] = useState(false);

  const cerrado = detail ? detail.estado === 2 || detail.estado === 3 : false;

  const responder = async () => {
    if (!detail || !respuesta.trim()) return;
    setSending(true);
    try {
      await supportService.responder(detail.id, respuesta.trim());
      setRespuesta('');
      onReplied(detail.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">{detail ? detail.asunto : 'Cargando...'}</h2>
            {detail && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={ESTADO_BADGE[detail.estado]}>{ESTADO_TICKET_LABEL[detail.estado]}</Badge>
                <span className="text-xs text-muted-foreground">Ticket #{detail.id}</span>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading || !detail ? (
            <div className="space-y-2">{[0, 1].map((i) => (<div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />))}</div>
          ) : detail.mensajes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mensajes todavia.</p>
          ) : (
            detail.mensajes.map((m) => (
              <div key={m.id} className={m.esOperador ? 'flex justify-start' : 'flex justify-end'}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.esOperador ? 'bg-surface-2 text-foreground' : 'bg-primary text-primary-foreground'}`}>
                  <div className="text-[11px] font-semibold opacity-80">{m.esOperador ? 'Soporte' : 'Tu'}</div>
                  <p className="whitespace-pre-wrap text-sm">{m.cuerpo}</p>
                  <div className="mt-0.5 text-[10px] opacity-70">{fmtFecha(m.creadoEn)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {detail && !cerrado && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-end gap-2">
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
                placeholder="Escribe una respuesta."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <Button variant="wbPrimary" size="icon" onClick={responder} loading={sending} aria-label="Enviar">
                <Send size={16} />
              </Button>
            </div>
          </div>
        )}
        {detail && cerrado && (
          <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
            Este ticket esta {detail.estado === 2 ? 'resuelto' : 'cerrado'}.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function SoporteTickets() {
  const [tickets, setTickets] = useState<TicketSoporteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TicketDetalleDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await supportService.getMisTickets());
    } catch {
      // Si falla, dejamos la lista vacia (sin romper el centro de ayuda).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirDetalle = useCallback(async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await supportService.getById(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el ticket.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <>
      {/* Contacto + crear ticket */}
      <div className={CARD}>
        <h3 className="font-semibold text-foreground">¿Necesitas más ayuda?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea un ticket y nuestro equipo de soporte te responde.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="wbOutline"
            size="sm"
            className="w-full"
            onClick={() => toast.success('Pronto podras llamar a soporte desde aqui.')}
          >
            <Phone size={15} className="mr-2" /> Llamar
          </Button>
          <Button variant="wbPrimary" size="sm" className="w-full" onClick={() => setCreateOpen(true)}>
            <Mail size={15} className="mr-2" /> Crear ticket
          </Button>
        </div>
      </div>

      {/* Mis tickets */}
      <div className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Mis tickets</h3>
          <Button variant="ghost" size="icon" onClick={() => setCreateOpen(true)} aria-label="Nuevo ticket">
            <Plus size={16} />
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => (<div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />))}</div>
        ) : tickets.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sin tickets" description="No has creado tickets de soporte." size="sm" />
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => abrirDetalle(t.id)}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{t.asunto}</span>
                    <Badge variant={ESTADO_BADGE[t.estado]}>{ESTADO_TICKET_LABEL[t.estado]}</Badge>
                  </div>
                  <span className="text-[12px] text-muted-foreground">{fmtFecha(t.creadoEn)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen && (
        <CrearTicketModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            cargar();
          }}
        />
      )}
      {(detail || detailLoading) && (
        <DetalleTicketModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onReplied={async (id) => {
            await abrirDetalle(id);
            cargar();
          }}
        />
      )}
    </>
  );
}
