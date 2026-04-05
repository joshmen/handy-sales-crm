'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { clientService } from '@/services/api/clients';
import { orderService, type OrderListItem } from '@/services/api/orders';
import type { Client } from '@/types';
import { toast } from '@/hooks/useToast';

// ── Helpers ──

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE:      { label: 'Borrador',   color: 'text-gray-700',  bg: 'bg-gray-100' },
  CONFIRMADA:     { label: 'Confirmado', color: 'text-blue-700',  bg: 'bg-blue-100' },
  EN_PREPARACION: { label: 'En prep.',   color: 'text-indigo-700', bg: 'bg-indigo-100' },
  LISTA_ENVIO:    { label: 'Lista env.', color: 'text-purple-700', bg: 'bg-purple-100' },
  ENVIADA:        { label: 'En ruta',    color: 'text-amber-700', bg: 'bg-amber-100' },
  ENTREGADA:      { label: 'Entregado',  color: 'text-green-700', bg: 'bg-green-100' },
  CANCELADA:      { label: 'Cancelado',  color: 'text-red-700',   bg: 'bg-red-100' },
};

type Tab = 'pedidos' | 'info';

// ── Page ──

export default function ClientDetailPage() {
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
      toast.error('No se pudo cargar el cliente');
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
          <span className="text-gray-600">Cargando cliente...</span>
        </div>
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente no encontrado</h2>
          <p className="text-gray-600 mb-4">El cliente que buscas no existe o no tienes acceso.</p>
          <button onClick={() => router.push('/clients')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Volver a clientes
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
      <div className="bg-white px-4 sm:px-8 py-4 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Clientes', href: '/clients' },
          { label: client.name },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-900">{client.name}</h1>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${client.isActive ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
              {client.isActive ? 'Activo' : 'Inactivo'}
            </span>
            {client.esProspecto && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100">
                Prospecto
              </span>
            )}
          </div>

          <Link
            href={`/clients/${clientId}/edit`}
            className="flex items-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Total pedidos</p>
            <p className="text-2xl font-bold text-gray-900">{totalPedidos}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Total ventas</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVentas)}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Pedidos pendientes</p>
            <p className="text-2xl font-bold text-gray-900">{pedidosPendientes}</p>
          </div>
        </div>

        {/* Client info card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacion del cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">RFC</span>
              <span className="text-gray-900 font-mono">{client.code || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Telefono</span>
              <span className="text-gray-900">{client.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{client.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Encargado</span>
              <span className="text-gray-900">{client.encargado || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Direccion</span>
              <span className="text-gray-900 text-right max-w-[200px]">{client.address || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Zona</span>
              <span className="text-gray-900">{client.zoneName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categoria</span>
              <span className="text-gray-900">{client.categoryName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saldo</span>
              <span className="text-gray-900">{formatCurrency(client.saldo ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Limite de credito</span>
              <span className="text-gray-900">{formatCurrency(client.limiteCredito ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dias de credito</span>
              <span className="text-gray-900">{client.diasCredito ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Fiscal data section */}
        {client.facturable && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos fiscales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">RFC</span>
                <span className="text-gray-900 font-mono">{client.code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Razon social</span>
                <span className="text-gray-900">{client.razonSocial || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Regimen fiscal</span>
                <span className="text-gray-900">{client.regimenFiscal || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">C.P. Fiscal</span>
                <span className="text-gray-900">{client.codigoPostalFiscal || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uso CFDI predeterminado</span>
                <span className="text-gray-900">{client.usoCFDIPredeterminado || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              {([
                { key: 'pedidos' as Tab, label: 'Pedidos' },
                { key: 'info' as Tab, label: 'Comentarios' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  <p className="text-center text-gray-400 py-8">Sin pedidos registrados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-3 font-medium">Numero</th>
                          <th className="pb-3 font-medium">Fecha</th>
                          <th className="pb-3 font-medium">Estado</th>
                          <th className="pb-3 font-medium">Vendedor</th>
                          <th className="pb-3 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const cfg = ORDER_STATUS_LABELS[order.estado] ?? { label: order.estado, color: 'text-gray-700', bg: 'bg-gray-100' };
                          return (
                            <tr
                              key={order.id}
                              className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <td className="py-3 font-mono text-xs text-blue-600 hover:underline">{order.numeroPedido}</td>
                              <td className="py-3 text-gray-900">{formatDate(order.fechaPedido)}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="py-3 text-gray-500">{order.usuarioNombre}</td>
                              <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(order.total)}</td>
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
              <div className="text-sm text-gray-700">
                {client.comentarios ? (
                  <p>{client.comentarios}</p>
                ) : (
                  <p className="text-gray-400">Sin comentarios</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
