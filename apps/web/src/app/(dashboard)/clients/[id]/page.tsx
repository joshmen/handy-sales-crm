'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { clientService } from '@/services/api/clients';
import { orderService, type OrderListItem } from '@/services/api/orders';
import type { Client } from '@/types';
import { toast } from '@/hooks/useToast';

// ── Helpers ──

function formatCurrency(value: number, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const ORDER_STATUS_STYLES: Record<string, { statusKey: string; color: string; bg: string }> = {
  PENDIENTE:      { statusKey: 'draft',      color: 'text-foreground/80',  bg: 'bg-surface-3' },
  CONFIRMADA:     { statusKey: 'confirmed',  color: 'text-blue-700',  bg: 'bg-blue-100' },
  EN_PREPARACION: { statusKey: 'inPrep',     color: 'text-indigo-700', bg: 'bg-indigo-100' },
  LISTA_ENVIO:    { statusKey: 'readyToShip', color: 'text-purple-700', bg: 'bg-purple-100' },
  ENVIADA:        { statusKey: 'enRoute',    color: 'text-amber-700', bg: 'bg-amber-100' },
  ENTREGADA:      { statusKey: 'delivered',  color: 'text-green-700', bg: 'bg-green-100' },
  CANCELADA:      { statusKey: 'cancelled',  color: 'text-red-700',   bg: 'bg-red-100' },
};

type Tab = 'pedidos' | 'info';

// ── Page ──

export default function ClientDetailPage() {
  const t = useTranslations('clients.detail');
  const tClients = useTranslations('clients');
  const tc = useTranslations('common');
  const locale = useLocale();
  const fmt = (v: number) => formatCurrency(v, locale);
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pedidos');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientData, ordersData] = await Promise.all([
        clientService.getClientById(clientId),
        orderService.getOrdersByClient(Number(clientId)).catch(() => []),
      ]);
      setClient(clientData);
      setOrders(ordersData);
    } catch {
      setNotFound(true);
      toast.error(t('errorLoadingClient'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) loadData();
  }, [clientId, loadData]);

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-foreground/70">{t('loadingClient')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('notFound')}</h2>
          <p className="text-foreground/70 mb-4">{t('notFoundMessage')}</p>
          <button onClick={() => router.push('/clients')} className="px-4 py-2 bg-success text-success-foreground rounded hover:bg-success/90">
            {t('backToClients')}
          </button>
        </div>
      </div>
    );
  }

  // ── KPIs ──
  const totalPedidos = orders.length;
  const totalVentas = orders.reduce((sum, o) => sum + o.total, 0);
  const pedidosPendientes = orders.filter(o => o.estado !== 'ENTREGADA' && o.estado !== 'CANCELADA').length;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-surface-2 px-4 sm:px-8 py-4 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: tc('home'), href: '/dashboard' },
          { label: tClients('title'), href: '/clients' },
          { label: client.name },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-foreground">{client.name}</h1>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${client.isActive ? 'text-green-700 bg-green-100' : 'text-foreground/80 bg-surface-3'}`}>
              {client.isActive ? tc('active') : tc('inactive')}
            </span>
            {client.esProspecto && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100">
                {tc('prospect')}
              </span>
            )}
          </div>

          <Link
            href={`/clients/${clientId}/edit`}
            className="flex items-center gap-2 bg-success hover:bg-success/90 text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {tc('edit')}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-2 rounded-xl p-5 border border-border-subtle">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('totalOrders')}</p>
            <p className="text-2xl font-bold text-foreground">{totalPedidos}</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-5 border border-border-subtle">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('totalSales')}</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalVentas)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-5 border border-border-subtle">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('pendingOrders')}</p>
            <p className="text-2xl font-bold text-foreground">{pedidosPendientes}</p>
          </div>
        </div>

        {/* Client info card */}
        <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('clientInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('rfc')}</span>
              <span className="text-foreground font-mono">{client.code || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('phone')}</span>
              <span className="text-foreground">{client.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('email')}</span>
              <span className="text-foreground">{client.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('manager')}</span>
              <span className="text-foreground">{client.encargado || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('address')}</span>
              <span className="text-foreground text-right max-w-[200px]">{client.address || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('zone')}</span>
              <span className="text-foreground">{client.zoneName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('category')}</span>
              <span className="text-foreground">{client.categoryName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('balance')}</span>
              <span className="text-foreground">{fmt(client.saldo ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('creditLimit')}</span>
              <span className="text-foreground">{fmt(client.limiteCredito ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('creditDays')}</span>
              <span className="text-foreground">{client.diasCredito ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Fiscal data section */}
        {client.facturable && (
          <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('fiscalData')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('rfc')}</span>
                <span className="text-foreground font-mono">{client.code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('businessName')}</span>
                <span className="text-foreground">{client.razonSocial || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('taxRegime')}</span>
                <span className="text-foreground">{client.regimenFiscal || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('fiscalPostalCode')}</span>
                <span className="text-foreground">{client.codigoPostalFiscal || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('defaultCfdiUse')}</span>
                <span className="text-foreground">{client.usoCFDIPredeterminado || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-surface-2 rounded-xl border border-border-subtle">
          <div className="border-b border-border-subtle px-6">
            <div className="flex gap-6">
              {([
                { key: 'pedidos' as Tab, label: t('tabs.orders') },
                { key: 'info' as Tab, label: t('tabs.comments') },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'pedidos' && (
              <div>
                {orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('noOrders')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle text-left text-muted-foreground">
                          <th className="pb-3 font-medium">{t('orderColumns.number')}</th>
                          <th className="pb-3 font-medium">{t('orderColumns.date')}</th>
                          <th className="pb-3 font-medium">{t('orderColumns.status')}</th>
                          <th className="pb-3 font-medium">{t('orderColumns.vendor')}</th>
                          <th className="pb-3 font-medium text-right">{t('orderColumns.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const style = ORDER_STATUS_STYLES[order.estado] ?? { statusKey: '', color: 'text-foreground/80', bg: 'bg-surface-3' };
                          const statusLabel = style.statusKey ? t(`orderStatus.${style.statusKey}` as Parameters<typeof t>[0]) : order.estado;
                          const cfg = { label: statusLabel, color: style.color, bg: style.bg };
                          return (
                            <tr
                              key={order.id}
                              className="border-b border-border-subtle cursor-pointer hover:bg-surface-1"
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <td className="py-3 font-mono text-xs text-blue-600 hover:underline">{order.numeroPedido}</td>
                              <td className="py-3 text-foreground">{formatDate(order.fechaPedido)}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="py-3 text-muted-foreground">{order.usuarioNombre}</td>
                              <td className="py-3 text-right font-medium text-foreground">{fmt(order.total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="text-sm text-foreground/80">
                {client.comentarios ? (
                  <p>{client.comentarios}</p>
                ) : (
                  <p className="text-muted-foreground">{t('noComments')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
