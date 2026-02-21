import { Metadata } from 'next';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { LandingNav } from '@/components/landing/LandingNav';
import { Users, ShoppingBag, MapPin, FileText, Check, Star, ArrowRight, CheckCircle2 } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Handy Suites® — La plataforma todo-en-uno para tu negocio',
  description: 'Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en México. Certificado SAT CFDI 4.0.',
};

const features = [
  {
    icon: Users,
    title: 'CRM y Clientes',
    description: 'Gestiona toda tu cartera de clientes, visitas y seguimiento de oportunidades.',
    color: 'bg-rose-50 text-rose-500',
  },
  {
    icon: ShoppingBag,
    title: 'Ventas y Pedidos',
    description: 'Crea pedidos en segundos, controla tu pipeline y da seguimiento a cada venta.',
    color: 'bg-indigo-50 text-indigo-500',
  },
  {
    icon: MapPin,
    title: 'Rutas y Logística',
    description: 'Planea rutas inteligentes, asigna vendedores y monitorea entregas en tiempo real.',
    color: 'bg-emerald-50 text-emerald-500',
  },
  {
    icon: FileText,
    title: 'Facturación SAT',
    description: 'CFDI 4.0 directo desde la plataforma. Timbrado automático con el SAT.',
    color: 'bg-amber-50 text-amber-500',
  },
];

const testimonials = [
  {
    quote: 'Redujimos el tiempo de facturación un 80%. Ahora lo que antes tomaba toda la mañana se hace en minutos.',
    name: 'María García',
    role: 'Administradora',
    company: 'Jeyma Distribuciones',
  },
  {
    quote: 'Nuestros vendedores ahora crean pedidos desde el campo. La productividad se disparó desde el primer mes.',
    name: 'Carlos Ramírez',
    role: 'Gerente Comercial',
    company: 'Rutas Norte',
  },
  {
    quote: 'El soporte es increíble. Cada vez que necesitamos algo, lo resuelven en minutos. Se siente como tener un equipo de TI propio.',
    name: 'Ana Pérez',
    role: 'Directora General',
    company: 'Centro Comercial',
  },
];

const plans = [
  {
    name: 'Básico',
    price: '$499',
    period: '/mes',
    description: 'Para negocios que empiezan a digitalizar su operación.',
    features: ['Hasta 3 usuarios', 'CRM y clientes', 'Pedidos y ventas', 'Facturación SAT básica', 'Soporte por email'],
    cta: 'Comenzar prueba',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$999',
    period: '/mes',
    description: 'Para equipos de venta en crecimiento.',
    features: ['Hasta 15 usuarios', 'Todo de Básico', 'Rutas y logística', 'Inventarios en tiempo real', 'Reportes avanzados', 'Listas de precios múltiples', 'Soporte prioritario'],
    cta: 'Comenzar prueba',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Para empresas con necesidades a la medida.',
    features: ['Usuarios ilimitados', 'Todo de Pro', 'API e integraciones', 'Multi-sucursal', 'Onboarding dedicado', 'SLA garantizado', 'Facturación avanzada'],
    cta: 'Contactar ventas',
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <main>
      <LandingNav />

      {/* ===== HERO ===== */}
      <section className="pt-28 pb-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-medium mb-6">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Certificado SAT CFDI 4.0
              </div>

              <h1 className={`text-4xl lg:text-[52px] font-extrabold tracking-tight text-gray-900 leading-[1.08] ${spaceGrotesk.className}`}>
                La plataforma{' '}
                <span className="bg-gradient-to-r from-rose-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                  todo-en-uno
                </span>{' '}
                para tu negocio
              </h1>

              <p className="text-lg text-gray-500 mt-5 max-w-lg leading-relaxed">
                Gestiona clientes, ventas, rutas, inventario y facturación
                desde un solo lugar. Diseñado para PYMEs en México.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-semibold text-base shadow-sm transition-colors"
                >
                  Comienza gratis — 14 días
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#caracteristicas"
                  className="inline-flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3.5 rounded-xl font-medium text-base transition-colors"
                >
                  Ver características
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin tarjeta de crédito</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Soporte incluido</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancela cuando quieras</span>
              </div>
            </div>

            {/* Right: Browser chrome + screenshot */}
            <div className="relative">
              <div className="rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white">
                {/* Browser bar */}
                <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded px-3 py-1 text-xs text-gray-400 max-w-xs">
                      app.handysuites.com/dashboard
                    </div>
                  </div>
                </div>
                {/* Screenshot */}
                <img
                  src="/images/hero-dashboard.png"
                  alt="Dashboard de Handy Suites mostrando KPIs, ventas y actividad reciente"
                  className="w-full"
                  loading="eager"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-2 lg:-right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-gray-900">500+</span>
                <span className="text-xs text-gray-500">empresas activas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF STRIP ===== */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-gray-400 text-center uppercase tracking-wider mb-6">
            Empresas que confían en Handy Suites
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {['Jeyma Distribuciones', 'Rutas Norte', 'Centro Comercial', 'Huichol Foods', 'Distribuidora MX'].map((name) => (
              <span key={name} className="text-gray-300 font-semibold text-lg tracking-tight">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE GRID ===== */}
      <section id="caracteristicas" className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-600 mb-2">Todo lo que necesitas</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${spaceGrotesk.className}`}>
              Una plataforma. Infinitas posibilidades.
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Desde el primer contacto con tu cliente hasta la factura final, todo en un solo sistema.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-4">{feat.title}</h3>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SHOWCASE ===== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {/* Row 1: Clients */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <img
                src="/images/tour/clientes-crear.jpg"
                alt="Módulo de creación de clientes en Handy Suites"
                className="w-full"
                loading="lazy"
              />
            </div>
            <div>
              <span className="inline-block bg-rose-50 text-rose-600 text-xs font-medium px-2.5 py-1 rounded-full mb-4">CRM</span>
              <h3 className={`text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight ${spaceGrotesk.className}`}>
                Conoce a tus clientes como nunca antes
              </h3>
              <p className="text-gray-500 mt-3 leading-relaxed">
                Toda la información de tus clientes en un solo lugar. Historial de compras, visitas, categorías y zonas geográficas.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['Historial completo de interacciones', 'Segmentación por categoría y zona', 'Seguimiento de visitas en campo'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 2: Orders (reversed) */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="lg:order-2 rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <img
                src="/images/tour/pedidos-crear.jpg"
                alt="Módulo de creación de pedidos en Handy Suites"
                className="w-full"
                loading="lazy"
              />
            </div>
            <div className="lg:order-1">
              <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-full mb-4">Ventas</span>
              <h3 className={`text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight ${spaceGrotesk.className}`}>
                Pedidos ágiles, ventas más rápidas
              </h3>
              <p className="text-gray-500 mt-3 leading-relaxed">
                Crea pedidos en segundos con búsqueda inteligente de productos, precios automáticos y descuentos por cantidad.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['Creación rápida con catálogo integrado', 'Precios y descuentos automáticos', 'Seguimiento de estado en tiempo real'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS + STATS ===== */}
      <section id="clientes" className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-600 mb-2">Nuestros clientes</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${spaceGrotesk.className}`}>
              Lo que dicen quienes ya lo usan
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}, {t.company}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Empresas activas', color: 'text-indigo-600' },
              { value: '99.9%', label: 'Uptime garantizado', color: 'text-emerald-600' },
              { value: '80%', label: 'Menos tiempo en facturación', color: 'text-rose-500' },
              { value: 'SAT', label: 'Certificado CFDI 4.0', color: 'text-amber-500' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-3xl lg:text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="precios" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-600 mb-2">Precios simples y transparentes</p>
            <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${spaceGrotesk.className}`}>
              Elige el plan ideal para tu negocio
            </h2>
            <p className="text-gray-500 mt-3">
              Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 relative ${
                  plan.popular
                    ? 'border-2 border-indigo-500 shadow-lg'
                    : 'border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Más popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm"> MXN{plan.period}</span>}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block text-center w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-indigo-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className={`text-3xl lg:text-4xl font-bold text-white tracking-tight ${spaceGrotesk.className}`}>
            Empieza hoy. Gratis.
          </h2>
          <p className="text-indigo-200 mt-4 text-lg">
            14 días de prueba completa. Sin tarjeta. Sin compromisos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-4 rounded-xl text-lg shadow-lg hover:bg-indigo-50 transition-colors mt-8"
          >
            Comenzar prueba gratuita
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-indigo-300 text-sm mt-4">
            Ya se unen 500+ empresas mexicanas
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo-icon.svg" alt="" className="w-8 h-8" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white tracking-tight">Handy</span>
                  <span className="text-lg font-normal text-gray-500 tracking-tight">
                    Suites<sup className="text-[9px] text-gray-500">®</sup>
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                La plataforma todo-en-uno para PYMEs en México.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-gray-800 text-gray-400 rounded px-2.5 py-1 text-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                SAT CFDI 4.0
              </div>
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
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos de uso</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
            <p>© 2026 Handy Suites® — Todos los derechos reservados</p>
            <p>Hecho para PYMEs mexicanas</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
