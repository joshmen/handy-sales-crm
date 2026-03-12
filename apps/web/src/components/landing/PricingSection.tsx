'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

// ── Types for API response ──────────────────────────────
interface ApiPlan {
  id: number;
  nombre: string;
  codigo: string;
  precioMensual: number;
  precioAnual: number;
  maxUsuarios: number;
  maxProductos: number;
  maxClientesPorMes: number;
  incluyeReportes: boolean;
  incluyeSoportePrioritario: boolean;
  caracteristicas?: string[];
  orden: number;
}

// ── Local plan shape used by the UI ─────────────────────
interface PricingPlan {
  name: string;
  code: string;
  price: { monthly: number; annual: number };
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular: boolean;
}

// ── Fallback plans (used when API is unavailable) ───────
const FALLBACK_PLANS: PricingPlan[] = [
  {
    name: 'Básico',
    code: 'BASIC',
    price: { monthly: 499, annual: 399 },
    description: 'Para negocios que empiezan a digitalizar su operación.',
    features: ['Hasta 3 usuarios', 'CRM y clientes', 'Pedidos y ventas', 'Facturación electrónica', 'Soporte por email'],
    cta: 'Comenzar prueba',
    ctaHref: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    code: 'PRO',
    price: { monthly: 999, annual: 799 },
    description: 'Para equipos de venta en crecimiento.',
    features: ['Hasta 15 usuarios', 'Todo de Básico', 'Rutas y logística', 'Inventarios en tiempo real', 'Reportes avanzados', 'Listas de precios múltiples', 'Soporte prioritario'],
    cta: 'Comenzar prueba',
    ctaHref: '/register',
    popular: true,
  },
  {
    name: 'Enterprise',
    code: 'ENTERPRISE',
    price: { monthly: 0, annual: 0 },
    description: 'Para empresas con necesidades a la medida.',
    features: ['Usuarios ilimitados', 'Todo de Pro', 'API e integraciones', 'Multi-sucursal', 'Onboarding dedicado', 'SLA garantizado', 'Facturación avanzada'],
    cta: 'Contactar ventas',
    ctaHref: 'mailto:ventas@handysuites.com',
    popular: false,
  },
];

/** Map API plan to local PricingPlan shape */
function mapApiPlan(p: ApiPlan, allPlans: ApiPlan[]): PricingPlan {
  const isEnterprise = p.codigo === 'ENTERPRISE' || p.precioMensual === 0;
  const isPopular = p.orden === 2 || p.codigo === 'PRO' || p.codigo === 'PROFESIONAL';

  // Build features list from API data
  const features: string[] = [];
  if (p.maxUsuarios > 0) features.push(`Hasta ${p.maxUsuarios} usuarios`);
  else features.push('Usuarios ilimitados');

  // Add "Todo de X" for higher-tier plans
  const lowerPlan = allPlans.find(lp => lp.orden === p.orden - 1);
  if (lowerPlan) features.push(`Todo de ${lowerPlan.nombre}`);

  // Add API-provided features
  if (p.caracteristicas?.length) {
    features.push(...p.caracteristicas);
  } else {
    // Derive features from plan capabilities
    if (p.incluyeReportes) features.push('Reportes avanzados');
    if (p.incluyeSoportePrioritario) features.push('Soporte prioritario');
  }

  return {
    name: p.nombre,
    code: p.codigo,
    price: { monthly: p.precioMensual, annual: p.precioAnual },
    description: isEnterprise
      ? 'Para empresas con necesidades a la medida.'
      : isPopular
        ? 'Para equipos de venta en crecimiento.'
        : 'Para negocios que empiezan a digitalizar su operación.',
    features,
    cta: isEnterprise ? 'Contactar ventas' : 'Comenzar prueba',
    ctaHref: isEnterprise ? 'mailto:ventas@handysuites.com' : '/register',
    popular: isPopular,
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';

function PricingCard({
  plan,
  isAnnual,
  index,
}: {
  plan: PricingPlan;
  isAnnual: boolean;
  index: number;
}) {
  const price = plan.price.monthly === 0
    ? 'A tu medida'
    : `$${isAnnual ? plan.price.annual : plan.price.monthly}`;

  return (
    <div className="pricing-card-wrapper" style={{ animationDelay: `${index * 120}ms` }}>
      <div
        className={`pricing-card group relative rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 ${
          plan.popular
            ? 'border-2 border-green-600 shadow-lg'
            : 'border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
        }`}
      >

        <div className="relative bg-white rounded-2xl p-8 h-full">
          {/* Popular tag */}
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-green-600 text-white text-[11px] font-semibold px-4 py-1 rounded-full">
                Más popular
              </span>
            </div>
          )}

          {/* Plan name */}
          <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

          {/* Price */}
          <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-baseline gap-1 overflow-hidden">
              <span
                key={price}
                className="text-4xl font-extrabold text-gray-900 tracking-tight pricing-price-swap"
              >
                {price}
              </span>
              {plan.price.monthly > 0 && (
                <span className="text-sm text-gray-400 font-medium">MXN/mes</span>
              )}
            </div>
            {plan.price.monthly > 0 && (
              <div
                className="grid transition-[grid-template-rows] duration-400 ease-out"
                style={{ gridTemplateRows: isAnnual ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="text-xs text-green-600 font-medium mt-1.5">
                    Ahorras ${(plan.price.monthly - plan.price.annual) * 12} MXN al año
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
                {feat}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href={plan.ctaHref}
            className={`group/btn flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              plan.popular
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {plan.cta}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>

    </div>
  );
}

export function PricingSection({ fontClassName }: { fontClassName?: string }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>(FALLBACK_PLANS);

  // Fetch plans from API (public endpoint) with fallback to hardcoded
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/subscription/plans`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((apiPlans: ApiPlan[]) => {
        if (apiPlans.length >= 2) {
          const sorted = apiPlans.sort((a, b) => a.orden - b.orden);
          setPlans(sorted.map(p => mapApiPlan(p, sorted)));
        }
      })
      .catch(() => {
        // API unavailable or requires auth — keep fallback plans
      });
    return () => controller.abort();
  }, []);

  return (
    <section id="precios" className="py-20 bg-white relative">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-green-600 mb-3">
            Precios
          </p>
          <h2 className={`text-3xl lg:text-[40px] font-extrabold text-gray-900 tracking-tight leading-tight ${fontClassName || ''}`}>
            Invierte en crecer, no en software
          </h2>
          <p className="text-gray-500 mt-4 max-w-md mx-auto">
            14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium transition-colors duration-300 ${!isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                isAnnual ? 'bg-green-600' : 'bg-gray-300'
              }`}
              aria-label="Alternar entre facturación mensual y anual"
            >
              <div
                className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-all duration-300"
                style={{ left: isAnnual ? 'calc(100% - 25px)' : '3px' }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-300 ${isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
              Anual
            </span>
            {isAnnual && (
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full pricing-fade-in">
                -20%
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} isAnnual={isAnnual} index={i} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        .pricing-card-wrapper {
          position: relative;
        }
        .pricing-card {
          cursor: default;
          will-change: transform;
        }
        .pricing-fade-in {
          animation: pricingFadeIn 0.3s ease-out;
        }
        @keyframes pricingFadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .pricing-price-swap {
          animation: pricePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pricePop {
          0% { opacity: 0; transform: translateY(12px) scale(0.95); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
