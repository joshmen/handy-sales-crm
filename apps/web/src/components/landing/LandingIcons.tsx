/**
 * Premium SVG icons for the Handy Suites landing page.
 * "Polished Glass" aesthetic — gradient fills, soft shadows, layered translucency.
 * Each icon has its own color identity within a cohesive palette.
 * viewBox 48x48 for detail; default render size 44px.
 */

interface IconProps {
  className?: string;
  size?: number;
}

/** CRM & Clientes — overlapping person silhouettes with gradient depth */
export function IconCRM({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="crm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="crm-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <radialGradient id="crm-head" cx="0.5" cy="0.35" r="0.5">
          <stop offset="0%" stopColor="#fff1f2" />
          <stop offset="100%" stopColor="#fecdd3" />
        </radialGradient>
        <filter id="crm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#e11d48" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Back person */}
      <circle cx="30" cy="14" r="5.5" fill="url(#crm-back)" opacity="0.7" />
      <path d="M20 38c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="url(#crm-back)" opacity="0.5" />
      {/* Front person */}
      <circle cx="20" cy="16" r="6.5" fill="url(#crm-head)" filter="url(#crm-shadow)" />
      <path d="M8 42c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="url(#crm-body)" filter="url(#crm-shadow)" />
      {/* Subtle highlight on head */}
      <circle cx="18" cy="14" r="2.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/** Ventas & Pedidos — receipt with checkmark badge */
export function IconSales({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="sales-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sales-check" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="sales-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4f46e5" floodOpacity="0.25" />
        </filter>
        <filter id="sales-check-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#059669" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Shadow document */}
      <rect x="14" y="6" width="24" height="34" rx="4" fill="#c7d2fe" />
      {/* Main document */}
      <rect x="10" y="3" width="24" height="34" rx="4" fill="url(#sales-doc)" filter="url(#sales-shadow)" />
      {/* Document lines */}
      <line x1="16" y1="12" x2="28" y2="12" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="18" x2="26" y2="18" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="24" x2="24" y2="24" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Highlight strip */}
      <rect x="10" y="3" width="4" height="34" rx="4" fill="white" opacity="0.1" />
      {/* Check badge */}
      <circle cx="34" cy="34" r="9" fill="url(#sales-check)" filter="url(#sales-check-glow)" />
      <path d="M29.5 34l3 3 5.5-5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rutas & Logistica — map pin on gradient path */
export function IconRoutes({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="routes-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="routes-path" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <filter id="routes-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#059669" floodOpacity="0.3" />
        </filter>
        <radialGradient id="routes-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#d1fae5" />
        </radialGradient>
      </defs>
      {/* Route path */}
      <path d="M8 40c0-7 6-5 8-12s6-6 8-14" stroke="url(#routes-path)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 5" />
      {/* Small dot at route start */}
      <circle cx="8" cy="40" r="3" fill="#a7f3d0" />
      {/* Pin ground shadow */}
      <ellipse cx="30" cy="42" rx="6" ry="2" fill="#059669" opacity="0.15" />
      {/* Pin body */}
      <path d="M30 6c-6.1 0-11 4.9-11 11 0 8.3 11 20 11 20s11-11.7 11-20c0-6.1-4.9-11-11-11z" fill="url(#routes-pin)" filter="url(#routes-shadow)" />
      {/* Pin inner circle */}
      <circle cx="30" cy="17" r="5" fill="url(#routes-glow)" />
      <circle cx="30" cy="17" r="2.5" fill="#059669" />
      {/* Highlight on pin */}
      <ellipse cx="26" cy="12" rx="2" ry="3" fill="white" opacity="0.25" transform="rotate(-15 26 12)" />
    </svg>
  );
}

/** Facturacion — layered document with currency badge */
export function IconInvoice({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="inv-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="inv-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="inv-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#d97706" floodOpacity="0.25" />
        </filter>
        <filter id="inv-badge-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#d97706" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Back document */}
      <rect x="15" y="6" width="22" height="32" rx="3.5" fill="#fde68a" opacity="0.7" />
      {/* Main document */}
      <rect x="10" y="3" width="22" height="32" rx="3.5" fill="url(#inv-doc)" filter="url(#inv-shadow)" />
      {/* Highlight edge */}
      <rect x="10" y="3" width="3.5" height="32" rx="3.5" fill="white" opacity="0.2" />
      {/* Document lines */}
      <line x1="16" y1="11" x2="26" y2="11" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="17" x2="24" y2="17" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="16" y1="23" x2="22" y2="23" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Currency badge */}
      <circle cx="34" cy="34" r="9.5" fill="url(#inv-badge)" filter="url(#inv-badge-glow)" />
      <text x="34" y="39" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold" fontFamily="system-ui">$</text>
      {/* Badge shine */}
      <ellipse cx="31" cy="30" rx="3" ry="4" fill="white" opacity="0.15" transform="rotate(-20 31 30)" />
    </svg>
  );
}

/** Control en campo — GPS crosshair with animated pulse */
export function IconFieldControl({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <radialGradient id="fc-center" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
        <linearGradient id="fc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="fc-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx="24" cy="24" r="18" stroke="#e0e7ff" strokeWidth="2.5" fill="none" />
      {/* Middle ring */}
      <circle cx="24" cy="24" r="12" stroke="url(#fc-ring)" strokeWidth="2.5" fill="none" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="5" fill="url(#fc-center)" filter="url(#fc-glow)" />
      {/* Crosshair lines */}
      <line x1="24" y1="2" x2="24" y2="10" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="46" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="24" x2="10" y2="24" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="24" x2="46" y2="24" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      {/* Pulse ring animation */}
      <circle cx="24" cy="24" r="5" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.5">
        <animate attributeName="r" values="5;16;5" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Second pulse (offset) */}
      <circle cx="24" cy="24" r="5" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="5;20;5" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
      </circle>
    </svg>
  );
}

/** Reduce cartera — descending bar chart with trend line */
export function IconReduceDebt({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="rd-bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id="rd-bar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="rd-bar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="rd-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </linearGradient>
        <filter id="rd-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#059669" floodOpacity="0.15" />
        </filter>
      </defs>
      {/* Chart background */}
      <rect x="3" y="5" width="42" height="36" rx="5" fill="url(#rd-bg)" filter="url(#rd-shadow)" />
      {/* Grid lines */}
      <line x1="8" y1="16" x2="40" y2="16" stroke="#d1fae5" strokeWidth="1" />
      <line x1="8" y1="24" x2="40" y2="24" stroke="#d1fae5" strokeWidth="1" />
      <line x1="8" y1="32" x2="40" y2="32" stroke="#d1fae5" strokeWidth="1" />
      {/* Bars (descending = debt going down) */}
      <rect x="10" y="14" width="6" height="20" rx="2" fill="url(#rd-bar1)" />
      <rect x="21" y="20" width="6" height="14" rx="2" fill="url(#rd-bar2)" />
      <rect x="32" y="26" width="6" height="8" rx="2" fill="url(#rd-bar3)" />
      {/* Trend line */}
      <path d="M13 13l11 8 10-3" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow at end of trend */}
      <path d="M31 18l3 0 0-3" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Facturacion rapida — lightning bolt with energy glow */
export function IconFastInvoice({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <radialGradient id="fi-bg" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="70%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </radialGradient>
        <linearGradient id="fi-bolt" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="fi-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.4" />
        </filter>
        <filter id="fi-bolt-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#92400e" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Glow circle */}
      <circle cx="24" cy="24" r="20" fill="url(#fi-bg)" filter="url(#fi-glow)" />
      {/* Energy ring */}
      <circle cx="24" cy="24" r="18" stroke="#fde68a" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Lightning bolt */}
      <path d="M26 4L15 24h7l-2 18L32 22h-7L26 4z" fill="url(#fi-bolt)" filter="url(#fi-bolt-shadow)" />
      {/* Bolt highlight */}
      <path d="M25 8L17.5 23h5l-1.2 11L30 23.5h-5L25 8z" fill="#fcd34d" opacity="0.5" />
      {/* Spark dots */}
      <circle cx="12" cy="14" r="1.5" fill="#fbbf24" opacity="0.6" />
      <circle cx="37" cy="18" r="1.2" fill="#fbbf24" opacity="0.5" />
      <circle cx="10" cy="30" r="1" fill="#fcd34d" opacity="0.4" />
      <circle cx="38" cy="32" r="1.3" fill="#fcd34d" opacity="0.5" />
    </svg>
  );
}

/** Funciona sin internet — cloud with sync arrows and green check */
export function IconOffline({ className, size = 44 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="off-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="off-check-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="off-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4f46e5" floodOpacity="0.25" />
        </filter>
        <filter id="off-check-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#059669" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Cloud body */}
      <path d="M12 34h20a8.5 8.5 0 10-2-16.8A11.5 11.5 0 008.5 22 6.5 6.5 0 0012 34z" fill="url(#off-cloud)" filter="url(#off-shadow)" />
      {/* Cloud highlight */}
      <path d="M14 20a8.5 8.5 0 0116-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      {/* Sync arrows */}
      <path d="M17 24l-3 3 3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 21l3-3-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 27h10" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M20 18h10" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* Green check badge */}
      <circle cx="36" cy="36" r="8" fill="url(#off-check-bg)" filter="url(#off-check-glow)" />
      <path d="M32.5 36l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Badge shine */}
      <ellipse cx="34" cy="33" rx="2" ry="3" fill="white" opacity="0.15" transform="rotate(-15 34 33)" />
    </svg>
  );
}
