'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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

const PHASES: Phase[] = [
  {
    id: 'setup',
    number: 1,
    title: 'Configuracion Inicial',
    subtitle: 'Catalogo, zonas, clientes y precios. Se configura una sola vez.',
    color: 'green',
    hex: '#16A34A',
    platform: 'web',
    role: 'Admin',
    icon: Buildings,
    hideForVendedor: true,
    steps: [
      { label: 'Crear zonas geograficas', href: '/zones' },
      { label: 'Catalogo de productos y familias', href: '/products' },
      { label: 'Inventario inicial de productos', href: '/inventory' },
      { label: 'Listas de precios por cliente', href: '/price-lists' },
      { label: 'Registro de clientes y asignacion de zona', href: '/clients' },
      { label: 'Metas de vendedores por periodo', href: '/metas' },
    ],
  },
  {
    id: 'planning',
    number: 2,
    title: 'Planificacion de Rutas',
    subtitle: 'Crear ruta, agregar paradas, cargar inventario al vehiculo.',
    color: 'indigo',
    hex: '#6366F1',
    platform: 'web',
    role: 'Supervisor',
    icon: NavigationArrow,
    vendedorTitle: 'Tu ruta de hoy',
    vendedorSubtitle: 'Revisa los clientes que te asignaron y acepta tu ruta.',
    vendedorSteps: [
      { label: 'Ver tu ruta asignada del dia', href: '/routes' },
      { label: 'Revisar productos cargados al vehiculo' },
      { label: 'Aceptar la ruta para iniciar' },
    ],
    steps: [
      { label: 'Crear ruta del dia (vendedor + zona + fecha)', href: '/routes' },
      { label: 'Agregar paradas en orden de visita', href: '/routes' },
      { label: 'Cargar inventario al vehiculo', href: '/routes' },
      { label: 'Asignar pedidos pre-confirmados (opcional)' },
      { label: 'Registrar efectivo inicial del vendedor' },
    ],
  },
  {
    id: 'execution',
    number: 3,
    title: 'Ejecucion en Campo',
    subtitle: 'Iniciar ruta, check-in/out con GPS, tomar pedidos, cobrar.',
    color: 'amber',
    hex: '#F59E0B',
    platform: 'app',
    role: 'Vendedor',
    icon: DeviceMobile,
    vendedorTitle: 'Visitar clientes',
    vendedorSubtitle: 'Llega al cliente, vende, cobra y sigue con el siguiente.',
    vendedorSteps: [
      { label: 'Iniciar tu ruta', mobileOnly: true },
      { label: 'Llegar al cliente — check-in automatico con GPS', mobileOnly: true },
      { label: 'Vender productos (venta directa desde el vehiculo)', mobileOnly: true },
      { label: 'Cobrar al momento o dejar a credito', mobileOnly: true },
      { label: 'Imprimir ticket de venta', mobileOnly: true },
      { label: 'Check-out y siguiente cliente', mobileOnly: true },
    ],
    steps: [
      { label: 'Vendedor inicia la ruta asignada', mobileOnly: true },
      { label: 'Llegar al cliente (GPS)', mobileOnly: true },
      { label: 'Check-in con geolocalizacion', mobileOnly: true },
      { label: 'Tomar pedido / venta directa', mobileOnly: true },
      { label: 'Cobrar (efectivo, transferencia, tarjeta)', mobileOnly: true },
      { label: 'Check-out + resultado + evidencia fotografica', mobileOnly: true },
      { label: 'Siguiente parada...', mobileOnly: true },
    ],
  },
  {
    id: 'orders',
    number: 4,
    title: 'Ciclo del Pedido',
    subtitle: 'Venta en ruta (inmediata) o preventa (entrega posterior).',
    color: 'blue',
    hex: '#3B82F6',
    platform: 'ambos',
    role: 'Todos',
    icon: Bag,
    vendedorTitle: 'Tus ventas',
    vendedorSubtitle: 'Ve lo que vendiste. El admin se encarga del resto.',
    vendedorSteps: [
      { label: 'Venta en ruta: vendes, entregas y cobras al momento', mobileOnly: true },
      { label: 'Preventa: solo tomas el pedido, se entrega otro dia', mobileOnly: true },
      { label: 'Ver historial de tus pedidos', href: '/orders' },
    ],
    steps: [
      {
        label: 'Venta en ruta: Borrador → Entregado (instantaneo)',
        description: 'El vendedor lleva producto, vende y entrega en el momento.',
      },
      {
        label: 'Preventa: Borrador → Enviado → Confirmado → EnProceso → EnRuta → Entregado',
        description: 'El vendedor solo toma el pedido. Almacen prepara y logistica entrega otro dia.',
      },
      { label: 'Administrar pedidos y cambiar estados', href: '/orders' },
      { label: 'Entrega descuenta inventario automaticamente' },
      { label: 'Cancelar pedidos con motivo (solo admin)', href: '/orders' },
    ],
  },
  {
    id: 'collections',
    number: 5,
    title: 'Cobranza',
    subtitle: 'Cobros parciales/totales, saldos, estado de cuenta.',
    color: 'violet',
    hex: '#8B5CF6',
    platform: 'ambos',
    role: 'Todos',
    icon: CreditCard,
    vendedorTitle: 'Cobros pendientes',
    vendedorSubtitle: 'Clientes que te deben. Ve y cobra.',
    vendedorSteps: [
      { label: 'Ver clientes con saldo pendiente', href: '/cobranza' },
      { label: 'Registrar cobro (efectivo, transferencia, cheque)', mobileOnly: true },
      { label: 'Imprimir recibo de cobro', mobileOnly: true },
    ],
    steps: [
      { label: 'Cobros parciales o totales por pedido', href: '/cobranza' },
      { label: 'Multiples metodos de pago (efectivo, transferencia, cheque, tarjeta)' },
      { label: 'Saldo del cliente se actualiza automaticamente' },
      { label: 'Estado de cuenta por cliente', href: '/cobranza' },
      { label: 'Resumen general de cartera', href: '/cobranza' },
    ],
  },
  {
    id: 'closure',
    number: 6,
    title: 'Cierre de Ruta',
    subtitle: 'Reconciliar inventario, cerrar ruta, reportes del dia.',
    color: 'red',
    hex: '#EF4444',
    platform: 'web',
    role: 'Supervisor',
    icon: ChartBar,
    vendedorTitle: 'Cerrar tu dia',
    vendedorSubtitle: 'Entrega cuentas: efectivo, producto devuelto, mermas.',
    vendedorSteps: [
      { label: 'Reportar productos devueltos y mermas', mobileOnly: true },
      { label: 'Entregar efectivo recaudado' },
      { label: 'Tu ruta se marca como completada' },
    ],
    steps: [
      { label: 'Completar ruta', href: '/routes' },
      { label: 'Reconciliar inventario: vendidos, devueltos, mermas', href: '/routes' },
      { label: 'Registrar monto recibido del vendedor' },
      { label: 'Cerrar ruta oficialmente', href: '/routes' },
      { label: 'Generar reportes del dia', href: '/reports' },
    ],
  },
];

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

function PlatformBadge({ platform }: { platform: 'web' | 'app' | 'ambos' }) {
  if (platform === 'web') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
        <Desktop size={12} weight="bold" /> Web
      </span>
    );
  }
  if (platform === 'app') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-400">
        <DeviceMobile size={12} weight="bold" /> App Movil
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400">
      <Desktop size={12} weight="bold" /> Web + App
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

function StepRow({ step, index, phaseColor }: { step: FlowStep; index: number; phaseColor: string }) {
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
          solo app
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

function PhaseAccordion({ phase, isVendedor }: { phase: Phase; isVendedor: boolean }) {
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
            <span className={`text-xs font-semibold ${colors.text}`}>FASE {phase.number}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <PlatformBadge platform={phase.platform} />
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
              <StepRow step={step} index={i} phaseColor={phase.color} />
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
  const [isVendedor, setIsVendedor] = useState(false);

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Herramientas' },
        { label: 'Ayuda' },
      ]}
      title="Flujo de Venta"
      subtitle="Mapa interactivo del ciclo completo — haz clic en cada paso para ir a la pagina correspondiente"
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
            <span className="hidden sm:inline">Vista </span>Admin
          </button>
          <button
            onClick={() => setIsVendedor(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isVendedor
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="hidden sm:inline">Vista </span>Vendedor
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
              <strong>Venta en ruta:</strong> Llevas el producto en tu vehiculo, vendes, entregas y cobras al momento.
              <br />
              <strong>Preventa:</strong> Solo tomas el pedido. El almacen prepara y se entrega otro dia.
            </p>
          </div>
        )}

        {/* Phase accordions */}
        {PHASES.map(phase => (
          <PhaseAccordion key={phase.id} phase={phase} isVendedor={isVendedor} />
        ))}
      </div>
    </PageHeader>
  );
}
