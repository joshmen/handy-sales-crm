'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { orderService, type OrderDetail } from '@/services/api/orders';
import { OrderStatus } from '@/types';
import { toast } from '@/hooks/useToast';

// ── Status helpers ──

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  PENDIENTE:      { color: 'text-gray-700',   bg: 'bg-gray-100' },
  CONFIRMADA:     { color: 'text-blue-700',   bg: 'bg-blue-100' },
  EN_PREPARACION: { color: 'text-indigo-700', bg: 'bg-indigo-100' },
  LISTA_ENVIO:    { color: 'text-purple-700', bg: 'bg-purple-100' },
  ENVIADA:        { color: 'text-amber-700',  bg: 'bg-amber-100' },
  ENTREGADA:      { color: 'text-green-700',  bg: 'bg-green-100' },
  CANCELADA:      { color: 'text-red-700',    bg: 'bg-red-100' },
};

const STEPPER_STEPS = [
  OrderStatus.PENDIENTE,
  OrderStatus.CONFIRMADA,
  OrderStatus.ENVIADA,
  OrderStatus.ENTREGADA,
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cfg = STATUS_STYLES[status] ?? { color: 'text-gray-700', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {label}
    </span>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Page ──

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('orders.detailPage');
  const tc = useTranslations('common');
  const orderId = Number(params.id);

  const STATUS_LABELS: Record<string, string> = {
    PENDIENTE: t('statusDraft'),
    CONFIRMADA: t('statusConfirmed'),
    EN_PREPARACION: t('statusPreparation'),
    LISTA_ENVIO: t('statusReadyShip'),
    ENVIADA: t('statusEnRoute'),
    ENTREGADA: t('statusDelivered'),
    CANCELADA: t('statusCancelled'),
  };

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId, loadOrder]);

  const handleAction = async (action: 'confirmar' | 'en-ruta' | 'entregar' | 'cancelar') => {
    if (!order) return;
    try {
      setActionLoading(action);
      switch (action) {
        case 'confirmar':
          await orderService.confirmOrder(order.id);
          toast.success(t('orderConfirmed'));
          break;
        case 'en-ruta':
          await orderService.sendToRoute(order.id);
          toast.success(t('orderEnRoute'));
          break;
        case 'entregar':
          await orderService.deliverOrder(order.id);
          toast.success(t('orderDelivered'));
          break;
        case 'cancelar':
          if (!confirm(t('confirmCancel'))) return;
          await orderService.cancelOrder(order.id);
          toast.success(t('orderCancelled'));
          break;
      }
      await loadOrder();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || t('actionError');
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / Error states ──

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">{t('loadingOrder')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('notFound')}</h2>
          <p className="text-gray-600 mb-4">{t('notFoundMessage')}</p>
          <button onClick={() => router.push('/orders')} className="px-4 py-2 bg-success text-success-foreground rounded hover:bg-success/90">
            Volver a pedidos
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.estado === OrderStatus.CANCELADA;
  const isDelivered = order.estado === OrderStatus.ENTREGADA;

  // Determine which step is active for the stepper
  const activeStepIndex = isCancelled
    ? -1
    : STEPPER_STEPS.indexOf(order.estado as OrderStatus);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white px-4 sm:px-8 py-4 border-b border-gray-200">
        <Breadcrumb items={[
          { label: t('breadcrumbHome'), href: '/dashboard' },
          { label: t('breadcrumbOrders'), href: '/orders' },
          { label: t('orderTitle', { number: order.numeroPedido }) },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-900">
              Pedido #{order.numeroPedido}
            </h1>
            <StatusBadge status={order.estado} label={STATUS_LABELS[order.estado] ?? order.estado} />
          </div>

          <div className="flex items-center gap-2">
            {order.estado === OrderStatus.PENDIENTE && (
              <button
                onClick={() => handleAction('confirmar')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'confirmar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            )}
            {order.estado === OrderStatus.CONFIRMADA && (
              <button
                onClick={() => handleAction('en-ruta')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'en-ruta' && <Loader2 className="w-4 h-4 animate-spin" />}
                En ruta
              </button>
            )}
            {order.estado === OrderStatus.ENVIADA && (
              <button
                onClick={() => handleAction('entregar')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'entregar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Entregar
              </button>
            )}
            {!isCancelled && !isDelivered && (
              <button
                onClick={() => handleAction('cancelar')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'cancelar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6">
        {/* Status stepper */}
        {!isCancelled && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              {STEPPER_STEPS.map((step, i) => {
                const stepLabel = STATUS_LABELS[step] ?? step;
                const isCompleted = activeStepIndex >= i;
                const isCurrent = activeStepIndex === i;
                return (
                  <React.Fragment key={step}>
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCurrent ? 'bg-success text-success-foreground ring-2 ring-green-200' : isCompleted ? 'bg-success text-success-foreground' : 'bg-gray-200 text-gray-500'}`}>
                        {isCompleted ? '\u2713' : i + 1}
                      </div>
                      <span className={`text-xs ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                        {stepLabel}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products table */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium">{t('codeCol')}</th>
                      <th className="pb-3 font-medium">{t('productCol')}</th>
                      <th className="pb-3 font-medium text-right">{t('quantityCol')}</th>
                      <th className="pb-3 font-medium text-right">{t('unitPriceCol')}</th>
                      <th className="pb-3 font-medium text-right">{t('discountCol')}</th>
                      <th className="pb-3 font-medium text-right">{t('subtotalCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.detalles.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-500 font-mono text-xs">{item.productoCodigo}</td>
                        <td className="py-3 text-gray-900">{item.productoNombre}</td>
                        <td className="py-3 text-right text-gray-900">{item.cantidad}</td>
                        <td className="py-3 text-right text-gray-900">{formatCurrency(item.precioUnitario)}</td>
                        <td className="py-3 text-right text-gray-500">{item.descuento > 0 ? formatCurrency(item.descuento) : '-'}</td>
                        <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('summary')}</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('subtotalLabel')}</span>
                  <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.descuento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('discountLabel')}</span>
                    <span className="text-red-600">-{formatCurrency(order.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('ivaLabel')}</span>
                  <span className="text-gray-900">{formatCurrency(order.impuestos)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-base font-semibold text-gray-900">{t('totalLabel')}</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(order.notas || order.notasInternas) && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('notesTitle')}</h2>
                {order.notas && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('orderNotes')}</p>
                    <p className="text-sm text-gray-700">{order.notas}</p>
                  </div>
                )}
                {order.notasInternas && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('internalNotes')}</p>
                    <p className="text-sm text-gray-700">{order.notasInternas}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column: 1/3 */}
          <div className="space-y-6">
            {/* Client info */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('clientTitle')}</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{order.clienteNombre}</p>
                {order.clienteDireccion && (
                  <p className="text-gray-500">{order.clienteDireccion}</p>
                )}
              </div>
            </div>

            {/* Order metadata */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orderInfoTitle')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('dateLabel')}</span>
                  <span className="text-gray-900">{formatDate(order.fechaPedido)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('vendorLabel')}</span>
                  <span className="text-gray-900">{order.usuarioNombre}</span>
                </div>
                {order.fechaEntregaEstimada && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('estimatedDelivery')}</span>
                    <span className="text-gray-900">{formatDate(order.fechaEntregaEstimada)}</span>
                  </div>
                )}
                {order.fechaEntregaReal && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('actualDelivery')}</span>
                    <span className="text-gray-900">{formatDate(order.fechaEntregaReal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('createdLabel')}</span>
                  <span className="text-gray-900">{formatDate(order.creadoEn)}</span>
                </div>
                {order.actualizadoEn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('updatedLabel')}</span>
                    <span className="text-gray-900">{formatDate(order.actualizadoEn)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
