'use client';

// CommandPalette — port fiel del `Topbar` (web-shell.jsx) de Handy Sales.
// Es un command palette INLINE (dropdown bajo el input del topbar), no un modal
// centrado. Navega de verdad al recurso (cliente/pedido/producto/empresa) por su
// id real, vía los servicios de búsqueda del backend. Respeta permisos por rol.

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { clientService } from '@/services/api/clients';
import { productService } from '@/services/api/products';
import { orderService } from '@/services/api/orders';
import { tenantService } from '@/services/api/tenants';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import type { Client, Product } from '@/types';
import type { OrderListItem } from '@/services/api/orders';
import type { Tenant } from '@/types/tenant';
import {
  Search, X, ChevronRight, Plus, LayoutGrid, Compass, ShoppingCart, Wallet,
  Banknote, Users, UsersRound, Tag, Tags, Package, Folder, Scale, Percent, Gift,
  Route, Layers, MapPin, BarChart3, Target, Zap, Activity, Receipt, CreditCard,
  Plug, Settings, Bot, LifeBuoy, Building2, Megaphone, Bug, Hash,
  type LucideIcon,
} from 'lucide-react';

// ── Registro de iconos (claves string → lucide; serializable para Recientes) ──
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid, 'getting-started': Compass, orders: ShoppingCart, cobranza: Wallet,
  gastos: Banknote, clients: Users, 'client-categories': Tag, products: Package,
  'product-families': Folder, 'product-categories': Tags, units: Scale, 'price-lists': Tag,
  discounts: Percent, promotions: Gift, routes: Route, inventory: Layers, zones: MapPin,
  visits: MapPin, reports: BarChart3, metas: Target, automations: Zap, team: UsersRound,
  'activity-logs': Activity, billing: Receipt, subscription: CreditCard, integrations: Plug,
  settings: Settings, ai: Bot, ayuda: LifeBuoy,
  tenants: Building2, 'global-users': Users, announcements: Megaphone, plans: CreditCard,
  cupones: Tags, finkok: Receipt, 'crash-reports': Bug, 'global-settings': Settings,
  // entidades + genéricos
  page: Hash, action: Plus, client: Users, order: ShoppingCart, product: Package, tenant: Building2,
};

// ── Índice de páginas (rutas reales del app, por sección + permiso) ──
interface PageEntry { id: string; label: string; route: string; section: string; icon: string; perm?: string }

const PAGES_REGULAR: PageEntry[] = [
  { id: 'dashboard', label: 'Tablero', route: '/dashboard', section: 'General', icon: 'dashboard', perm: 'view_dashboard' },
  { id: 'getting-started', label: 'Primeros pasos', route: '/getting-started', section: 'General', icon: 'getting-started', perm: 'view_company_settings' },
  { id: 'orders', label: 'Pedidos', route: '/orders', section: 'Ventas', icon: 'orders', perm: 'view_orders' },
  { id: 'cobranza', label: 'Cobranza', route: '/cobranza', section: 'Ventas', icon: 'cobranza', perm: 'view_orders' },
  { id: 'gastos', label: 'Gastos', route: '/gastos', section: 'Ventas', icon: 'gastos', perm: 'manage_billing' },
  { id: 'clients', label: 'Clientes', route: '/clients', section: 'Catálogo', icon: 'clients', perm: 'view_clients' },
  { id: 'client-categories', label: 'Categorías de clientes', route: '/client-categories', section: 'Catálogo', icon: 'client-categories', perm: 'manage_catalogs' },
  { id: 'products', label: 'Productos', route: '/products', section: 'Catálogo', icon: 'products', perm: 'view_products' },
  { id: 'product-families', label: 'Familias de productos', route: '/product-families', section: 'Catálogo', icon: 'product-families', perm: 'view_products' },
  { id: 'product-categories', label: 'Categorías de productos', route: '/product-categories', section: 'Catálogo', icon: 'product-categories', perm: 'manage_catalogs' },
  { id: 'units', label: 'Unidades de medida', route: '/units', section: 'Catálogo', icon: 'units', perm: 'manage_catalogs' },
  { id: 'price-lists', label: 'Listas de precios', route: '/price-lists', section: 'Catálogo', icon: 'price-lists', perm: 'view_products' },
  { id: 'discounts', label: 'Descuentos', route: '/discounts', section: 'Catálogo', icon: 'discounts', perm: 'view_discounts' },
  { id: 'promotions', label: 'Promociones', route: '/promotions', section: 'Catálogo', icon: 'promotions', perm: 'view_promotions' },
  { id: 'routes', label: 'Rutas', route: '/routes', section: 'Operación', icon: 'routes', perm: 'view_routes' },
  { id: 'inventory', label: 'Inventario', route: '/inventory', section: 'Operación', icon: 'inventory', perm: 'view_inventory' },
  { id: 'zones', label: 'Zonas', route: '/zones', section: 'Operación', icon: 'zones', perm: 'view_zones' },
  { id: 'visits', label: 'Visitas', route: '/visits', section: 'Operación', icon: 'visits', perm: 'view_visits' },
  { id: 'reports', label: 'Reportes', route: '/reports', section: 'Herramientas', icon: 'reports', perm: 'view_reports' },
  { id: 'metas', label: 'Metas', route: '/metas', section: 'Herramientas', icon: 'metas', perm: 'view_metas' },
  { id: 'automations', label: 'Automatizaciones', route: '/automations', section: 'Herramientas', icon: 'automations', perm: 'view_automations' },
  { id: 'team', label: 'Equipo', route: '/team', section: 'Equipo', icon: 'team', perm: 'view_team' },
  { id: 'activity-logs', label: 'Registro de actividad', route: '/activity-logs', section: 'Equipo', icon: 'activity-logs', perm: 'view_activity_logs' },
  { id: 'billing', label: 'Facturación', route: '/billing', section: 'Empresa', icon: 'billing', perm: 'manage_billing' },
  { id: 'subscription', label: 'Suscripción', route: '/subscription', section: 'Empresa', icon: 'subscription', perm: 'view_settings' },
  { id: 'integrations', label: 'Integraciones', route: '/integrations', section: 'Empresa', icon: 'integrations', perm: 'view_company_settings' },
  { id: 'settings', label: 'Configuración', route: '/settings', section: 'Empresa', icon: 'settings', perm: 'view_company_settings' },
  { id: 'ai', label: 'Asistente IA', route: '/ai', section: 'Empresa', icon: 'ai', perm: 'view_automations' },
  { id: 'ayuda', label: 'Ayuda', route: '/ayuda', section: 'General', icon: 'ayuda', perm: 'view_dashboard' },
];

const PAGES_SUPER: PageEntry[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/admin/system-dashboard', section: 'Administración', icon: 'dashboard' },
  { id: 'tenants', label: 'Empresas', route: '/admin/tenants', section: 'Plataforma', icon: 'tenants' },
  { id: 'global-users', label: 'Usuarios Global', route: '/admin/global-users', section: 'Plataforma', icon: 'global-users' },
  { id: 'announcements', label: 'Anuncios', route: '/admin/announcements', section: 'Plataforma', icon: 'announcements' },
  { id: 'plans', label: 'Planes', route: '/admin/subscription-plans', section: 'Plataforma', icon: 'plans' },
  { id: 'cupones', label: 'Cupones', route: '/admin/cupones', section: 'Plataforma', icon: 'cupones' },
  { id: 'finkok', label: 'Integración Finkok', route: '/admin/finkok', section: 'Sistema', icon: 'finkok' },
  { id: 'crash-reports', label: 'Monitor de Errores', route: '/admin/crash-reports', section: 'Sistema', icon: 'crash-reports' },
  { id: 'activity-logs', label: 'Registro de actividad', route: '/activity-logs', section: 'Sistema', icon: 'activity-logs' },
  { id: 'global-settings', label: 'Configuración', route: '/global-settings', section: 'Sistema', icon: 'global-settings' },
];

// ── Recientes persistidos (páginas abiertas desde el palette) ──
const SEARCH_RECENT_KEY = 'handy_web_recent_search';
interface RecentItem { id: string; label: string; section: string; icon: string; route: string }
function loadRecents(): RecentItem[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecent(item: RecentItem) {
  try {
    const cur = loadRecents().filter((r) => r.id !== item.id);
    cur.unshift({ id: item.id, label: item.label, section: item.section, icon: item.icon, route: item.route });
    localStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(cur.slice(0, 4)));
  } catch { /* localStorage no disponible */ }
}

// ── Resalta la subcadena coincidente dentro del label ──
function hlMatch(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="cmdk-mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

// ── CSS portado de CMDK_CSS + .web-search (web-styles.css). Las refs de color
// del prototipo (var(--card-2), var(--text-4), var(--danger)…) se mapean a los
// tokens del app vía hsl(var(--token)) — mismos colores, respeta primario por
// empresa y dark mode. Tokens nuevos: --text-4 (globals.css). ──
const CMDK_CSS = `
.cmdk-wrap { position: relative; flex: 0 1 380px; min-width: 0; }
.web-search.cmdk-box {
  display: flex; align-items: center; gap: 9px;
  background: hsl(var(--surface-3)); border-radius: 11px;
  padding: 9px 13px; width: 100%; color: hsl(var(--muted-foreground)); font-size: 13px;
  border: 1px solid transparent; transition: box-shadow .15s, border-color .15s;
}
.web-search.cmdk-box > svg { flex: 0 0 auto; }
.cmdk-wrap.open .web-search.cmdk-box { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.14); }
.cmdk-input { flex: 1; border: none; background: transparent; outline: none; font-size: 13.5px; color: hsl(var(--foreground)); font-family: inherit; min-width: 0; }
.cmdk-input::placeholder { color: hsl(var(--text-4)); }
.cmdk-kbd { font-size: 11px; padding: 2px 6px; border-radius: 6px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); color: hsl(var(--text-4)); cursor: pointer; user-select: none; flex: 0 0 auto; }
.cmdk-kbd:hover { color: hsl(var(--foreground)); border-color: hsl(var(--border-strong)); }
.cmdk-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: none; border-radius: 6px; background: transparent; color: hsl(var(--text-4)); cursor: pointer; flex: 0 0 auto; }
.cmdk-clear:hover { background: hsl(var(--surface-3)); color: hsl(var(--foreground)); }
.cmdk-panel { position: absolute; top: calc(100% + 8px); left: 0; right: 0; min-width: 380px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 14px; box-shadow: 0 20px 50px rgba(11,20,48,0.20); overflow: hidden; z-index: 60; animation: cmdk-in .14s ease; }
@keyframes cmdk-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.cmdk-scroll { max-height: 380px; overflow-y: auto; padding: 6px; }
.cmdk-group { padding: 4px 0; }
.cmdk-group + .cmdk-group { border-top: 1px solid hsl(var(--border)); margin-top: 2px; padding-top: 6px; }
.cmdk-group-title { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: hsl(var(--text-4)); padding: 4px 10px 6px; }
.cmdk-row { display: flex; align-items: center; gap: 11px; padding: 8px 10px; border-radius: 9px; cursor: pointer; }
.cmdk-row.active { background: hsl(var(--surface-3)); }
.cmdk-ic { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 8px; background: hsl(var(--surface-3)); color: hsl(var(--foreground)); display: flex; align-items: center; justify-content: center; }
.cmdk-row.active .cmdk-ic { background: hsl(var(--card)); }
.cmdk-ic.action { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); }
.cmdk-text { flex: 1; min-width: 0; }
.cmdk-label { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmdk-mark { background: hsl(var(--primary) / 0.2); color: hsl(var(--foreground)); border-radius: 3px; padding: 0 1px; }
.cmdk-sec { font-size: 11px; color: hsl(var(--text-4)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmdk-go { color: hsl(var(--text-4)); opacity: 0; transition: opacity .12s; flex: 0 0 auto; }
.cmdk-row.active .cmdk-go { opacity: 1; }
.cmdk-tag { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: hsl(var(--primary)); background: hsl(var(--primary) / 0.11); padding: 3px 7px; border-radius: 999px; flex: 0 0 auto; }
.cmdk-empty { padding: 26px 16px; text-align: center; color: hsl(var(--muted-foreground)); }
.cmdk-empty > svg { color: hsl(var(--text-4)); margin: 0 auto 8px; display: block; }
.cmdk-empty > div { font-size: 13.5px; font-weight: 600; color: hsl(var(--foreground)); }
.cmdk-empty > span { display: block; font-size: 12px; color: hsl(var(--text-4)); margin-top: 3px; }
.cmdk-foot { display: flex; gap: 16px; align-items: center; padding: 8px 14px; border-top: 1px solid hsl(var(--border)); background: hsl(var(--surface-3)); }
.cmdk-foot span { font-size: 11px; color: hsl(var(--text-4)); display: inline-flex; align-items: center; gap: 4px; }
.cmdk-foot kbd { font-family: inherit; font-size: 10px; min-width: 16px; text-align: center; padding: 1px 4px; border-radius: 4px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); }
@media (max-width: 720px) { .cmdk-wrap { flex: 1; } .cmdk-panel { min-width: 0; } }
`;

interface Row {
  id: string;
  label: string;
  sub?: string;
  section?: string;
  icon: string;
  type: 'page' | 'action' | 'client' | 'order' | 'product' | 'tenant';
  run: () => void;
}

export interface CommandPaletteProps {
  /** Rol del usuario actual (SUPER_ADMIN, ADMIN, SUPERVISOR, VENDEDOR…). */
  role: string;
  /**
   * Dispara la acción "nuevo pedido" (acción rápida del palette + botón del
   * topbar). En el Header navega a `/orders?new=1`, que abre el drawer de nuevo
   * pedido en la página de Pedidos.
   */
  onNewOrder: () => void;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

export const CommandPalette: React.FC<CommandPaletteProps> = ({ role, onNewOrder }) => {
  const router = useRouter();
  const isSuper = role === 'SUPER_ADMIN';

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState(0);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [ent, setEnt] = useState<{ clients: Client[]; products: Product[]; orders: OrderListItem[]; tenants: Tenant[] }>({
    clients: [], products: [], orders: [], tenants: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  // Cache del catálogo completo de empresas (Super Admin): el endpoint no acepta
  // búsqueda, así que traemos la lista UNA vez y filtramos client-side por
  // tecleo (evita re-fetch + carrera en cada keystroke).
  const tenantsCacheRef = useRef<Tenant[] | null>(null);
  const debounced = useDebounce(q, 200);

  // Recientes (client-only).
  useEffect(() => { setRecents(loadRecents()); }, []);

  const pages = useMemo<PageEntry[]>(() => {
    if (isSuper) return PAGES_SUPER;
    const perms = ROLE_PERMISSIONS[role] || [];
    return PAGES_REGULAR.filter((p) => !p.perm || perms.includes(p.perm));
  }, [isSuper, role]);

  const close = useCallback(() => { setOpen(false); setQ(''); inputRef.current?.blur(); }, []);
  const navigateTo = useCallback((route: string) => { close(); router.push(route); }, [close, router]);

  const pageRows = useMemo<Row[]>(() => pages.map((p) => ({
    id: 'page-' + p.id, label: p.label, section: p.section, icon: p.icon, type: 'page',
    run: () => {
      const rec: RecentItem = { id: 'page-' + p.id, label: p.label, section: p.section, icon: p.icon, route: p.route };
      pushRecent(rec); setRecents(loadRecents()); navigateTo(p.route);
    },
  })), [pages, navigateTo]);

  const actionRows = useMemo<Row[]>(() => isSuper ? [] : [{
    id: 'act-order', label: 'Crear nuevo pedido', section: 'Acción', icon: 'action', type: 'action',
    run: () => { close(); onNewOrder(); },
  }], [isSuper, onNewOrder, close]);

  const suggestionRows = useMemo<Row[]>(() => {
    const want = isSuper ? ['dashboard', 'tenants', 'crash-reports'] : ['dashboard', 'orders', 'cobranza', 'reports'];
    return want.map((id) => pageRows.find((r) => r.id === 'page-' + id)).filter(Boolean) as Row[];
  }, [isSuper, pageRows]);

  // ── Búsqueda de entidades en vivo (debounce 200ms + AbortController) ──
  useEffect(() => {
    const ql = debounced.trim();
    if (ql.length < 1) { setEnt({ clients: [], products: [], orders: [], tenants: [] }); return; }
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        if (isSuper) {
          let all = tenantsCacheRef.current;
          if (!all) {
            all = await tenantService.getAll(signal).catch(() => [] as Tenant[]);
            if (signal.aborted) return;
            tenantsCacheRef.current = all;
          }
          const needle = ql.toLowerCase();
          const tenants = all
            .filter((t) => t.nombreEmpresa?.toLowerCase().includes(needle) || t.identificadorFiscal?.toLowerCase().includes(needle))
            .slice(0, 5);
          if (!signal.aborted) setEnt({ clients: [], products: [], orders: [], tenants });
        } else {
          const [c, p, o] = await Promise.allSettled([
            clientService.getClients({ search: ql, limit: 5, signal }),
            productService.getProducts({ search: ql, limit: 5, signal }),
            orderService.getOrders({ busqueda: ql, pageSize: 5, signal }),
          ]);
          if (signal.aborted) return;
          setEnt({
            clients: c.status === 'fulfilled' ? c.value.clients : [],
            products: p.status === 'fulfilled' ? p.value.products : [],
            orders: o.status === 'fulfilled' ? o.value.items : [],
            tenants: [],
          });
        }
      } catch { /* parciales OK */ }
    })();
    return () => controller.abort();
  }, [debounced, isSuper]);

  const ql = q.trim().toLowerCase();

  // Grupos de entidades (solo con texto).
  const entityGroups = useMemo<{ title: string; items: Row[] }[]>(() => {
    if (!ql) return [];
    if (isSuper) {
      if (!ent.tenants.length) return [];
      return [{
        title: 'Empresas',
        items: ent.tenants.map((t) => ({
          id: 'tenant-' + t.id, label: t.nombreEmpresa, icon: 'tenant', type: 'tenant',
          sub: [t.planTipo, t.usuarioCount != null ? `${t.usuarioCount} usuarios` : null].filter(Boolean).join(' · '),
          run: () => navigateTo('/admin/tenants/' + t.id),
        })),
      }];
    }
    const g: { title: string; items: Row[] }[] = [];
    if (ent.clients.length) g.push({
      title: 'Clientes',
      items: ent.clients.map((c) => ({
        id: 'client-' + c.id, label: c.name, icon: 'client', type: 'client',
        sub: c.email || c.phone || c.code, run: () => navigateTo('/clients/' + c.id),
      })),
    });
    if (ent.orders.length) g.push({
      title: 'Pedidos',
      items: ent.orders.map((o) => ({
        id: 'order-' + o.id, label: o.numeroPedido, icon: 'order', type: 'order',
        sub: `${o.clienteNombre} · ${fmtMoney(o.total)}`, run: () => navigateTo('/orders/' + o.id),
      })),
    });
    if (ent.products.length) g.push({
      title: 'Productos',
      items: ent.products.map((p) => ({
        id: 'product-' + p.id, label: p.name, icon: 'product', type: 'product',
        sub: `${p.code} · ${fmtMoney(p.price)}`, run: () => navigateTo('/products?edit=' + p.id),
      })),
    });
    return g;
  }, [ql, isSuper, ent, navigateTo]);

  const matchActions = ql ? actionRows.filter((a) => a.label.toLowerCase().includes(ql)) : [];
  const matchPages = ql
    ? pageRows.filter((r) => r.label.toLowerCase().includes(ql) || (r.section || '').toLowerCase().includes(ql)).slice(0, 6)
    : [];

  const recentRows = useMemo<Row[]>(() => recents.map((r) => ({
    id: r.id, label: r.label, section: r.section, icon: r.icon, type: 'page',
    run: () => { pushRecent(r); setRecents(loadRecents()); navigateTo(r.route); },
  })), [recents, navigateTo]);

  // Grupos visibles + lista plana para navegación con flechas.
  const groups: { title: string; items: Row[] }[] = [];
  if (ql) {
    if (matchActions.length) groups.push({ title: 'Acciones', items: matchActions });
    if (matchPages.length) groups.push({ title: 'Páginas', items: matchPages });
    entityGroups.forEach((g) => groups.push(g));
  } else {
    if (recentRows.length) groups.push({ title: 'Recientes', items: recentRows });
    if (actionRows.length) groups.push({ title: 'Acciones rápidas', items: actionRows });
    if (suggestionRows.length) groups.push({ title: 'Sugerencias', items: suggestionRows });
  }
  const flat = groups.reduce<Row[]>((a, g) => a.concat(g.items), []);

  // Reinicia el índice activo al cambiar query o abrir.
  useEffect(() => { setAi(0); }, [q, open]);

  // Atajos globales: ⌘K / Ctrl+K y "/" enfocan el palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = (el?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || !!el?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(true); inputRef.current?.focus();
      } else if (e.key === '/' && !typing) {
        e.preventDefault(); setOpen(true); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = (item?: Row) => { if (item) item.run(); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAi((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAi((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(flat[ai]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const activeId = open && flat[ai] ? 'cmdk-row-' + flat[ai].id : undefined;

  return (
    <div className={'cmdk-wrap' + (open ? ' open' : '')} data-tour="search">
      {/* precedence: React 19 hoista + deduplica el <style> (evita inyección doble). */}
      <style precedence="default">{CMDK_CSS}</style>
      <div className="web-search cmdk-box">
        <Search size={16} />
        <input
          ref={inputRef}
          className="cmdk-input"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          onKeyDown={onInputKey}
          placeholder={isSuper ? 'Buscar empresa, usuario, ticket…' : 'Buscar página, cliente, pedido…'}
          aria-label="Buscar"
          role="combobox"
          aria-expanded={open}
          aria-controls="cmdk-listbox"
          aria-activedescendant={activeId}
          aria-autocomplete="list"
        />
        {q
          ? <button type="button" className="cmdk-clear" onMouseDown={(e) => { e.preventDefault(); setQ(''); inputRef.current?.focus(); }} aria-label="Limpiar"><X size={14} /></button>
          : <button type="button" className="cmdk-kbd" onMouseDown={(e) => { e.preventDefault(); setOpen(true); inputRef.current?.focus(); }} aria-label="Abrir búsqueda (Ctrl o ⌘ + K)">⌘K</button>}
      </div>

      {open && (
        <div className="cmdk-panel">
          <div className="cmdk-scroll" id="cmdk-listbox" role="listbox" aria-label="Resultados de búsqueda">
            {flat.length ? groups.map((g) => (
              <div key={g.title} className="cmdk-group">
                <div className="cmdk-group-title">{g.title}</div>
                {g.items.map((r) => {
                  const myIdx = flat.indexOf(r);
                  const Ic = ICONS[r.icon] || ICONS.page;
                  const isAction = r.type === 'action';
                  return (
                    <div
                      key={g.title + '::' + r.id}
                      id={'cmdk-row-' + r.id}
                      role="option"
                      aria-selected={myIdx === ai}
                      className={'cmdk-row' + (myIdx === ai ? ' active' : '')}
                      onMouseEnter={() => setAi(myIdx)}
                      onMouseDown={(e) => { e.preventDefault(); select(r); }}
                    >
                      <div className={'cmdk-ic' + (isAction ? ' action' : '')}><Ic size={15} /></div>
                      <div className="cmdk-text">
                        <div className="cmdk-label">{hlMatch(r.label, ql)}</div>
                        {(r.sub || r.section) && <div className="cmdk-sec">{r.sub || r.section}</div>}
                      </div>
                      {isAction
                        ? <span className="cmdk-tag">Acción</span>
                        : <span className="cmdk-go"><ChevronRight size={14} /></span>}
                    </div>
                  );
                })}
              </div>
            )) : (
              <div className="cmdk-empty">
                <Search size={20} />
                {ql ? (
                  <>
                    <div>Sin coincidencias para “{q}”</div>
                    <span>Prueba con el nombre de una página, cliente o pedido</span>
                  </>
                ) : (
                  <>
                    <div>Escribe para buscar</div>
                    <span>Páginas, clientes, pedidos o productos</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="cmdk-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span><kbd>↵</kbd> abrir</span>
            <span><kbd>esc</kbd> cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandPalette;
