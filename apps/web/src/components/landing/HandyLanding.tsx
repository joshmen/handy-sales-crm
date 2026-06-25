'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { cn } from '@/lib/utils';
import { API_CONFIG } from '@/lib/constants';
import type { SubscriptionPlan } from '@/types/subscription';
import LandingAuthModal, { type AuthTab } from './LandingAuthModal';

const SHOTS = [
  { t: 'tablero', label: 'Tablero' },
  { t: 'clientes', label: 'Clientes' },
  { t: 'cobranza', label: 'Cobranza' },
  { t: 'pedidos', label: 'Pedidos' },
  { t: 'rutas', label: 'Rutas' },
  { t: 'reportes', label: 'Reportes' },
  { t: 'facturas', label: 'Facturación' },
];

const FAQS = [
  { q: '¿Necesito instalar algo?', a: 'La plataforma web funciona en cualquier navegador, sin instalar nada. Para el equipo en campo hay app móvil en App Store y Google Play.' },
  { q: '¿Es compatible con CFDI 4.0 y el SAT?', a: 'Sí. La facturación electrónica está integrada y timbra con un PAC autorizado. Solo necesitas tu Certificado de Sello Digital. Disponible para México.' },
  { q: '¿Funciona sin internet?', a: 'Sí. La app captura pedidos, visitas y cobros sin conexión. Todo se sincroniza solo cuando vuelve la señal.' },
  { q: '¿Puedo migrar mis datos?', a: 'Importa clientes, productos e inventario desde Excel o CSV. Te ayudamos con la migración sin costo.' },
  { q: '¿Hay permanencia mínima?', a: 'No. Cancela cuando quieras, sin penalizaciones. Tu información siempre es tuya.' },
];

interface DisplayPlan {
  codigo: string;
  name: string;
  desc: string;
  price: string;
  per: string;
  amtSmall?: boolean;
  features: string[];
  cta: string;
  ctaClass: string;
  pop?: boolean;
  tag?: string;
  action: 'registro' | 'contact';
}

const DEFAULT_PLANS: DisplayPlan[] = [
  { codigo: 'BASIC', name: 'Básico', desc: 'Para negocios que apenas se digitalizan.', price: '499', per: 'MXN / mes', features: ['Hasta 3 usuarios', 'CRM y clientes', 'Pedidos y ventas', 'Facturación electrónica'], cta: 'Empezar', ctaClass: 'btn-out-ink', action: 'registro' },
  { codigo: 'PRO', name: 'Pro', desc: 'Para equipos de venta en crecimiento.', price: '999', per: 'MXN / mes', features: ['Hasta 15 usuarios', 'Todo de Básico', 'Rutas y logística', 'Reportes avanzados', 'Soporte prioritario'], cta: 'Comenzar prueba', ctaClass: 'btn-pri', pop: true, tag: '★ Más popular', action: 'registro' },
  { codigo: 'ENTERPRISE', name: 'Enterprise', desc: 'Para empresas con necesidades a la medida.', price: 'A tu medida', per: 'Hablemos', amtSmall: true, features: ['Usuarios ilimitados', 'Todo de Pro', 'Multi-sucursal', 'API e integraciones', 'SLA garantizado'], cta: 'Contactar', ctaClass: 'btn-out-ink', action: 'contact' },
];

function Check({ size = 17, w = 2.5 }: { size?: number; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function countUp(el: HTMLElement) {
  const raw = el.dataset.cu || el.textContent || '';
  el.dataset.cu = raw;
  const m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!m) return;
  const pre = m[1];
  const numStr = m[2];
  const suf = m[3];
  const dec = (numStr.split('.')[1] || '').length;
  const target = parseFloat(numStr.replace(/,/g, ''));
  if (Number.isNaN(target)) return;
  let t0: number | null = null;
  const fmt = (v: number) => pre + (dec ? v.toFixed(dec) : Math.round(v).toString()) + suf;
  const step = (ts: number) => {
    if (t0 === null) t0 = ts;
    const p = Math.min((ts - t0) / 1100, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * e);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = raw;
  };
  requestAnimationFrame(step);
}

export default function HandyLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeShot, setActiveShot] = useState('tablero');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<DisplayPlan[]>(DEFAULT_PLANS);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('login');

  const openAuth = (tab: AuthTab) => {
    setAuthTab(tab);
    setAuthOpen(true);
    setMobileOpen(false);
  };
  const closeAuth = () => setAuthOpen(false);

  // Planes reales (sobrescribe nombre + precio; conserva copy/features del diseño).
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_CONFIG.BASE_URL}/api/subscription/plans`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('plans'))))
      .then((api: SubscriptionPlan[]) => {
        if (!Array.isArray(api) || api.length < 2) return;
        const sorted = [...api].sort((a, b) => a.orden - b.orden);
        setPlans((prev) =>
          prev.map((p, i) => {
            const a = sorted[i];
            if (!a) return p;
            return { ...p, name: a.nombre || p.name, price: a.precioMensual > 0 ? String(a.precioMensual) : p.price };
          }),
        );
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Scroll-reveal: añade .in a los .rv al entrar al viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -5% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up de las estadísticas (respeta prefers-reduced-motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.band b'));
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            countUp(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollToId = (id: string) => {
    const el = rootRef.current?.querySelector(id) as HTMLElement | null;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: reduce ? 'auto' : 'smooth' });
  };
  const navTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileOpen(false);
    scrollToId(id);
  };

  const onPlanCta = (p: DisplayPlan) => {
    if (p.action === 'contact') {
      window.location.href = 'mailto:ventas@handysuites.com?subject=Plan%20Enterprise';
    } else {
      openAuth('registro');
    }
  };

  return (
    <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}>
      <div className="hsl" ref={rootRef}>
        {/* Announcement */}
        <div className="ann">
          Handy Suites ya está en toda Latinoamérica.{' '}
          <a href="#features" onClick={(e) => navTo(e, '#features')}>Conoce las novedades</a>
        </div>

        {/* Nav */}
        <nav className="nav">
          <div className="wrap">
            <a className="brand" href="#top" onClick={(e) => navTo(e, '#top')}>
              <img src="/logo-icon.svg" alt="Handy Suites" />
              <b>Handy Suites<sup>®</sup></b>
            </a>
            <div className="nav-links">
              <a href="#features" onClick={(e) => navTo(e, '#features')}>Producto</a>
              <a href="#showcase" onClick={(e) => navTo(e, '#showcase')}>Soluciones</a>
              <a href="#pricing" onClick={(e) => navTo(e, '#pricing')}>Precios</a>
              <a href="#faq" onClick={(e) => navTo(e, '#faq')}>Recursos</a>
            </div>
            <div className="nav-right">
              <button type="button" className="nav-login" onClick={() => openAuth('login')}>Entrar</button>
              <button type="button" className="btn btn-pri btn-sm" onClick={() => openAuth('registro')}>Probar gratis</button>
              <button type="button" className="nav-burger" aria-label="Menú" aria-expanded={mobileOpen} aria-controls="hsl-nav-mobile" onClick={() => setMobileOpen((v) => !v)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </div>
          </div>
          <div className={cn('nav-mobile', mobileOpen && 'open')} id="hsl-nav-mobile">
            <a href="#features" onClick={(e) => navTo(e, '#features')}>Producto</a>
            <a href="#showcase" onClick={(e) => navTo(e, '#showcase')}>Soluciones</a>
            <a href="#pricing" onClick={(e) => navTo(e, '#pricing')}>Precios</a>
            <a href="#faq" onClick={(e) => navTo(e, '#faq')}>Recursos</a>
            <button type="button" className="nav-mobile-btn" onClick={() => openAuth('login')}>Entrar</button>
          </div>
        </nav>
        <span id="top" />

        {/* Hero */}
        <header className="hero">
          <div className="hero-top wrap">
            <div className="hero-eye">Plataforma de ventas en ruta</div>
            <h1>
              Vende en la calle. <span className="ac">Cobra hoy.</span>
            </h1>
            <p className="hero-sub">
              Pedidos, cobranza, rutas y facturación en una sola plataforma. Tu equipo en campo y tu oficina ven lo mismo, al mismo tiempo. Funciona aunque no haya señal.
            </p>
            <div className="hero-cta">
              <button type="button" className="btn btn-white btn-lg" onClick={() => openAuth('registro')}>Empieza gratis 14 días</button>
              <a className="btn btn-out btn-lg" href="#showcase" onClick={(e) => navTo(e, '#showcase')}>Ver la plataforma</a>
            </div>
            <div className="hero-trust">
              <span><Check size={15} w={2.6} /> Sin tarjeta de crédito</span>
              <span><Check size={15} w={2.6} /> Soporte incluido</span>
              <span><Check size={15} w={2.6} /> Cancela cuando quieras</span>
            </div>
          </div>
          <div className="hero-photos">
            <img className="photo" src="/images/landing/hero-1.jpg" alt="Vendedor en ruta" />
            <img className="photo" src="/images/landing/hero-2.jpg" alt="Tienda y cliente" />
            <img className="photo" src="/images/landing/hero-3.jpg" alt="Equipo de ventas" />
            <img className="photo" src="/images/landing/hero-4.jpg" alt="Reparto" />
            <button type="button" className="ask-chip" onClick={(e) => navTo(e, '#faq')}>
              <span className="b">H</span> Pregúntale a Handy
            </button>
          </div>
        </header>
        <div className="bleed-pad" />

        {/* Logos */}
        <section className="logos">
          <div className="wrap">
            <p>Empresas que ya venden con Handy Suites</p>
            <div className="logos-row">
              <span>Productos Caseros Jeyma</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="sec" id="features">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Producto</span>
              <h2>Toda tu operación en una sola plataforma.</h2>
              <p>Desde que el cliente pide hasta que la factura queda timbrada. Sin brincar entre apps ni cuadernos.</p>
            </div>
            <div className="feat-grid rv">
              <div className="feat">
                <div className="feat-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.4 12.4a1.5 1.5 0 001.5 1.2h8.2a1.5 1.5 0 001.5-1.2L21 7H6" /></svg>
                </div>
                <h3>Pedidos en segundos</h3>
                <p>Catálogo, precios y descuentos por volumen automáticos. El vendedor cierra sin calculadora.</p>
              </div>
              <div className="feat">
                <div className="feat-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></svg>
                </div>
                <h3>Cobra a tiempo</h3>
                <p>Alertas de cobranza y estado de cuenta al día. Los negocios con Handy recuperan hasta 40% más rápido.</p>
              </div>
              <div className="feat">
                <div className="feat-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H15a3.5 3.5 0 010 7H9a3.5 3.5 0 000 7h6.5" /></svg>
                </div>
                <h3>Rutas claras</h3>
                <p>Asigna recorridos, monitorea visitas y ajusta sobre el mapa, en vivo.</p>
              </div>
              <div className="feat">
                <div className="feat-ic">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
                </div>
                <h3>Facturación CFDI 4.0</h3>
                <p>Timbra ante el SAT desde la misma plataforma. PAC autorizado, sin software extra.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="sec sec-sky" id="showcase">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Cómo se ve</span>
              <h2>Hecho para el escritorio y para la banqueta.</h2>
              <p>El administrador controla todo desde la web. El vendedor ejecuta desde el teléfono.</p>
            </div>
            <div className="show rv">
              <div className="show-media">
                <div className="shot-tabs" role="tablist" aria-label="Vistas de la plataforma">
                  {SHOTS.map((s) => (
                    <button key={s.t} type="button" role="tab" id={`tab-${s.t}`} aria-selected={activeShot === s.t} aria-controls={`panel-${s.t}`} className={cn(activeShot === s.t && 'on')} onClick={() => setActiveShot(s.t)}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="browser">
                  <div className="browser-bar">
                    <i style={{ background: '#FF5F57' }} /><i style={{ background: '#FEBC2E' }} /><i style={{ background: '#28C840' }} />
                    <span className="u">app.handysuites.com</span>
                  </div>
                  {SHOTS.map((s) => (
                    <div key={s.t} role="tabpanel" id={`panel-${s.t}`} aria-labelledby={`tab-${s.t}`} hidden={activeShot !== s.t} className={cn('shot-pane', activeShot === s.t && 'on')} data-p={s.t}>
                      <img className="shot-img" src={`/images/landing/shot-${s.t}.png`} alt={`Vista de ${s.label}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="show-tag">Web · Administración</span>
                <h3>Conoce a cada cliente sin abrir un Excel.</h3>
                <p>Historial, saldos, zona y categoría en una sola vista que carga al instante.</p>
                <ul>
                  <li><Check size={18} w={2.4} /> Cartera y cobranza al día</li>
                  <li><Check size={18} w={2.4} /> Clientes por zona y categoría</li>
                  <li><Check size={18} w={2.4} /> Reportes y metas por vendedor</li>
                </ul>
                <button type="button" className="show-link" onClick={() => openAuth('registro')}>Explorar la web</button>
              </div>
            </div>
            <div className="show show-rev rv">
              <div>
                <span className="show-tag">Móvil · Campo</span>
                <h3>El vendedor trabaja desde la banqueta.</h3>
                <p>Levanta pedidos, registra cobros y completa visitas desde el celular, aunque no haya señal. Lista para Play Store y App Store.</p>
                <ul>
                  <li><Check size={18} w={2.4} /> Captura sin conexión, se sincroniza sola</li>
                  <li><Check size={18} w={2.4} /> Ruta del día con mapa y check-in</li>
                  <li><Check size={18} w={2.4} /> Ticket impreso 80mm por bluetooth</li>
                </ul>
                <button type="button" className="show-link" onClick={() => openAuth('registro')}>Conocer la app</button>
              </div>
              <div className="show-media">
                <div className="phone">
                  <div className="phone-scr">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>Mar 27 May</div>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>Hola, Carlos</div>
                      </div>
                      <div className="av" style={{ borderRadius: '50%', background: 'var(--blue)', color: '#fff' }}>C</div>
                    </div>
                    <div style={{ borderRadius: 16, background: 'var(--blue-2)', color: '#fff', padding: 15 }}>
                      <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 700, textTransform: 'uppercase' }}>Vendido hoy</div>
                      <div style={{ fontSize: 30, fontWeight: 900, margin: '3px 0 10px', letterSpacing: '-0.03em' }}>$8,420</div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,.25)', borderRadius: 7 }}>
                        <div style={{ width: '70%', height: '100%', background: 'var(--accent)', borderRadius: 7 }} />
                      </div>
                      <div style={{ fontSize: 9, opacity: 0.9, marginTop: 7, fontWeight: 600 }}>70% DE TU META · $12,000</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 11 }}>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 13, padding: 11, background: '#fff' }}>
                        <div style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>Visitas</div>
                        <div style={{ fontSize: 17, fontWeight: 900 }}>6/10</div>
                      </div>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 13, padding: 11, background: '#fff' }}>
                        <div style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>Por cobrar</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--blue)' }}>$5K</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                      <div style={{ flex: 1, borderRadius: 12, background: 'var(--blue)', color: '#fff', textAlign: 'center', padding: 12, fontWeight: 800, fontSize: 12 }}>Vender</div>
                      <div style={{ flex: 1, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', textAlign: 'center', padding: 12, fontWeight: 800, fontSize: 12 }}>Cobrar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="band rv">
          <div className="wrap">
            <div><b>99.9%</b><div className="l">Uptime garantizado</div></div>
            <div><b>40%</b><div className="l">Menos cartera vencida</div></div>
            <div><b>24/7</b><div className="l">Soporte incluido</div></div>
          </div>
        </section>

        {/* Roles */}
        <section className="sec" id="roles">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Para cada quien</span>
              <h2>Una plataforma, tres formas de usarla.</h2>
              <p>Cada rol ve exactamente lo que necesita para hacer su trabajo.</p>
            </div>
            <div className="roles rv">
              <div className="role">
                <div className="rk"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><path d="M9 21V12h6v9" /></svg></div>
                <h3>Administrador</h3>
                <div className="sub">La oficina</div>
                <ul>
                  <li><Check /> Tablero y reportes del negocio</li>
                  <li><Check /> Catálogo, precios y clientes</li>
                  <li><Check /> Facturación CFDI y cobranza</li>
                </ul>
              </div>
              <div className="role">
                <div className="rk"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /></svg></div>
                <h3>Supervisor</h3>
                <div className="sub">El campo</div>
                <ul>
                  <li><Check /> Monitorea rutas y vendedores</li>
                  <li><Check /> Metas y desempeño del equipo</li>
                  <li><Check /> GPS e historial de visitas</li>
                </ul>
              </div>
              <div className="role">
                <div className="rk"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg></div>
                <h3>Vendedor</h3>
                <div className="sub">La banqueta</div>
                <ul>
                  <li><Check /> Levanta pedidos y cobra</li>
                  <li><Check /> Su ruta del día con mapa</li>
                  <li><Check /> Imprime ticket, funciona offline</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CFDI */}
        <section className="sec sec-sky" id="cfdi">
          <div className="wrap">
            <div className="billing-feat rv">
              <div>
                <span className="show-tag">Facturación</span>
                <h3>Timbra CFDI 4.0 sin salir de Handy.</h3>
                <p>Genera facturas desde tus pedidos y timbra ante el SAT con un PAC autorizado. Tus clientes reciben su CFDI al momento, impreso y por correo.</p>
                <div className="billing-badges">
                  <span className="bbadge"><Check size={16} w={2.2} /> PAC autorizado</span>
                  <span className="bbadge"><Check size={16} w={2.2} /> CFDI 4.0</span>
                  <span className="bbadge"><Check size={16} w={2.2} /> Series y folios</span>
                  <span className="bbadge"><Check size={16} w={2.2} /> Portal de autofactura</span>
                </div>
              </div>
              <div className="show-media">
                <div className="browser">
                  <div className="browser-bar">
                    <i style={{ background: '#FF5F57' }} /><i style={{ background: '#FEBC2E' }} /><i style={{ background: '#28C840' }} />
                    <span className="u">app.handysuites.com/facturacion</span>
                  </div>
                  <img className="shot-img" src="/images/landing/shot-facturas.png" alt="Facturación CFDI" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Arranque / steps */}
        <section className="sec sec-sky" id="arranque-sec">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Arranque</span>
              <h2>De cero a vendiendo en una tarde.</h2>
            </div>
            <div className="steps rv">
              <div className="step"><div className="num">1</div><h3>Regístrate</h3><p>Crea tu cuenta en 2 minutos. Sin tarjeta y sin llamadas de ventas.</p></div>
              <div className="step"><div className="num">2</div><h3>Carga tu catálogo</h3><p>Importa clientes y productos desde Excel, o empieza con el asistente.</p></div>
              <div className="step"><div className="num">3</div><h3>Sal a vender</h3><p>Tu equipo levanta pedidos desde el primer día. Tú ves todo en vivo.</p></div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="sec">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Clientes</span>
              <h2>Lo que dicen quienes ya venden con Handy.</h2>
            </div>
            <div className="tmonial rv">
              <div className="stars" role="img" aria-label="5 de 5 estrellas">★★★★★</div>
              <blockquote>
                &ldquo;Bajamos el tiempo de facturación 80% y dejamos de perder ventas por no entregar factura al momento. Nuestros repartidores levantan pedidos de salsa en cada tienda aunque no haya señal, y la oficina ve todo en vivo.&rdquo;
              </blockquote>
              <div className="by">
                <div className="av" style={{ width: 84, height: 84, borderRadius: 16, fontSize: 30 }}>J</div>
                <div style={{ textAlign: 'left' }}>
                  <b>Productos Caseros Jeyma</b>
                  <span>Abraham Mendoza · Gerente de Ventas</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="sec" id="pricing">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Precios</span>
              <h2>Invierte en crecer, no en software.</h2>
              <p>14 días gratis. Sin tarjeta. Cancela cuando quieras.</p>
            </div>
            <div className="prices rv">
              {plans.map((p) => (
                <div key={p.codigo} className={cn('price', p.pop && 'pop')}>
                  {p.tag && <span className="price-tag">{p.tag}</span>}
                  <div className="price-name">{p.name}</div>
                  <div className="price-desc">{p.desc}</div>
                  <div className="price-amt" style={p.amtSmall ? { fontSize: 34 } : undefined}>
                    {p.amtSmall ? p.price : <><sup>$</sup>{p.price}</>}
                  </div>
                  <div className="price-per">{p.per}</div>
                  <ul>
                    {p.features.map((f) => (
                      <li key={f}><Check /> {f}</li>
                    ))}
                  </ul>
                  <button type="button" className={cn('btn', p.ctaClass)} onClick={() => onPlanCta(p)}>{p.cta}</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sec sec-sky" id="faq">
          <div className="wrap">
            <div className="sec-head rv">
              <span className="n">Recursos</span>
              <h2>Preguntas frecuentes</h2>
            </div>
            <div className="faq rv">
              {FAQS.map((f, i) => (
                <div key={f.q} className="faq-i" data-open={openFaq === i ? '' : undefined}>
                  <button className="faq-q" id={`faq-q-${i}`} aria-expanded={openFaq === i} aria-controls={`faq-panel-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {f.q}<i aria-hidden="true">+</i>
                  </button>
                  <div className="faq-a" id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                    <div><p>{f.a}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="cta">
          <div className="wrap">
            <h2>Deja de perder ventas.</h2>
            <p>14 días gratis. Sin tarjeta. Cancela cuando quieras.</p>
            <button type="button" className="btn btn-white btn-lg" onClick={() => openAuth('registro')}>Empieza ahora</button>
          </div>
        </section>

        {/* Footer */}
        <footer className="foot">
          <div className="wrap">
            <div className="foot-top">
              <div className="foot-brand">
                <div className="fb">
                  <img src="/logo-icon.svg" alt="Handy Suites" />
                  <b>Handy Suites<sup style={{ fontSize: 9 }}>®</sup></b>
                </div>
                <p>La plataforma de ventas en ruta para PYMEs en Latinoamérica.</p>
                <div className="foot-social">
                  <a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h2.5l.5-3H14V9z" /></svg></a>
                  <a href="#" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a>
                  <a href="#" aria-label="WhatsApp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3a3 3 0 00-1 2.3c0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2 1.8.7 2.2.6 2.6.6.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.2-.2-.4-.3z" /></svg></a>
                </div>
                <div className="foot-stores">
                  <a className="foot-store" href="#"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 3c.1 1-.3 1.9-.9 2.6-.6.7-1.6 1.3-2.5 1.2-.1-1 .4-1.9.9-2.5.6-.7 1.7-1.2 2.5-1.3zM18.5 17c-.4 1-.9 1.9-1.7 2.7-.7.7-1.5 1.3-2.4 1.3-.8 0-1.1-.5-2.1-.5s-1.3.5-2.1.5c-.9 0-1.6-.6-2.3-1.3C5.8 18 4.7 14.7 6 12.4c.7-1.2 1.9-1.9 3.1-1.9.9 0 1.7.6 2.1.6.4 0 1.4-.7 2.5-.6.4 0 1.6.2 2.4 1.3-2.1 1.3-1.8 4.2.4 5.2z" /></svg><div><span>Descárgala en</span><b>App Store</b></div></a>
                  <a className="foot-store" href="#"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3l11 6.5-2.4 2.4L4 3zm0 18l8.6-8.9L15 14.5 4 21zm12.5-7.3L13.8 11l2.7-2.7 3.2 1.9c.9.5.9 1.6 0 2.1l-3.2 1.4z" /></svg><div><span>Disponible en</span><b>Google Play</b></div></a>
                </div>
              </div>
              <div>
                <h4>Producto</h4>
                <ul>
                  <li><a href="#features" onClick={(e) => navTo(e, '#features')}>Características</a></li>
                  <li><a href="#pricing" onClick={(e) => navTo(e, '#pricing')}>Precios</a></li>
                  <li><a href="#showcase" onClick={(e) => navTo(e, '#showcase')}>Cómo se ve</a></li>
                </ul>
              </div>
              <div>
                <h4>Empresa</h4>
                <ul>
                  <li><a href="mailto:hola@handysuites.com">Contacto</a></li>
                  <li><a href="mailto:ventas@handysuites.com">Ventas</a></li>
                </ul>
              </div>
              <div>
                <h4>Legal</h4>
                <ul>
                  <li><a href="/privacidad">Privacidad</a></li>
                  <li><a href="/terminos">Términos</a></li>
                </ul>
              </div>
            </div>
            <div className="foot-bot">
              <span>© {new Date().getFullYear()} Handy Suites®</span>
              <span>
                <a href="/privacidad" style={{ color: 'inherit' }}>Privacidad</a> · <a href="/terminos" style={{ color: 'inherit' }}>Términos</a> · Hecho para Latinoamérica
              </span>
            </div>
          </div>
        </footer>

        <LandingAuthModal open={authOpen} tab={authTab} onClose={closeAuth} onTab={setAuthTab} />
      </div>
    </GoogleReCaptchaProvider>
  );
}
