'use client';

/**
 * Audit H-5 (2026-05-25): Esta página antes vivía en /team/transferir-cartera.
 * Se movió a /clients/transferir-cartera porque es una operación de cartera
 * de clientes, no de gestión del equipo. El path viejo redirige aquí (301)
 * para no romper bookmarks ni links externos.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { ArrowRight, Users, Loader2, AlertTriangle, UserCheck } from 'lucide-react';

interface VendedorOption {
  id: number;
  nombre: string;
  rol?: string;
  activo?: boolean;
}

export default function TransferirCarteraPage() {
  const tc = useTranslations('common');
  const t = useTranslations('clients.transferCartera');
  const router = useRouter();

  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [soloActivos, setSoloActivos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  useEffect(() => {
    async function loadVendedores() {
      try {
        const res = await api.get<{ items: VendedorOption[] } | VendedorOption[]>('/api/usuarios?pagina=1&tamanoPagina=500');
        const data = res.data;
        const list = Array.isArray(data) ? data : (data?.items || []);
        setVendedores(
          list
            .filter(u => (u.activo === undefined || u.activo === true) && (!u.rol || u.rol === 'VENDEDOR'))
            .map(u => ({ id: u.id, nombre: u.nombre, rol: u.rol, activo: u.activo }))
        );
      } catch {
        toast.error(tc('errorLoading'));
      } finally {
        setLoading(false);
      }
    }
    loadVendedores();
  }, [tc]);

  const handleSubmit = async () => {
    if (!fromId || !toId) return;
    if (fromId === toId) {
      toast.error('El vendedor origen y destino no pueden ser el mismo.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await clientService.transferirCartera(fromId, toId, soloActivos);
      setLastResult(result.transferidos);
      toast.success(`${result.transferidos} clientes transferidos correctamente.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : tc('errorGeneric');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fromName = vendedores.find(v => v.id === fromId)?.nombre;
  const toName = vendedores.find(v => v.id === toId)?.nombre;

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbClients'), href: '/clients' },
        { label: t('breadcrumb') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className="max-w-4xl space-y-5" data-testid="transferir-cartera-page">
        {/* Aviso permanente */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-4 text-sm text-amber-900 dark:text-amber-100 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{t('warningPermanent')}</strong> {t('warningBody')}
          </span>
        </div>

        {/* Cards origen / destino con flecha al centro */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* FROM */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Vendedor origen</p>
                <p className="text-[13px] font-semibold text-foreground">{fromName || t('fromLabel')}</p>
              </div>
            </div>
            <SearchableSelect
              options={vendedores.map(v => ({ value: v.id, label: v.nombre }))}
              value={fromId}
              onChange={(val) => setFromId(val ? Number(val) : null)}
              placeholder={t('fromPlaceholder')}
              searchPlaceholder={t('searchPlaceholder')}
              disabled={loading}
            />
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center py-1">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
          </div>

          {/* TO */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Vendedor destino</p>
                <p className="text-[13px] font-semibold text-foreground">{toName || t('toLabel')}</p>
              </div>
            </div>
            <SearchableSelect
              options={vendedores.filter(v => v.id !== fromId).map(v => ({ value: v.id, label: v.nombre }))}
              value={toId}
              onChange={(val) => setToId(val ? Number(val) : null)}
              placeholder={t('toPlaceholder')}
              searchPlaceholder={t('searchPlaceholder')}
              disabled={loading || !fromId}
            />
          </div>
        </div>

        {/* Opciones + acción */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="rounded border-border-default"
            />
            {t('onlyActive')}
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => router.push('/clients')} disabled={submitting}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!fromId || !toId || fromId === toId || submitting}
              data-testid="submit-transfer-btn"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('submitting')}</> : t('submit')}
            </Button>
          </div>
        </div>

        {lastResult !== null && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-primary flex items-center gap-3" data-testid="transfer-success">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <strong>{lastResult}</strong> clientes transferidos de <strong>{fromName}</strong> a <strong>{toName}</strong>.
              <br />
              <span className="text-xs text-primary/80">La próxima ejecución de &ldquo;Ruta semanal automática&rdquo; generará la ruta del nuevo vendedor.</span>
            </div>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
