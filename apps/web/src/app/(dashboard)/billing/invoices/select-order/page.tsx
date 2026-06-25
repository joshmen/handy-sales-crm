'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Receipt, Loader2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { TabBar } from '@/components/ui/TabBar';
import { Button } from '@/components/ui/Button';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useFormatters } from '@/hooks/useFormatters';
import { orderService, type OrderListItem } from '@/services/api/orders';
import { getInvoicedOrders, type InvoicedOrder } from '@/services/api/billing';

type Tab = 'pending' | 'invoiced' | 'all';

export default function SelectOrderToInvoicePage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const router = useRouter();
  const showApiError = useApiErrorToast();
  const { formatCurrency, formatDate } = useFormatters();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [invoiced, setInvoiced] = useState<Record<number, InvoicedOrder>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, inv] = await Promise.all([
        // Solo pedidos ENTREGADOS — nada de facturar pedidos no entregados.
        // El backend bindea `estado` al enum C# EstadoPedido por NOMBRE ('Entregado'), no 'ENTREGADA'.
        orderService.getOrders({ estado: 'Entregado', pageSize: 100, busqueda: search || undefined }),
        getInvoicedOrders().catch(() => ({} as Record<number, InvoicedOrder>)),
      ]);
      setOrders(res.items);
      setInvoiced(inv);
    } catch (err) {
      showApiError(err, t('selectOrder.error'));
    } finally {
      setLoading(false);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // Facturado = tiene factura no cancelada.
  const isFacturado = (id: number) => {
    const f = invoiced[id];
    return !!f && (f.estado || '').toUpperCase() !== 'CANCELADA';
  };

  const pending = orders.filter((o) => !isFacturado(o.id));
  const facturados = orders.filter((o) => isFacturado(o.id));
  const shown = tab === 'pending' ? pending : tab === 'invoiced' ? facturados : orders;

  return (
    <PageHeader
      section="empresa"
      icon={Receipt}
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionCompany') },
        { label: t('title'), href: '/billing' },
        { label: t('selectOrder.title') },
      ]}
      title={t('selectOrder.title')}
      subtitle={t('selectOrder.subtitle')}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabBar
            value={tab}
            onChange={(id) => setTab(id as Tab)}
            items={[
              { id: 'pending', label: t('selectOrder.tabPending'), count: pending.length },
              { id: 'invoiced', label: t('selectOrder.tabInvoiced'), count: facturados.length },
              { id: 'all', label: t('selectOrder.tabAll'), count: orders.length },
            ]}
          />
          <SearchBar
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder={t('selectOrder.searchPlaceholder')}
            className="w-full sm:w-72 lg:w-80"
          />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> {tc('loading')}
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 py-16">
              <FileText className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground/80">{t('selectOrder.empty')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('selectOrder.onlyDelivered')}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:flex items-center bg-surface-1 px-4 h-10 border-b border-border-subtle text-xs font-semibold text-foreground/70">
                <div className="w-[130px]">{t('selectOrder.colFolio')}</div>
                <div className="flex-1">{t('selectOrder.colClient')}</div>
                <div className="w-[160px]">{t('selectOrder.colSeller')}</div>
                <div className="w-[120px]">{t('selectOrder.colDate')}</div>
                <div className="w-[110px] text-right">{t('selectOrder.colTotal')}</div>
                <div className="w-[120px] text-right" />
              </div>
              {shown.map((o) => {
                const facturado = isFacturado(o.id);
                return (
                  <div key={o.id} className="flex flex-col md:flex-row md:items-center px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-1 transition-colors gap-2">
                    <div className="w-[130px] font-mono text-[13px] text-foreground">{o.numeroPedido}</div>
                    <div className="flex-1 text-[13px] text-foreground truncate">{o.clienteNombre}</div>
                    <div className="w-[160px] text-[13px] text-muted-foreground truncate">{o.usuarioNombre}</div>
                    <div className="w-[120px] text-[13px] text-muted-foreground">{formatDate(new Date(o.fechaPedido))}</div>
                    <div className="w-[110px] text-right text-[13px] font-semibold text-foreground tabular-nums">{formatCurrency(o.total)}</div>
                    <div className="w-[120px] flex md:justify-end">
                      {facturado ? (
                        <SoftBadge tone="success">{t('selectOrder.invoiced')}</SoftBadge>
                      ) : (
                        <Button variant="wbPrimary" className="h-8 px-3 text-xs" onClick={() => router.push(`/billing/pre-factura?pedidoId=${o.id}`)}>
                          {t('selectOrder.invoice')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </PageHeader>
  );
}
