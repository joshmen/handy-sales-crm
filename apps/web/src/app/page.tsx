import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { LandingNav } from '@/components/landing/LandingNav';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { Check, Star, ArrowRight } from 'lucide-react';
import { IconCRM, IconSales, IconRoutes, IconInvoice, IconFieldControl, IconReduceDebt, IconFastInvoice, IconOffline } from '@/components/landing/LandingIcons';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Handy Suites® | La plataforma todo-en-uno para tu negocio',
  description: 'Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en Latinoamérica.',
};

const features = [
  {
    Icon: IconCRM,
    title: 'CRM y Clientes',
    description: 'Gestiona toda tu cartera de clientes, visitas y seguimiento de oportunidades.',
    bg: 'bg-rose-50',
  },
  {
    Icon: IconSales,
    title: 'Ventas y Pedidos',
    description: 'Crea pedidos en segundos, controla tu pipeline y da seguimiento a cada venta.',
    bg: 'bg-indigo-50',
  },
  {
    Icon: IconRoutes,
    title: 'Rutas y Logística',
    description: 'Planea rutas inteligentes, asigna vendedores y monitorea entregas en tiempo real.',
    bg: 'bg-emerald-50',
  },
  {
    Icon: IconInvoice,
    title: 'Facturación electrónica',
    description: 'Genera y envía facturas directo desde la plataforma. Compatible con regulaciones locales.',
    bg: 'bg-amber-50',
  },
];

const testimonials = [
  {
    quote: 'Redujimos el tiempo de facturación un 80%. Lo que antes tomaba toda la mañana ahora se hace en minutos.',
    attribution: 'Equipo administrativo',
    company: 'Jeyma Distribuciones',
    initials: 'JD',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    quote: 'Nuestros vendedores crean pedidos desde el campo. La productividad se disparó desde el primer mes.',
    attribution: 'Área comercial',
    company: 'Rutas Norte',
    initials: 'RN',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    quote: 'El soporte es increíble. Cada vez que necesitamos algo, lo resuelven en minutos. Se siente como tener un equipo de TI propio.',
    attribution: 'Dirección general',
    company: 'Centro Comercial',
    initials: 'CC',
    color: 'bg-emerald-100 text-emerald-600',
  },
];


const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Handy Suites',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en Latinoamérica.',
  url: 'https://app.handysuites.com',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'MXN',
    lowPrice: '499',
    highPrice: '1499',
    offerCount: '3',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Handy Suites',
    url: 'https://handysuites.com',
  },
};

export default function LandingPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* ===== HERO ===== */}
      <section className="pt-28 pb-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <h1 className={`text-4xl lg:text-[52px] font-extrabold tracking-tight text-gray-900 leading-[1.08] ${plusJakarta.className} page-animate page-animate-delay-2`}>
                La plataforma{' '}
                <span className="text-green-600">
                  todo-en-uno
                </span>{' '}
                para tu negocio
              </h1>

              <p className="text-lg text-muted-foreground mt-5 max-w-lg leading-relaxed page-animate page-animate-delay-3">
                Gestiona clientes, ventas, rutas, inventario y facturación
                desde un solo lugar. Diseñado para PYMEs en Latinoamérica.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8 page-animate page-animate-delay-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-semibold text-base shadow-sm transition-colors"
                >
                  Comienza gratis por 14 días
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#caracteristicas"
                  className="inline-flex items-center justify-center border border-border-default text-gray-700 hover:bg-surface-1 px-6 py-3.5 rounded-xl font-medium text-base transition-colors"
                >
                  Ver características
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-muted-foreground page-animate page-animate-delay-5">
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin tarjeta de crédito</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Soporte incluido</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancela cuando quieras</span>
              </div>
            </div>

            {/* Right: Browser chrome + screenshot */}
            <div className="relative page-animate page-animate-delay-6">
              <div className="rounded-2xl shadow-2xl border border-border-subtle overflow-hidden bg-surface-2">
                {/* Browser bar */}
                <div className="bg-surface-3 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-surface-2 rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs">
                      app.handysuites.com/dashboard
                    </div>
                  </div>
                </div>
                {/* Screenshot */}
                <Image
                  src="/images/hero-dashboard.png"
                  alt="Dashboard de Handy Suites mostrando KPIs, ventas y actividad reciente"
                  width={1440}
                  height={780}
                  className="w-full"
                  priority
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-2 lg:-right-4 bg-surface-2 rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-gray-900">En vivo</span>
                <span className="text-xs text-muted-foreground">datos en tiempo real</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF STRIP ===== */}
      <section className="py-10 bg-surface-2 border-y border-gray-100">
        <ScrollReveal className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-muted-foreground text-center mb-6">
            Empresas que confían en Handy Suites
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-5">
            {/* SVG wordmarks — monochrome, styled to look like real company logos */}
            <svg width="160" height="32" viewBox="0 0 160 32" className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Jeyma Distribuciones">
              <rect x="0" y="6" width="20" height="20" rx="4" fill="#9ca3af" />
              <text x="28" y="22" fontFamily="Georgia, serif" fontWeight="700" fontSize="16" fill="#6b7280" letterSpacing="-0.5">Jeyma</text>
              <text x="82" y="22" fontFamily="Georgia, serif" fontWeight="400" fontSize="12" fill="#9ca3af">Dist.</text>
            </svg>
            <svg width="140" height="32" viewBox="0 0 140 32" className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Rutas Norte">
              <path d="M4 22 L14 8 L24 22" stroke="#6b7280" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <text x="32" y="21" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="#6b7280" letterSpacing="1">RUTAS</text>
              <text x="84" y="21" fontFamily="system-ui, sans-serif" fontWeight="400" fontSize="14" fill="#9ca3af">Norte</text>
            </svg>
            <svg width="120" height="32" viewBox="0 0 120 32" className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Centro Comercial">
              <circle cx="12" cy="16" r="10" stroke="#6b7280" strokeWidth="2" fill="none" />
              <circle cx="12" cy="16" r="3" fill="#6b7280" />
              <text x="28" y="21" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="13" fill="#6b7280" letterSpacing="-0.3">CENTRO</text>
            </svg>
            <svg width="150" height="32" viewBox="0 0 150 32" className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Huichol Foods">
              <path d="M6 24 Q12 4 18 16 Q24 28 30 12" stroke="#6b7280" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="38" y="21" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="15" fill="#6b7280">Huichol</text>
              <text x="103" y="21" fontFamily="Georgia, serif" fontWeight="400" fontSize="11" fill="#9ca3af">Foods</text>
            </svg>
            <svg width="160" height="32" viewBox="0 0 160 32" className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Distribuidora MX">
              <rect x="0" y="9" width="6" height="14" rx="1" fill="#9ca3af" />
              <rect x="8" y="5" width="6" height="22" rx="1" fill="#6b7280" />
              <rect x="16" y="12" width="6" height="10" rx="1" fill="#9ca3af" />
              <text x="28" y="21" fontFamily="monospace" fontWeight="700" fontSize="13" fill="#6b7280" letterSpacing="0.5">DistMX</text>
            </svg>
          </div>
        </ScrollReveal>
      </section>

      {/* ===== VALUE PROPS — Beneficios clave ===== */}
      <section className="py-20 bg-surface-2">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm font-medium text-emerald-600 mb-2">¿Por qué Handy Suites?</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
              Resultados reales para tu negocio
            </h2>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Control total de tu equipo en campo',
                desc: 'Monitorea ubicación, visitas y actividad de cada vendedor en tiempo real desde cualquier dispositivo.',
                Icon: IconFieldControl,
              },
              {
                title: 'Reduce tu cartera vencida hasta 40%',
                desc: 'Alertas de cobranza, seguimiento automático y estado de cuenta actualizado para cada cliente.',
                Icon: IconReduceDebt,
              },
              {
                title: 'Facturación en 3 clics',
                desc: 'Genera y envía facturas electrónicas sin salir de la plataforma.',
                Icon: IconFastInvoice,
              },
              {
                title: 'Funciona sin internet',
                desc: 'Tu equipo captura pedidos, visitas y cobros offline. Todo se sincroniza al reconectar.',
                Icon: IconOffline,
              },
            ].map((prop, i) => (
              <ScrollReveal key={prop.title} delay={i * 0.08}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-1/80 flex items-center justify-center mx-auto mb-4">
                    <prop.Icon size={42} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">{prop.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{prop.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS — 3 steps ===== */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm font-medium text-indigo-600 mb-2">Simple y rápido</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
              Empieza en 3 pasos
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-emerald-200" />

            {[
              { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta en 2 minutos. Sin tarjeta, sin compromisos.', color: 'bg-indigo-600' },
              { step: '2', title: 'Configura', desc: 'Importa tus clientes y productos, o empieza desde cero.', color: 'bg-indigo-500' },
              { step: '3', title: 'Vende', desc: 'Tu equipo empieza a usar la app desde el primer día.', color: 'bg-emerald-500' },
            ].map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="text-center relative">
                  <div className={`w-16 h-16 rounded-2xl ${s.color} text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-md`}>
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE GRID ===== */}
      <section id="caracteristicas" className="py-16 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-600 mb-2">Todo lo que necesitas</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
              Una plataforma. Infinitas posibilidades.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Desde el primer contacto con tu cliente hasta la factura final, todo en un solo sistema.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, i) => (
              <ScrollReveal key={feat.title} delay={i * 0.08}>
                <div className="bg-surface-2 rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${feat.bg}`}>
                    <feat.Icon size={36} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-4">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{feat.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SHOWCASE ===== */}
      <section className="py-16 bg-surface-2">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Row 1: Clients */}
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="rounded-2xl shadow-xl border border-border-subtle overflow-hidden bg-surface-2">
                <div className="bg-surface-3 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-surface-2 rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs">
                      app.handysuites.com/clientes
                    </div>
                  </div>
                </div>
                <Image
                  src="/images/tour/clientes-crear.png"
                  alt="Módulo de creación de clientes en Handy Suites"
                  width={800}
                  height={500}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-6 h-[3px] rounded-full bg-gradient-to-r from-rose-400 to-rose-500" />
                  <span className="text-[11px] font-medium text-muted-foreground">CRM</span>
                </div>
                <h3 className={`text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
                  Conoce a tus clientes como nunca antes
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Toda la información de tus clientes en un solo lugar. Historial de compras, visitas, categorías y zonas geográficas.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {['Historial completo de interacciones', 'Segmentación por categoría y zona', 'Seguimiento de visitas en campo'].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>

          {/* Row 2: Orders (reversed) */}
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="lg:order-2 rounded-2xl shadow-xl border border-border-subtle overflow-hidden bg-surface-2">
                <div className="bg-surface-3 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-surface-2 rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs">
                      app.handysuites.com/pedidos
                    </div>
                  </div>
                </div>
                <Image
                  src="/images/tour/pedidos-crear.png"
                  alt="Módulo de creación de pedidos en Handy Suites"
                  width={800}
                  height={500}
                  className="w-full"
                />
              </div>
              <div className="lg:order-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-6 h-[3px] rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500" />
                  <span className="text-[11px] font-medium text-muted-foreground">Ventas</span>
                </div>
                <h3 className={`text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
                  Pedidos ágiles, ventas más rápidas
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Crea pedidos en segundos con búsqueda inteligente de productos, precios automáticos y descuentos por cantidad.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {['Creación rápida con catálogo integrado', 'Precios y descuentos automáticos', 'Seguimiento de estado en tiempo real'].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== TESTIMONIALS + STATS ===== */}
      <section id="clientes" className="py-16 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-600 mb-2">Nuestros clientes</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${plusJakarta.className}`}>
              Lo que dicen quienes ya lo usan
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.company} delay={i * 0.08}>
                <div className="bg-surface-2 rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground/70 text-sm leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{t.company}</p>
                      <p className="text-xs text-muted-foreground">{t.attribution}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: '99.9%', label: 'Uptime garantizado', color: 'text-emerald-600' },
              { value: '80%', label: 'Menos tiempo en facturación', color: 'text-rose-500' },
              { value: '24/7', label: 'Soporte incluido', color: 'text-amber-500' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.06}>
                <div className="text-center">
                  <p className={`text-3xl lg:text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <PricingSection fontClassName={plusJakarta.className} />

      {/* ===== FAQ ===== */}
      <FAQSection fontClassName={plusJakarta.className} />

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 bg-gradient-to-br from-green-600 to-green-800">
        <ScrollReveal className="max-w-3xl mx-auto px-6 text-center">
          <h2 className={`text-3xl lg:text-4xl font-bold text-white tracking-tight ${plusJakarta.className}`}>
            Empieza hoy. Gratis.
          </h2>
          <p className="text-green-200 mt-4 text-lg">
            14 días de prueba completa. Sin tarjeta. Sin compromisos.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-surface-2 text-green-700 font-semibold px-8 py-4 rounded-xl text-lg shadow-lg hover:bg-green-50 transition-colors mt-8"
          >
            Comenzar prueba gratuita
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-green-300 text-sm mt-4">
            Sin tarjeta de crédito. Cancela cuando quieras.
          </p>
        </ScrollReveal>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-muted-foreground py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/logo-icon.svg" alt="Handy Suites" width={32} height={32} />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white tracking-tight">Handy</span>
                  <span className="text-lg font-normal text-muted-foreground tracking-tight">
                    Suites<sup className="text-[9px] text-muted-foreground">®</sup>
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                La plataforma todo-en-uno para PYMEs en Latinoamérica.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#caracteristicas" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#clientes" className="hover:text-white transition-colors">Clientes</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="mailto:hola@handysuites.com" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="mailto:ventas@handysuites.com" className="hover:text-white transition-colors">Ventas</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="/privacidad" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="/terminos" className="hover:text-white transition-colors">Términos de uso</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
            <p>© {new Date().getFullYear()} Handy Suites®. Todos los derechos reservados</p>
            <p>Hecho para PYMEs en Latinoamérica</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
