'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { clientService } from '@/services/api/clients';
import { productService } from '@/services/api/products';
import { orderService } from '@/services/api/orders';
import type { Client, Product } from '@/types';
import type { OrderListItem } from '@/services/api/orders';
import {
  Search,
  Users,
  Package,
  Plus,
  BarChart3,
  Settings,
  ArrowRight,
  FileText,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResults {
  clients: Client[];
  products: Product[];
  orders: OrderListItem[];
}

const groupHeadingCls = "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";
const itemCls = "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground";

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const t = useTranslations('commandPalette');
  const tc = useTranslations('common');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ clients: [], products: [], orders: [] });
  const debouncedQuery = useDebounce(query, 300);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ clients: [], products: [], orders: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const search = async () => {
      try {
        const [clientsRes, productsRes, ordersRes] = await Promise.allSettled([
          clientService.getClients({ search: debouncedQuery, limit: 5 }),
          productService.getProducts({ search: debouncedQuery, limit: 5 }),
          orderService.getOrders({ busqueda: debouncedQuery, pageSize: 5 }),
        ]);

        if (cancelled) return;

        setResults({
          clients: clientsRes.status === 'fulfilled' ? clientsRes.value.clients : [],
          products: productsRes.status === 'fulfilled' ? productsRes.value.products : [],
          orders: ordersRes.status === 'fulfilled' ? ordersRes.value.items : [],
        });
      } catch {
        // silently fail — partial results are fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ clients: [], products: [], orders: [] });
      setLoading(false);
    }
  }, [open]);

  const navigate = useCallback((path: string) => {
    onOpenChange(false);
    router.push(path);
  }, [onOpenChange, router]);

  const hasResults = results.clients.length > 0 || results.products.length > 0 || results.orders.length > 0;
  const showQuickActions = !debouncedQuery || debouncedQuery.length < 2;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={tc('search')}
      shouldFilter={false}
      overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
      contentClassName="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101] bg-card border border-border rounded-xl shadow-2xl overflow-hidden focus:outline-none"
    >
      {/* Input */}
      <div className="flex items-center border-b border-border px-4">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t('searchPlaceholder')}
          className="flex-1 h-12 px-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />}
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
          ESC
        </kbd>
      </div>

      {/* Results */}
      <Command.List className="max-h-[320px] overflow-y-auto p-2">
        {/* Loading skeleton */}
        {loading && !hasResults && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state after search */}
        {!loading && debouncedQuery && debouncedQuery.length >= 2 && !hasResults && (
          <Command.Empty className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {tc('noResultsFor', { query: debouncedQuery })}
            </p>
          </Command.Empty>
        )}

        {/* Quick actions (empty state) */}
        {showQuickActions && !loading && (
          <Command.Group heading={t('quickActions')} className={groupHeadingCls}>
            <Command.Item value="nuevo-pedido" onSelect={() => navigate('/orders')} className={itemCls}>
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-950/40">
                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span>{t('newOrder')}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            </Command.Item>
            <Command.Item value="nuevo-cliente" onSelect={() => navigate('/clients/new')} className={itemCls}>
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span>{t('newClient')}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            </Command.Item>
            <Command.Item value="nuevo-producto" onSelect={() => navigate('/products')} className={itemCls}>
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span>{t('newProduct')}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            </Command.Item>
            <Command.Item value="ir-a-reportes" onSelect={() => navigate('/reports')} className={itemCls}>
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/40">
                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span>{t('goToReports')}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            </Command.Item>
            <Command.Item value="ir-a-configuracion" onSelect={() => navigate('/settings')} className={itemCls}>
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-surface-3 dark:bg-surface-3">
                <Settings className="h-4 w-4 text-foreground/70 dark:text-muted-foreground" />
              </div>
              <span>{t('goToSettings')}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            </Command.Item>
          </Command.Group>
        )}

        {/* Clients results */}
        {results.clients.length > 0 && (
          <Command.Group heading={t('clients')} className={groupHeadingCls}>
            {results.clients.map(client => (
              <Command.Item
                key={`client-${client.id}`}
                value={`client-${client.id}-${client.name}`}
                onSelect={() => navigate(`/clients/${client.id}/edit`)}
                className={itemCls}
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.email || client.phone || client.code}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Products results */}
        {results.products.length > 0 && (
          <Command.Group heading={t('products')} className={groupHeadingCls}>
            {results.products.map(product => (
              <Command.Item
                key={`product-${product.id}`}
                value={`product-${product.id}-${product.name}`}
                onSelect={() => navigate('/products')}
                className={itemCls}
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {product.code} · {formatCurrency(product.price)}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Orders results */}
        {results.orders.length > 0 && (
          <Command.Group heading={t('orders')} className={groupHeadingCls}>
            {results.orders.map(order => (
              <Command.Item
                key={`order-${order.id}`}
                value={`order-${order.id}-${order.numeroPedido}`}
                onSelect={() => navigate('/orders')}
                className={itemCls}
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-950/40">
                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {order.numeroPedido} — {order.clienteNombre}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatCurrency(order.total)} · {order.estado}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
            {tc('navigate')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">↵</kbd>
            {tc('open')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">esc</kbd>
            {tc('close')}
          </span>
        </div>
      </div>
    </Command.Dialog>
  );
};

export default CommandPalette;
