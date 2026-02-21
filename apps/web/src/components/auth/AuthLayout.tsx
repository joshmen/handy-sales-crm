'use client';

import { CheckCircle, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

/* Apple logo SVG — azul App Store oficial */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className}>
      <path fill="#007AFF" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

/* Google Play logo SVG — colores oficiales */
function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className}>
      <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" />
      <path fill="#34A853" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
      <path fill="#FBBC04" d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z" />
      <path fill="#EA4335" d="M104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ===== Panel izquierdo — Vendedor de ruta (hidden en mobile) ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Imagen de fondo — vendedor de ruta */}
        <img
          src="/images/login-salesperson.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay gradiente — claro arriba (cara), oscuro abajo (texto) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/30" />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo (arriba) */}
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="" className="w-14 h-14" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight">Handy</span>
              <span className="text-3xl font-normal text-white/70 tracking-tight">
                Suites<sup className="text-xs">&reg;</sup>
              </span>
            </div>
          </div>

          {/* Bloque inferior: headline + checks + stores */}
          <div className="space-y-7">
            <h2
              className={`text-6xl font-bold leading-[1.1] drop-shadow-lg ${spaceGrotesk.className}`}
            >
              Gestiona tu negocio
              <br />
              desde cualquier lugar
            </h2>
            <p className="text-white/70 text-xl max-w-[440px] drop-shadow">
              La plataforma que conecta tu equipo de ventas en campo con tu
              operación en oficina.
            </p>

            {/* Value props con checks verdes */}
            <ul className="space-y-4 text-xl">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0 drop-shadow" />
                <span className="text-white/90 drop-shadow">
                  CRM y gestión de clientes
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0 drop-shadow" />
                <span className="text-white/90 drop-shadow">
                  Rutas y entregas optimizadas
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0 drop-shadow" />
                <span className="text-white/90 drop-shadow">
                  Facturación electrónica SAT
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0 drop-shadow" />
                <span className="text-white/90 drop-shadow">
                  Reportes en tiempo real
                </span>
              </li>
            </ul>

            {/* Dispositivos + tiendas */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Web/tablet/móvil */}
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5">
                <Monitor className="w-5 h-5 text-white/80" />
                <Tablet className="w-5 h-5 text-white/80" />
                <Smartphone className="w-5 h-5 text-white/80" />
                <span className="text-sm text-white/60 ml-0.5">Web, tablet y móvil</span>
              </div>
              {/* App Store */}
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5">
                <AppleIcon className="w-5 h-5" />
                <span className="text-sm text-white/60">App Store</span>
              </div>
              {/* Google Play */}
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5">
                <PlayStoreIcon className="w-5 h-5" />
                <span className="text-sm text-white/60">Google Play</span>
              </div>
            </div>

            {/* Social proof */}
            <p className="text-base text-white/40 drop-shadow">
              Más de 500 empresas confían en Handy Suites&reg;
            </p>
          </div>
        </div>
      </div>

      {/* ===== Panel derecho — Form ===== */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top bar */}
        <div className="px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 lg:hidden">
            <img src="/logo-icon.svg" alt="" className="w-8 h-8" />
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-black text-gray-900 tracking-tight">
                Handy
              </span>
              <span className="text-[18px] font-normal text-gray-400 tracking-tight">
                Suites<sup className="text-[10px] text-gray-400">&reg;</sup>
              </span>
            </div>
          </a>
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors ml-auto"
          >
            &larr; Volver al inicio
          </a>
        </div>

        {/* Form centrado */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center text-xs text-gray-400">
          &copy; 2026 Handy Suites&reg; — Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}
