'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  ChevronRight,

  RefreshCw,
  X,
  Building2,
  Package,
  FolderTree,
  Layers,
  LayoutGrid,
  Ruler,
  Tags,
  Users as UsersIcon,
  UserPlus,
  MapPin,
  Route,
  ShoppingCart,
  Percent,
  Zap,
  PartyPopper,
  Compass,
} from 'lucide-react';
import { productService } from '@/services/api/products';
import { productCategoryService } from '@/services/api/productCategories';
import { productFamilyService } from '@/services/api/productFamilies';
import { unitService } from '@/services/api/units';
import { priceListService } from '@/services/api/priceLists';
import { clientService } from '@/services/api/clients';
import { clientCategoryService } from '@/services/api/clientCategories';
import { discountService } from '@/services/api/discounts';
import { promotionService } from '@/services/api/promotions';
import { zoneService } from '@/services/api/zones';
import { usersService } from '@/services/api/users';
import { routeService } from '@/services/api/routes';
import { orderService } from '@/services/api/orders';
import { companyService } from '@/services/api/companyService';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { toursByPage } from '@/data/tours';
import { scheduleTourContinuation } from '@/data/tours/types';

// ============ Types ============

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
  tourId?: string;
}

interface OnboardingPhase {
  id: string;
  title: string;
  description: string;
  colorDot: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  colorProgress: string;
  colorButton: string;          // hex for "Ir" button per-phase
  colorCompletedBg: string;     // subtle tint when phase is done
  colorCompletedBorder: string;
  steps: OnboardingStep[];
}

// ============ Component ============

export default function GettingStartedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [phases, setPhases] = useState<OnboardingPhase[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const detectProgress = useCallback(async () => {
    // All calls run in parallel for speed
    const [
      productsRes,
      productCatsRes,
      productFamsRes,
      unitsRes,
      priceListsRes,
      clientsRes,
      clientCatsRes,
      discountsRes,
      promotionsRes,
      zonesRes,
      usersRes,
      routesRes,
      ordersRes,
      companyRes,
    ] = await Promise.allSettled([
      productService.getProducts({ limit: 1 }),
      productCategoryService.getAll(),
      productFamilyService.getAll(),
      unitService.getAll(),
      priceListService.getPriceLists(),
      clientService.getClients({ limit: 1 }),
      clientCategoryService.getAll(),
      discountService.getDiscounts(),
      promotionService.getPromotions(),
      zoneService.getZones({ limit: 1 }),
      usersService.getAllUsers({ pageSize: 1 }),
      routeService.getRutas({ limit: 1 }),
      orderService.getOrders({ pageSize: 1 }),
      companyService.getCompanySettings(),
    ]);

    const hasProducts = productsRes.status === 'fulfilled' && productsRes.value.total > 0;
    const hasProductCats = productCatsRes.status === 'fulfilled' && productCatsRes.value.length > 0;
    const hasProductFams = productFamsRes.status === 'fulfilled' && productFamsRes.value.length > 0;
    const hasUnits = unitsRes.status === 'fulfilled' && unitsRes.value.length > 0;
    const hasPriceLists = priceListsRes.status === 'fulfilled' && priceListsRes.value.length > 0;
    const hasClients = clientsRes.status === 'fulfilled' && clientsRes.value.total > 0;
    const hasClientCats = clientCatsRes.status === 'fulfilled' && clientCatsRes.value.length > 0;
    const hasDiscounts = discountsRes.status === 'fulfilled' && discountsRes.value.length > 0;
    const hasPromotions = promotionsRes.status === 'fulfilled' && promotionsRes.value.length > 0;
    const hasZones = zonesRes.status === 'fulfilled' && zonesRes.value.total > 0;

    // Users: response is wrapped in ApiResponse
    let hasTeam = false;
    if (usersRes.status === 'fulfilled') {
      const data = usersRes.value.data;
      if (data && 'totalCount' in data) {
        hasTeam = data.totalCount > 1;
      } else if (Array.isArray(data)) {
        hasTeam = data.length > 1;
      }
    }

    const hasRoutes = routesRes.status === 'fulfilled' && routesRes.value.total > 0;
    const hasOrders = ordersRes.status === 'fulfilled' && ordersRes.value.totalCount > 0;

    // Company: check if logo or fiscal name is set
    let companyConfigured = false;
    if (companyRes.status === 'fulfilled' && companyRes.value.data) {
      const c = companyRes.value.data;
      companyConfigured = !!(c.companyLogo && c.companyName && c.companyName !== 'Mi Empresa');
    }

    // Resolve tour IDs from registered tours
    const tourIdFor = (href: string): string | undefined => toursByPage[href]?.id;

    const newPhases: OnboardingPhase[] = [
      {
        id: 'base',
        title: 'Configuración Base',
        description: 'Lo esencial para arrancar',
        colorDot: 'bg-slate-500',
        colorBg: 'bg-slate-50',
        colorText: 'text-slate-700',
        colorBorder: 'border-slate-200',
        colorProgress: 'bg-slate-500',
        colorButton: '#475569',
        colorCompletedBg: 'bg-slate-50/50',
        colorCompletedBorder: 'border-slate-200',
        steps: [
          {
            id: 'company',
            title: 'Configura tu empresa',
            description: 'Logo, nombre comercial y datos fiscales',
            href: '/settings',
            icon: Building2,
            completed: companyConfigured,
            tourId: tourIdFor('/settings'),
          },
          {
            id: 'units',
            title: 'Unidades de medida',
            description: 'Piezas, cajas, kilos, litros...',
            href: '/units',
            icon: Ruler,
            completed: hasUnits,
            tourId: tourIdFor('/units'),
          },
        ],
      },
      {
        id: 'catalog',
        title: 'Catálogo de Productos',
        description: 'Tu oferta comercial completa',
        colorDot: 'bg-amber-500',
        colorBg: 'bg-amber-50',
        colorText: 'text-amber-700',
        colorBorder: 'border-amber-200',
        colorProgress: 'bg-amber-500',
        colorButton: '#b45309',
        colorCompletedBg: 'bg-amber-50/40',
        colorCompletedBorder: 'border-amber-200',
        steps: [
          {
            id: 'product-categories',
            title: 'Categorías de productos',
            description: 'Agrupa tus productos (Bebidas, Snacks...)',
            href: '/product-categories',
            icon: Layers,
            completed: hasProductCats,
            tourId: tourIdFor('/product-categories'),
          },
          {
            id: 'product-families',
            title: 'Familias de productos',
            description: 'Líneas de marca o proveedor',
            href: '/product-families',
            icon: FolderTree,
            completed: hasProductFams,
            tourId: tourIdFor('/product-families'),
          },
          {
            id: 'products',
            title: 'Crea tus productos',
            description: 'Agrega tu catálogo de productos o servicios',
            href: '/products',
            icon: Package,
            completed: hasProducts,
            tourId: tourIdFor('/products'),
          },
          {
            id: 'price-lists',
            title: 'Listas de precios',
            description: 'Precios diferenciados por cliente o zona',
            href: '/price-lists',
            icon: Tags,
            completed: hasPriceLists,
            tourId: tourIdFor('/price-lists'),
          },
          {
            id: 'discounts',
            title: 'Descuentos',
            description: 'Descuentos por volumen, temporada o cliente',
            href: '/discounts',
            icon: Percent,
            completed: hasDiscounts,
            tourId: tourIdFor('/discounts'),
          },
          {
            id: 'promotions',
            title: 'Promociones',
            description: 'Ofertas especiales y temporales',
            href: '/promotions',
            icon: Zap,
            completed: hasPromotions,
            tourId: tourIdFor('/promotions'),
          },
        ],
      },
      {
        id: 'clients',
        title: 'Clientes',
        description: 'Tu cartera comercial',
        colorDot: 'bg-blue-500',
        colorBg: 'bg-blue-50',
        colorText: 'text-blue-700',
        colorBorder: 'border-blue-200',
        colorProgress: 'bg-blue-500',
        colorButton: '#1d4ed8',
        colorCompletedBg: 'bg-blue-50/40',
        colorCompletedBorder: 'border-blue-200',
        steps: [
          {
            id: 'client-categories',
            title: 'Categorías de clientes',
            description: 'Mayorista, minorista, gobierno...',
            href: '/client-categories',
            icon: LayoutGrid,
            completed: hasClientCats,
            tourId: tourIdFor('/client-categories'),
          },
          {
            id: 'clients-list',
            title: 'Registra tus clientes',
            description: 'Tu cartera con datos de contacto y ubicación',
            href: '/clients',
            icon: UsersIcon,
            completed: hasClients,
            tourId: tourIdFor('/clients'),
          },
        ],
      },
      {
        id: 'territory',
        title: 'Equipo y Territorio',
        description: 'Organiza tu fuerza de ventas',
        colorDot: 'bg-violet-500',
        colorBg: 'bg-violet-50',
        colorText: 'text-violet-700',
        colorBorder: 'border-violet-200',
        colorProgress: 'bg-violet-500',
        colorButton: '#6d28d9',
        colorCompletedBg: 'bg-violet-50/40',
        colorCompletedBorder: 'border-violet-200',
        steps: [
          {
            id: 'team',
            title: 'Invita a tu equipo',
            description: 'Agrega vendedores y supervisores',
            href: '/team',
            icon: UserPlus,
            completed: hasTeam,
            tourId: tourIdFor('/team'),
          },
          {
            id: 'zones',
            title: 'Configura zonas',
            description: 'Divide tu territorio de ventas',
            href: '/zones',
            icon: MapPin,
            completed: hasZones,
            tourId: tourIdFor('/zones'),
          },
        ],
      },
      {
        id: 'operations',
        title: 'Operaciones',
        description: '¡A vender!',
        colorDot: 'bg-green-500',
        colorBg: 'bg-green-50',
        colorText: 'text-green-700',
        colorBorder: 'border-green-200',
        colorProgress: 'bg-green-500',
        colorButton: '#15803d',
        colorCompletedBg: 'bg-green-50/40',
        colorCompletedBorder: 'border-green-200',
        steps: [
          {
            id: 'routes',
            title: 'Planifica rutas',
            description: 'Asigna vendedores a zonas y clientes',
            href: '/routes/manage',
            icon: Route,
            completed: hasRoutes,
            tourId: tourIdFor('/routes/manage'),
          },
          {
            id: 'orders',
            title: 'Crea tu primer pedido',
            description: '¡Ya estás listo para vender!',
            href: '/orders',
            icon: ShoppingCart,
            completed: hasOrders,
            tourId: tourIdFor('/orders'),
          },
        ],
      },
    ];

    setPhases(newPhases);

    // Auto-expand first incomplete phase (only if no phases are expanded yet)
    const firstIncomplete = newPhases.find(p => p.steps.some(s => !s.completed));
    if (firstIncomplete) {
      setExpandedPhases(prev => {
        // Respect user's previous expanded state (restored from session)
        if (prev.length > 0) return prev;
        return [firstIncomplete.id];
      });
    }

    // Check if all complete — persist state for floating button
    const allCompleted = newPhases.every(p => p.steps.every(s => s.completed));
    if (allCompleted) {
      setShowConfetti(true);
      localStorage.setItem('onboarding-completed', 'true');
      window.dispatchEvent(new Event('onboarding-completed'));
    } else {
      localStorage.removeItem('onboarding-completed');
    }

    return newPhases;
  }, []);

  // Restore expanded phases from session (if user navigated away and came back)
  const restoredExpanded = useRef(false);
  useEffect(() => {
    if (restoredExpanded.current) return;
    const saved = sessionStorage.getItem('getting-started-expanded');
    if (saved) {
      try { setExpandedPhases(JSON.parse(saved)); } catch { /* ignore */ }
      restoredExpanded.current = true;
    }
  }, []);

  useEffect(() => {
    detectProgress()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [detectProgress]);

  // Restore scroll position after content renders
  useEffect(() => {
    if (loading) return;
    const savedScroll = sessionStorage.getItem('getting-started-scroll');
    if (savedScroll) {
      // Small delay to ensure DOM has rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(savedScroll));
      });
    }
  }, [loading]);

  // Persist scroll position on scroll (throttled)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          sessionStorage.setItem('getting-started-scroll', String(window.scrollY));
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await detectProgress();
    } catch (err) {
      console.error('Error refreshing progress:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('onboarding-completed', 'true');
    window.dispatchEvent(new Event('onboarding-completed'));
    router.push('/dashboard');
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = prev.includes(phaseId)
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId];
      sessionStorage.setItem('getting-started-expanded', JSON.stringify(next));
      return next;
    });
  };

  if (loading) {
    return <BrandedLoadingScreen message="Verificando progreso..." />;
  }

  // Totals
  const totalSteps = phases.reduce((sum, p) => sum + p.steps.length, 0);
  const completedSteps = phases.reduce(
    (sum, p) => sum + p.steps.filter(s => s.completed).length,
    0
  );
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allDone = completedSteps === totalSteps;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        <div className="page-animate">
          <div className="flex items-center gap-2 text-sm mb-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
              Inicio
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Primeros Pasos</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between page-animate page-animate-delay-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Primeros Pasos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configura tu negocio paso a paso
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span className="sm:hidden">Omitir</span>
              <span className="hidden sm:inline">Omitir guía</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 sm:px-8 sm:py-6 max-w-3xl mx-auto w-full space-y-6">

        {/* Global Progress */}
        <div className="page-animate page-animate-delay-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {allDone ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <PartyPopper className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700">{progressPercent}%</span>
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {allDone ? '¡Configuración completa!' : 'Progreso de configuración'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {allDone
                      ? 'Tu negocio está listo para operar'
                      : `${completedSteps} de ${totalSteps} pasos completados`}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: allDone ? '#16a34a' : 'var(--company-primary-color, #2563eb)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Confetti message */}
        {showConfetti && allDone && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center page-animate">
            <p className="text-green-800 font-medium">
              ¡Felicidades! Tu cuenta está completamente configurada.
            </p>
            <p className="text-sm text-green-600 mt-1">
              Puedes ir al{' '}
              <Link href="/dashboard" className="underline font-medium hover:text-green-700">
                Tablero
              </Link>{' '}
              para empezar a trabajar.
            </p>
          </div>
        )}

        {/* Phases */}
        {phases.map((phase, phaseIdx) => {
          const phaseCompleted = phase.steps.every(s => s.completed);
          const phaseStepsCompleted = phase.steps.filter(s => s.completed).length;
          const isExpanded = expandedPhases.includes(phase.id);

          return (
            <div
              key={phase.id}
              className="page-animate"
              style={{ animationDelay: `${(phaseIdx + 3) * 80}ms` }}
            >
              <div className={`border rounded-xl overflow-hidden transition-colors ${
                phaseCompleted
                  ? `${phase.colorCompletedBorder} ${phase.colorCompletedBg}`
                  : `${phase.colorBorder} ${phase.colorBg}`
              }`}>
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left hover:bg-white/50 transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${phaseCompleted ? 'bg-green-500' : phase.colorDot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm ${phaseCompleted ? 'text-gray-500' : phase.colorText}`}>
                        {phase.title}
                      </h3>
                      {phaseCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                    {phaseStepsCompleted}/{phase.steps.length}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Steps (animated accordion) */}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-gray-200/60">
                      {phase.steps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 hover:bg-white transition-colors group"
                        >
                          {/* Check icon */}
                          <div className="flex-shrink-0">
                            {step.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300" />
                            )}
                          </div>

                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-green-50' : phase.colorBg}`}>
                            <step.icon className={`w-4 h-4 ${step.completed ? 'text-green-500' : phase.colorText}`} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {step.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{step.description}</p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!step.completed && step.tourId && (
                              <button
                                onClick={() => {
                                  scheduleTourContinuation(step.tourId!);
                                  router.push(step.href);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border hover:opacity-90"
                                style={{
                                  color: phase.colorButton,
                                  borderColor: phase.colorButton,
                                  backgroundColor: 'transparent',
                                }}
                                title="Ir con tour guiado"
                              >
                                <Compass className="w-3 h-3" />
                                <span className="hidden sm:inline">Guiar</span>
                              </button>
                            )}
                            {!step.completed && (
                              <Link
                                href={step.href}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap text-white hover:opacity-90"
                                style={{ backgroundColor: phase.colorButton }}
                              >
                                Ir
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            )}
                            {step.completed && step.tourId && (
                              <button
                                onClick={() => {
                                  scheduleTourContinuation(step.tourId!);
                                  router.push(step.href);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Repetir tour guiado"
                              >
                                <Compass className="w-3 h-3" />
                                <span className="hidden sm:inline">Tour</span>
                              </button>
                            )}
                            {step.completed && (
                              <Link
                                href={step.href}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                Ver
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Help text */}
        <div className="text-center py-4 page-animate page-animate-delay-4">
          <p className="text-xs text-gray-400">
            El progreso se detecta automáticamente. Puedes volver a esta página en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
