'use client';

// =============================================================================
// Centro de ayuda.
// PRESENTACIÓN, PENDIENTE BACKEND: la pantalla usa datos mock de `./_mock`.
// Las acciones (abrir categoría, ver estado, contactar soporte) muestran un
// toast de "próximamente" hasta que exista el backend del centro de ayuda.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import {
  LifeBuoy,
  Search,
  SearchX,
  Rocket,
  ShoppingCart,
  CreditCard,
  Box,
  Receipt,
  Route,
  Users,
  BarChart3,
  Activity,
  Keyboard,
  Phone,
  Mail,
  HelpCircle,
} from 'lucide-react';
import {
  HELP_CATEGORIES,
  POPULAR_QUESTIONS,
  CHANGELOG,
  SYSTEM_SERVICES,
  SHORTCUTS,
} from './_mock';

// Mapa de la clave de icono (mock) al componente Lucide.
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  rocket: Rocket,
  cart: ShoppingCart,
  card: CreditCard,
  box: Box,
  receipt: Receipt,
  route: Route,
  users: Users,
  chart: BarChart3,
};

const CARD = 'rounded-2xl border border-border bg-card p-5 shadow-sm';

export default function AyudaPage() {
  const t = useTranslations('help');
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_CATEGORIES;
    return HELP_CATEGORIES.filter((c) => c.title.toLowerCase().includes(q));
  }, [query]);

  const comingSoon = (label: string) => toast.success(t('comingSoon', { label }));

  return (
    <PageHeader
      section="navegacion"
      icon={LifeBuoy}
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Ayuda' },
      ]}
      title="Centro de ayuda"
      subtitle="Encuentra guías, novedades y soporte para Handy Sales."
    >
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
        {/* ---------- Columna principal ---------- */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Hero de búsqueda */}
          <section className={CARD}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="¿En qué te ayudamos?"
                className="w-full h-12 pl-12 pr-4 text-base rounded-xl border border-border bg-surface-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {POPULAR_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="px-3 py-1.5 rounded-full border border-border bg-surface-1 text-[13px] text-foreground hover:bg-surface-3 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>

          {/* Explorar por tema */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Explorar por tema</h2>
            {filteredCategories.length === 0 ? (
              <div className={CARD}>
                <EmptyState
                  icon={SearchX}
                  title="Sin resultados"
                  description="No encontramos temas para tu búsqueda."
                  size="sm"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCategories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] ?? HelpCircle;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => comingSoon(cat.title)}
                      className="text-left rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-border-strong hover:shadow-elevation-1 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Icon size={20} />
                      </div>
                      <div className="font-semibold text-foreground leading-tight">{cat.title}</div>
                      <div className="text-[13px] text-muted-foreground mt-0.5">
                        {cat.count} artículos
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Novedades */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Novedades</h2>
            <div className={`${CARD} divide-y divide-border`}>
              {CHANGELOG.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-shrink-0 pt-0.5">
                    {item.type === 'nuevo' ? (
                      <SoftBadge tone="success">Nuevo</SoftBadge>
                    ) : (
                      <SoftBadge tone="info">Mejora</SoftBadge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] text-muted-foreground">{item.date}</span>
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---------- Aside ---------- */}
        <aside className="lg:w-[300px] lg:flex-shrink-0 space-y-6">
          {/* Estado del sistema */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Estado del sistema</h3>
            </div>
            <ul className="space-y-2.5">
              {SYSTEM_SERVICES.map((svc) => (
                <li key={svc.name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{svc.name}</span>
                  {svc.status === 'operativo' ? (
                    <SoftBadge tone="success">Operativo</SoftBadge>
                  ) : (
                    <SoftBadge tone="warning">Degradado</SoftBadge>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Button
                variant="wbOutline"
                size="sm"
                className="w-full"
                onClick={() => comingSoon('página de estado')}
              >
                Ver página de estado
              </Button>
            </div>
          </div>

          {/* Atajos de teclado */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard size={18} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Atajos de teclado</h3>
            </div>
            <ul className="space-y-2.5">
              {SHORTCUTS.map((sc) => (
                <li key={sc.desc} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{sc.desc}</span>
                  <span className="flex items-center gap-1">
                    {sc.keys.map((k, i) => (
                      <React.Fragment key={k}>
                        {i > 0 && <span className="text-[11px] text-muted-foreground">+</span>}
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-[11px] font-mono border border-border">
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto a soporte */}
          <div className={CARD}>
            <h3 className="font-semibold text-foreground">¿Necesitas más ayuda?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nuestro equipo de soporte está listo para ayudarte.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="wbOutline"
                size="sm"
                className="w-full"
                onClick={() => toast.success(t('comingSoonCall'))}
              >
                <Phone size={15} className="mr-2" />
                Llamar
              </Button>
              <Button
                variant="wbPrimary"
                size="sm"
                className="w-full"
                onClick={() => toast.success(t('comingSoonWrite'))}
              >
                <Mail size={15} className="mr-2" />
                Escribir
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </PageHeader>
  );
}
