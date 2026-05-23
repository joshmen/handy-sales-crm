'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { ArrowRight, Users, Loader2 } from 'lucide-react';

interface VendedorOption {
  id: number;
  nombre: string;
  rol?: string;
  activo?: boolean;
}

export default function TransferirCarteraPage() {
  const tc = useTranslations('common');
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
        { label: 'Equipo', href: '/team' },
        { label: 'Transferir cartera' },
      ]}
      title="Transferir cartera de vendedor"
      subtitle="Reasigna todos los clientes de un vendedor a otro (ej. cuando un vendedor renuncia o cambia cartera)"
    >
      <div className="p-4 sm:p-6 max-w-2xl" data-testid="transferir-cartera-page">
        <div className="rounded-xl bg-surface-2 border border-border-subtle p-6 space-y-5">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            <strong>⚠️ Operación permanente.</strong> Esta acción reasigna todos los clientes del vendedor origen al destino.
            Para sustituciones temporales (vendedor enfermo un día), mejor usa &ldquo;Crear ruta manual&rdquo; en /routes sin tocar asignaciones.
          </div>

          {/* FROM */}
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Vendedor origen <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vendedores.map(v => ({ value: v.id, label: v.nombre }))}
              value={fromId}
              onChange={(val) => setFromId(val ? Number(val) : null)}
              placeholder="Selecciona el vendedor cuya cartera se va a transferir..."
              searchPlaceholder="Buscar vendedor..."
              disabled={loading}
            />
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* TO */}
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Vendedor destino <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vendedores.filter(v => v.id !== fromId).map(v => ({ value: v.id, label: v.nombre }))}
              value={toId}
              onChange={(val) => setToId(val ? Number(val) : null)}
              placeholder="Selecciona el vendedor que recibirá la cartera..."
              searchPlaceholder="Buscar vendedor..."
              disabled={loading || !fromId}
            />
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="rounded border-border-default"
            />
            Solo clientes activos (recomendado)
          </label>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => router.push('/team')} disabled={submitting}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!fromId || !toId || fromId === toId || submitting}
              data-testid="submit-transfer-btn"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Transfiriendo...</> : 'Transferir cartera'}
            </Button>
          </div>
        </div>

        {lastResult !== null && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-900 flex items-center gap-3" data-testid="transfer-success">
            <Users className="w-5 h-5 text-green-700" />
            <div>
              <strong>{lastResult}</strong> clientes transferidos de <strong>{fromName}</strong> a <strong>{toName}</strong>.
              <br />
              <span className="text-xs text-green-700">La próxima ejecución de &ldquo;Ruta semanal automática&rdquo; generará la ruta del nuevo vendedor.</span>
            </div>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
