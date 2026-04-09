'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  MapPin,
  Package,
  Archive,
  Tag,
  Buildings,
  Target,
  NavigationArrow,
  CalendarDots,
  Bag,
  CreditCard,
  ChartBar,
  CaretDown,
  CaretRight,
  ArrowRight,
  DeviceMobile,
  Desktop,
  UserCircle,
  ShieldCheck,
} from '@phosphor-icons/react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FlowStep {
  label: string;
  href?: string;           // link to actual page (web)
  mobileOnly?: boolean;    // step only applies to mobile app
  description?: string;    // extra context
}

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  color: string;           // tailwind color token (e.g. 'green')
  hex: string;             // hex for inline styles
  platform: 'web' | 'app' | 'ambos';
  role: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  steps: FlowStep[];
  // Vendedor-friendly overrides
  vendedorTitle?: string;
  vendedorSubtitle?: string;
  vendedorSteps?: FlowStep[];
  hideForVendedor?: boolean;
}

// Phase/step keys map to help.phases.* and help.steps.* in translation files
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPhases(t: (key: string) => string): Phase[] {
  return [
    {
      id: 'setup',
      number: 1,
      title: t('phases.setup.title'),
      subtitle: t('phases.setup.subtitle'),
      color: 'green',
      hex: '#16A34A',
      platform: 'web',
      role: 'Admin',
      icon: Buildings,
      hideForVendedor: true,
      steps: [
        { label: t('steps.createZones'), href: '/zones' },
        { label: t('steps.productCatalog'), href: '/products' },
        { label: t('steps.initialInventory'), href: '/inventory' },
        { label: t('steps.priceLists'), href: '/price-lists' },
        { label: t('steps.registerClients'), href: '/clients' },
        { label: t('steps.sellerGoals'), href: '/metas' },
      ],
    },
    {
      id: 'planning',
      number: 2,
      title: t('phases.planning.title'),
      subtitle: t('phases.planning.subtitle'),
      color: 'indigo',
      hex: '#6366F1',
      platform: 'web',
      role: 'Supervisor',
      icon: NavigationArrow,
      vendedorTitle: t('phases.planning.vendedorTitle'),
      vendedorSubtitle: t('phases.planning.vendedorSubtitle'),
      vendedorSteps: [
        { label: t('steps.viewAssignedRoute'), href: '/routes' },
        { label: t('steps.reviewProducts') },
        { label: t('steps.acceptRoute') },
      ],
      steps: [
        { label: t('steps.createRoute'), href: '/routes' },
        { label: t('steps.addStops'), href: '/routes' },
        { label: t('steps.loadInventory'), href: '/routes' },
        { label: t('steps.assignOrders') },
        { label: t('steps.registerCash') },
      ],
    },
    {
      id: 'execution',
      number: 3,
      title: t('phases.execution.title'),
      subtitle: t('phases.execution.subtitle'),
      color: 'amber',
      hex: '#F59E0B',
      platform: 'app',
      role: 'Vendedor',
      icon: DeviceMobile,
      vendedorTitle: t('phases.execution.vendedorTitle'),
      vendedorSubtitle: t('phases.execution.vendedorSubtitle'),
      vendedorSteps: [
        { label: t('steps.vendedorStartRoute'), mobileOnly: true },
        { label: t('steps.vendedorArriveGps'), mobileOnly: true },
        { label: t('steps.vendedorSell'), mobileOnly: true },
        { label: t('steps.vendedorCollect'), mobileOnly: true },
        { label: t('steps.vendedorPrint'), mobileOnly: true },
        { label: t('steps.vendedorCheckOut'), mobileOnly: true },
      ],
      steps: [
        { label: t('steps.startRoute'), mobileOnly: true },
        { label: t('steps.arriveClient'), mobileOnly: true },
        { label: t('steps.checkIn'), mobileOnly: true },
        { label: t('steps.takeOrder'), mobileOnly: true },
        { label: t('steps.collect'), mobileOnly: true },
        { label: t('steps.checkOut'), mobileOnly: true },
        { label: t('steps.nextStop'), mobileOnly: true },
      ],
    },
    {
      id: 'orders',
      number: 4,
      title: t('phases.orders.title'),
      subtitle: t('phases.orders.subtitle'),
      color: 'blue',
      hex: '#3B82F6',
      platform: 'ambos',
      role: 'Todos',
      icon: Bag,
      vendedorTitle: t('phases.orders.vendedorTitle'),
      vendedorSubtitle: t('phases.orders.vendedorSubtitle'),
      vendedorSteps: [
        { label: t('steps.vendedorRouteSale'), mobileOnly: true },
        { label: t('steps.vendedorPresale'), mobileOnly: true },
        { label: t('steps.viewOrderHistory'), href: '/orders' },
      ],
      steps: [
        {
          label: t('steps.routeSale'),
          description: t('steps.routeSaleDesc'),
        },
        {
          label: t('steps.presale'),
          description: t('steps.presaleDesc'),
        },
        { label: t('steps.manageOrders'), href: '/orders' },
        { label: t('steps.deliveryDiscount') },
        { label: t('steps.cancelOrders'), href: '/orders' },
      ],
    },
    {
      id: 'collections',
      number: 5,
      title: t('phases.collections.title'),
      subtitle: t('phases.collections.subtitle'),
      color: 'violet',
      hex: '#8B5CF6',
      platform: 'ambos',
      role: 'Todos',
      icon: CreditCard,
      vendedorTitle: t('phases.collections.vendedorTitle'),
      vendedorSubtitle: t('phases.collections.vendedorSubtitle'),
      vendedorSteps: [
        { label: t('steps.vendedorPendingClients'), href: '/cobranza' },
        { label: t('steps.vendedorRegisterPayment'), mobileOnly: true },
        { label: t('steps.vendedorPrintReceipt'), mobileOnly: true },
      ],
      steps: [
        { label: t('steps.partialPayments'), href: '/cobranza' },
        { label: t('steps.multiplePayment') },
        { label: t('steps.autoBalance') },
        { label: t('steps.clientStatement'), href: '/cobranza' },
        { label: t('steps.portfolioSummary'), href: '/cobranza' },
      ],
    },
    {
      id: 'closure',
      number: 6,
      title: t('phases.closure.title'),
      subtitle: t('phases.closure.subtitle'),
      color: 'red',
      hex: '#EF4444',
      platform: 'web',
      role: 'Supervisor',
      icon: ChartBar,
      vendedorTitle: t('phases.closure.vendedorTitle'),
      vendedorSubtitle: t('phases.closure.vendedorSubtitle'),
      vendedorSteps: [
        { label: t('steps.vendedorReportReturns'), mobileOnly: true },
        { label: t('steps.vendedorDeliverCash') },
        { label: t('steps.vendedorRouteCompleted') },
      ],
      steps: [
        { label: t('steps.completeRoute'), href: '/routes' },
        { label: t('steps.reconcileInventory'), href: '/routes' },
        { label: t('steps.registerReceivedAmount') },
        { label: t('steps.closeRoute'), href: '/routes' },
        { label: t('steps.generateReports'), href: '/reports' },
      ],
    },
  ];
}

// Color map for dynamic Tailwind classes
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; bgLight: string; dot: string }> = {
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200',  bgLight: 'bg-green-100',  dot: 'bg-green-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', bgLight: 'bg-indigo-100', dot: 'bg-indigo-500' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200',  bgLight: 'bg-amber-100',  dot: 'bg-amber-500' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   bgLight: 'bg-blue-100',   dot: 'bg-blue-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', bgLight: 'bg-violet-100', dot: 'bg-violet-500' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200',    bgLight: 'bg-red-100',    dot: 'bg-red-500' },
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PlatformBadge({ platform, t }: { platform: 'web' | 'app' | 'ambos'; t: (key: string) => string }) {
  if (platform === 'web') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
        <Desktop size={12} weight="bold" /> {t('platformWeb')}
      </span>
    );
  }
  if (platform === 'app') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-400">
        <DeviceMobile size={12} weight="bold" /> {t('platformApp')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400">
      <Desktop size={12} weight="bold" /> {t('platformBoth')}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium dark:bg-gray-800 dark:text-gray-400">
      {role === 'Admin' || role === 'Supervisor' ? <ShieldCheck size={12} /> : <UserCircle size={12} />}
      {role}
    </span>
  );
}

function StepRow({ step, index, phaseColor, t }: { step: FlowStep; index: number; phaseColor: string; t: (key: string) => string }) {
  const colors = COLOR_MAP[phaseColor];
  return (
    <div className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
      <span className={`flex-shrink-0 w-6 h-6 rounded-md ${colors.bg} flex items-center justify-center text-xs font-semibold ${colors.text}`}>
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground">{step.label}</span>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
      </div>
      {step.mobileOnly && (
        <span className="flex-shrink-0 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
          {t('mobileOnly')}
        </span>
      )}
      {step.href && (
        <Link
          href={step.href}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
          style={{ color: colors ? undefined : '#16A34A' }}
        >
          <span className="text-primary">{step.href}</span>
          <ArrowRight size={12} className="text-primary" />
        </Link>
      )}
    </div>
  );
}

function PhaseAccordion({ phase, isVendedor, t }: { phase: Phase; isVendedor: boolean; t: (key: string) => string }) {
  const [open, setOpen] = useState(phase.number === 1 && !isVendedor || phase.number === 3 && isVendedor);
  const colors = COLOR_MAP[phase.color];
  const Icon = phase.icon;

  const title = isVendedor && phase.vendedorTitle ? phase.vendedorTitle : phase.title;
  const subtitle = isVendedor && phase.vendedorSubtitle ? phase.vendedorSubtitle : phase.subtitle;
  const steps = isVendedor && phase.vendedorSteps ? phase.vendedorSteps : phase.steps;

  if (isVendedor && phase.hideForVendedor) return null;

  return (
    <div className={`bg-card rounded-xl border transition-all ${open ? colors.border : 'border-border'}`}>
      {/* Header — clickable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
      >
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${colors.bgLight} flex items-center justify-center`}>
          <Icon size={18} weight="duotone" className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${colors.text}`}>{t('phase')} {phase.number}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <PlatformBadge platform={phase.platform} t={t} />
          <RoleBadge role={phase.role} />
          {open
            ? <CaretDown size={16} className="text-muted-foreground" />
            : <CaretRight size={16} className="text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="mx-5 border-t border-border/50" />}
              <StepRow step={step} index={i} phaseColor={phase.color} t={t} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AyudaPage() {
  const t = useTranslations('help');
  const tc = useTranslations('common');
  const [isVendedor, setIsVendedor] = useState(false);
  const PHASES = buildPhases(t);

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbTools') },
        { label: t('breadcrumbHelp') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setIsVendedor(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isVendedor
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="hidden sm:inline">{t('viewAdminFull').split(' ')[0]} </span>{t('viewAdmin')}
          </button>
          <button
            onClick={() => setIsVendedor(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isVendedor
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="hidden sm:inline">{t('viewSellerFull').split(' ')[0]} </span>{t('viewSeller')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Timeline bar */}
        <div className="flex items-center gap-2 flex-wrap p-3 bg-card rounded-xl border border-border">
          {PHASES.filter(p => !(isVendedor && p.hideForVendedor)).map((phase, i, arr) => {
            const colors = COLOR_MAP[phase.color];
            return (
              <React.Fragment key={phase.id}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} text-xs font-semibold`}>
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {phase.number}. {isVendedor && phase.vendedorTitle ? phase.vendedorTitle : phase.title.split(' ')[0]}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Info box for vendedor */}
        {isVendedor && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>{t('routeSaleLabel')}</strong> {t('routeSaleInfo')}
              <br />
              <strong>{t('presaleLabel')}</strong> {t('presaleInfo')}
            </p>
          </div>
        )}

        {/* Phase accordions */}
        {PHASES.map(phase => (
          <PhaseAccordion key={phase.id} phase={phase} isVendedor={isVendedor} t={t} />
        ))}
      </div>
    </PageHeader>
  );
}
