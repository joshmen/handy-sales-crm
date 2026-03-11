/**
 * Multicolor 3D SVG icons for the dashboard sidebar.
 * "Polished Glass" aesthetic — each icon has 2-3 contrasting colors,
 * gradient fills, drop shadows, and white highlights for depth.
 * EVERY icon has a UNIQUE dominant color — no group-based color catalog.
 * viewBox 24x24, default size 22px.
 */

interface IconProps {
  size?: number;
  className?: string;
}

/* ============================================================
   DASHBOARD — Blue grid + emerald & amber accents
   ============================================================ */

export function SbDashboard({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sd-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sd-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="sd-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sd-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1d4ed8" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="url(#sd-a)" filter="url(#sd-s)" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" fill="url(#sd-c)" />
      <rect x="13" y="10" width="8" height="11" rx="2" fill="url(#sd-b)" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="url(#sd-a)" />
      <rect x="4" y="4" width="3" height="2" rx="0.5" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ============================================================
   ORDERS — ORANGE bag + blue check badge
   ============================================================ */

export function SbOrders({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="so-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="so-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="so-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#c2410c" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M6 2L4 6v14a2 2 0 002 2h12a2 2 0 002-2V6l-2-4H6z" fill="url(#so-a)" filter="url(#so-s)" />
      <path d="M4 6h16" stroke="#fdba74" strokeWidth="1.5" />
      <path d="M9 10a3 3 0 006 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="17" cy="17" r="4.5" fill="url(#so-b)" />
      <path d="M15 17l1.5 1.5L19 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="3" width="4" height="1.5" rx="0.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   PAYMENTS — VIOLET card + gold chip
   ============================================================ */

export function SbPayments({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sp-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="sp-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sp-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#6d28d9" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill="url(#sp-a)" filter="url(#sp-s)" />
      <rect x="2" y="9" width="20" height="3" fill="#5b21b6" />
      <rect x="14" y="14" width="5" height="3" rx="1" fill="url(#sp-b)" />
      <rect x="4" y="14" width="4" height="1.5" rx="0.5" fill="white" opacity="0.25" />
      <rect x="4" y="6" width="6" height="2" rx="0.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   CLIENTS — ROYAL BLUE people + pink accent
   ============================================================ */

export function SbClients({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sc-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <filter id="sc-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1e40af" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Back person — pink */}
      <circle cx="17" cy="8" r="3" fill="url(#sc-b)" />
      <path d="M13 21v-2a3 3 0 013-3h2a3 3 0 013 3v2" fill="url(#sc-b)" opacity="0.7" />
      {/* Front person — blue */}
      <circle cx="9" cy="7" r="3.5" fill="url(#sc-a)" filter="url(#sc-s)" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" fill="url(#sc-a)" filter="url(#sc-s)" />
      <circle cx="9" cy="6.5" r="1.5" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ============================================================
   PRODUCTS — AMBER box + red ribbon accent
   ============================================================ */

export function SbProducts({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="spr-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="spr-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <filter id="spr-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b45309" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Box body */}
      <path d="M3 9l9-5 9 5v10l-9 5-9-5V9z" fill="url(#spr-a)" filter="url(#spr-s)" />
      {/* Top face highlight */}
      <path d="M3 9l9 5 9-5" stroke="#fde68a" strokeWidth="1" opacity="0.6" />
      <path d="M12 14v10" stroke="#fde68a" strokeWidth="1" opacity="0.4" />
      {/* Red ribbon/band across */}
      <rect x="5" y="7" width="14" height="3" rx="0.5" fill="url(#spr-b)" transform="rotate(-5 12 8.5)" />
      <path d="M4 9l4-2" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   PRICE LISTS — TEAL tag + rose $ badge
   ============================================================ */

export function SbPriceLists({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="spl-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="spl-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <filter id="spl-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0f766e" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Tag shape */}
      <path d="M2 4a2 2 0 012-2h7.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-7.586 7.586a2 2 0 01-2.828 0L2.586 13A2 2 0 012 11.586V4z" fill="url(#spl-a)" filter="url(#spl-s)" />
      <circle cx="7" cy="7" r="1.5" fill="white" opacity="0.5" />
      {/* $ badge */}
      <circle cx="17" cy="17" r="4.5" fill="url(#spl-b)" />
      <text x="17" y="20" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">$</text>
    </svg>
  );
}

/* ============================================================
   DISCOUNTS — RED % badge + yellow accent (recognizable!)
   ============================================================ */

export function SbDiscounts({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sdi-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="sdi-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <filter id="sdi-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b91c1c" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Red starburst/badge shape */}
      <path d="M12 2l2.4 3.2L18 4l-.5 3.8 3.5 1.7-2.5 2.8L20 16l-3.6.8L15 20.5l-3-2-3 2-1.4-3.7L4 16l1.5-3.7-2.5-2.8 3.5-1.7L6 4l3.6 1.2L12 2z" fill="url(#sdi-a)" filter="url(#sdi-s)" />
      {/* Yellow % symbol */}
      <circle cx="9.5" cy="9.5" r="1.5" fill="url(#sdi-b)" />
      <circle cx="14.5" cy="14.5" r="1.5" fill="url(#sdi-b)" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
      {/* White highlight */}
      <path d="M10 3.5l1 1.5" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   PROMOTIONS — MAGENTA star + gold sparks
   ============================================================ */

export function SbPromotions({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="spm-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="spm-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <filter id="spm-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#be185d" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Magenta 4-point star */}
      <path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 17l-6.5 4 2-7.5L2 9h7l3-7z" fill="url(#spm-a)" filter="url(#spm-s)" />
      <path d="M12 5l1.5 4" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
      {/* Gold spark dots */}
      <circle cx="19" cy="4" r="1.5" fill="url(#spm-b)" />
      <circle cx="21" cy="8" r="1" fill="url(#spm-b)" opacity="0.7" />
      <circle cx="4" cy="5" r="1" fill="url(#spm-b)" opacity="0.6" />
    </svg>
  );
}

/* ============================================================
   ROUTES — GREEN pin + blue road
   ============================================================ */

export function SbRoutes({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sr-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="sr-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="sr-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#15803d" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Blue winding road */}
      <path d="M4 20c0-4 4-4 4-8s4-4 4-8" stroke="url(#sr-b)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M12 4c0 4 4 4 4 8s4 4 4 8" stroke="url(#sr-b)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Green destination pin */}
      <circle cx="8" cy="6" r="4" fill="url(#sr-a)" filter="url(#sr-s)" />
      <circle cx="8" cy="5.5" r="1.5" fill="white" opacity="0.5" />
      {/* Small orange start dot */}
      <circle cx="18" cy="19" r="2.5" fill="#f97316" />
      <circle cx="18" cy="19" r="1" fill="white" opacity="0.4" />
    </svg>
  );
}

/* ============================================================
   INVENTORY — BROWN/WARM boxes + amber highlight
   ============================================================ */

export function SbInventory({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="si-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d6a06c" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="si-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="si-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#78350f" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Back box — brown */}
      <rect x="2" y="5" width="14" height="12" rx="2" fill="url(#si-a)" opacity="0.6" />
      {/* Front box — amber */}
      <rect x="8" y="8" width="14" height="12" rx="2" fill="url(#si-b)" filter="url(#si-s)" />
      <path d="M8 12h14" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
      <rect x="13" y="9.5" width="4" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Brown tape on back box */}
      <rect x="7" y="5" width="4" height="3" rx="0.5" fill="url(#si-a)" />
    </svg>
  );
}

/* ============================================================
   ZONES — PURPLE pin + orange inner glow
   ============================================================ */

export function SbZones({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sz-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="sz-b" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
        <filter id="sz-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#6d28d9" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Purple map pin */}
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#sz-a)" filter="url(#sz-s)" />
      {/* Orange center dot */}
      <circle cx="12" cy="9" r="3.5" fill="url(#sz-b)" />
      <circle cx="12" cy="8.5" r="1.5" fill="white" opacity="0.4" />
      {/* Subtle zone ring */}
      <circle cx="12" cy="9" r="6" stroke="#c084fc" strokeWidth="1" opacity="0.3" fill="none" />
    </svg>
  );
}

/* ============================================================
   VISITS — CYAN calendar + orange check badge
   ============================================================ */

export function SbVisits({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sv-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="sv-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="sv-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0e7490" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Calendar body */}
      <rect x="3" y="4" width="18" height="18" rx="2.5" fill="url(#sv-a)" filter="url(#sv-s)" />
      <rect x="3" y="4" width="18" height="5" rx="2.5" fill="#0e7490" />
      {/* Calendar hooks */}
      <rect x="8" y="2" width="2" height="4" rx="1" fill="white" opacity="0.6" />
      <rect x="14" y="2" width="2" height="4" rx="1" fill="white" opacity="0.6" />
      {/* Day dots */}
      <circle cx="8" cy="14" r="1" fill="white" opacity="0.4" />
      <circle cx="12" cy="14" r="1" fill="white" opacity="0.4" />
      <circle cx="8" cy="18" r="1" fill="white" opacity="0.4" />
      {/* Orange check badge */}
      <circle cx="18" cy="18" r="4.5" fill="url(#sv-b)" />
      <path d="M16 18l1.5 1.5L20 16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   FORMS — INDIGO clipboard + pink edit badge
   ============================================================ */

export function SbForms({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sf-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sf-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <filter id="sf-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#4338ca" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Clipboard body */}
      <rect x="4" y="3" width="16" height="19" rx="2" fill="url(#sf-a)" filter="url(#sf-s)" />
      {/* Clip top */}
      <rect x="8" y="1" width="8" height="4" rx="1.5" fill="#3730a3" />
      <rect x="10" y="2" width="4" height="2" rx="1" fill="white" opacity="0.3" />
      {/* Lines */}
      <rect x="7" y="9" width="6" height="1.5" rx="0.5" fill="white" opacity="0.35" />
      <rect x="7" y="13" width="8" height="1.5" rx="0.5" fill="white" opacity="0.25" />
      <rect x="7" y="17" width="5" height="1.5" rx="0.5" fill="white" opacity="0.2" />
      {/* Pink edit badge */}
      <circle cx="18" cy="19" r="4" fill="url(#sf-b)" />
      <path d="M16.5 19.5l1-1 2 2-1 1-2 0z" fill="white" opacity="0.7" />
    </svg>
  );
}

/* ============================================================
   REPORTS — Red + Blue + Green bars (tricolor chart)
   ============================================================ */

export function SbReports({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="srp-a" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#f87171" />
        </linearGradient>
        <linearGradient id="srp-b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="srp-c" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <filter id="srp-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#1e3a5f" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Three bars — each a different color */}
      <rect x="4" y="10" width="4.5" height="11" rx="1.5" fill="url(#srp-a)" filter="url(#srp-s)" />
      <rect x="10" y="5" width="4.5" height="16" rx="1.5" fill="url(#srp-b)" filter="url(#srp-s)" />
      <rect x="16" y="8" width="4.5" height="13" rx="1.5" fill="url(#srp-c)" filter="url(#srp-s)" />
      {/* Highlights */}
      <rect x="5" y="11" width="2.5" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="11" y="6" width="2.5" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="17" y="9" width="2.5" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Base line */}
      <line x1="2" y1="21" x2="22" y2="21" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   TEAM — AMBER center person + indigo side people
   ============================================================ */

export function SbTeam({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="st-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="st-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="st-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b45309" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Side people — indigo */}
      <circle cx="5" cy="9" r="2.5" fill="url(#st-b)" />
      <path d="M1 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#st-b)" opacity="0.7" />
      <circle cx="19" cy="9" r="2.5" fill="url(#st-b)" />
      <path d="M15 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#st-b)" opacity="0.7" />
      {/* Center person — amber/gold */}
      <circle cx="12" cy="7" r="3.5" fill="url(#st-a)" filter="url(#st-s)" />
      <path d="M7 21v-2a4 4 0 014-4h2a4 4 0 014 4v2" fill="url(#st-a)" filter="url(#st-s)" />
      <circle cx="12" cy="6.5" r="1.5" fill="white" opacity="0.25" />
    </svg>
  );
}

/* ============================================================
   DEVICES — SLATE phone + cyan screen
   ============================================================ */

export function SbDevices({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sdv-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="sdv-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="sdv-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#334155" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Phone body */}
      <rect x="5" y="2" width="14" height="20" rx="3" fill="url(#sdv-a)" filter="url(#sdv-s)" />
      {/* Cyan screen */}
      <rect x="7" y="5" width="10" height="13" rx="1" fill="url(#sdv-b)" />
      {/* Screen highlight */}
      <rect x="8" y="6" width="4" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Home button */}
      <circle cx="12" cy="20" r="1" fill="white" opacity="0.3" />
      {/* Notch */}
      <rect x="10" y="3" width="4" height="1" rx="0.5" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ============================================================
   AUTOMATIONS — ORANGE robot + green eyes + indigo antenna
   ============================================================ */

export function SbAutomations({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sa-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="sa-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="sa-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#c2410c" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Indigo antenna */}
      <line x1="12" y1="2" x2="12" y2="6" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="2" r="1.5" fill="#818cf8" />
      {/* Orange robot head */}
      <rect x="5" y="6" width="14" height="10" rx="3" fill="url(#sa-a)" filter="url(#sa-s)" />
      {/* Green eyes */}
      <circle cx="9" cy="11" r="2" fill="url(#sa-b)" />
      <circle cx="15" cy="11" r="2" fill="url(#sa-b)" />
      <circle cx="9" cy="10.5" r="0.8" fill="white" opacity="0.5" />
      <circle cx="15" cy="10.5" r="0.8" fill="white" opacity="0.5" />
      {/* Mouth */}
      <rect x="9" y="14" width="6" height="1" rx="0.5" fill="white" opacity="0.3" />
      {/* Orange body */}
      <rect x="7" y="17" width="10" height="5" rx="2" fill="url(#sa-a)" opacity="0.8" />
      {/* Arms */}
      <rect x="2" y="8" width="3" height="6" rx="1.5" fill="#fb923c" opacity="0.6" />
      <rect x="19" y="8" width="3" height="6" rx="1.5" fill="#fb923c" opacity="0.6" />
    </svg>
  );
}

/* ============================================================
   GOALS — RED target + gold bullseye
   ============================================================ */

export function SbGoals({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="sg-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sg-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b91c1c" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Outer red ring */}
      <circle cx="12" cy="12" r="10" fill="url(#sg-a)" filter="url(#sg-s)" />
      <circle cx="12" cy="12" r="7.5" fill="white" />
      {/* Middle red ring */}
      <circle cx="12" cy="12" r="6" fill="url(#sg-a)" />
      <circle cx="12" cy="12" r="3.5" fill="white" />
      {/* Gold bullseye */}
      <circle cx="12" cy="12" r="2.5" fill="url(#sg-b)" />
      <circle cx="12" cy="11" r="1" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ============================================================
   AI — VIOLET brain + cyan glow
   ============================================================ */

export function SbAI({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sai-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="sai-b" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </radialGradient>
        <filter id="sai-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#6d28d9" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Cyan glow behind */}
      <circle cx="12" cy="12" r="10" fill="url(#sai-b)" />
      {/* Brain shape — violet */}
      <path d="M12 3C9.5 3 7 4.5 7 7c-2 0-3 1.5-3 3.5S5 14 7 14c0 2 1.5 3.5 3.5 3.5.5 1.5 1 3.5 1.5 3.5s1-2 1.5-3.5C15.5 17.5 17 16 17 14c2 0 3-1.5 3-3.5S19 7 17 7c0-2.5-2.5-4-5-4z" fill="url(#sai-a)" filter="url(#sai-s)" />
      {/* Brain center line */}
      <path d="M12 5v14" stroke="white" strokeWidth="1" opacity="0.2" />
      {/* Cyan sparkle dots */}
      <circle cx="9" cy="9" r="1" fill="#22d3ee" opacity="0.7" />
      <circle cx="15" cy="10" r="1" fill="#22d3ee" opacity="0.7" />
      <circle cx="11" cy="13" r="0.8" fill="#22d3ee" opacity="0.5" />
    </svg>
  );
}

/* ============================================================
   SETTINGS — SLATE gear + amber center
   ============================================================ */

export function SbSettings({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sse-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="sse-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sse-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#334155" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M12 1l2.09 3.64L18 3.64l-.91 3.91 3.41 1.95-2.82 2.73L19 16l-3.64-.09L12 20l-3.36-4.09L5 16l1.32-3.77L3.5 9.5l3.41-1.95L6 3.64l3.91 1L12 1z" fill="url(#sse-a)" filter="url(#sse-s)" />
      <circle cx="12" cy="10.5" r="3.5" fill="url(#sse-b)" />
      <circle cx="12" cy="10" r="1.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   ADMIN — INDIGO shield + gold check
   ============================================================ */

export function SbAdmin({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sad-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="sad-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sad-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3730a3" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M12 2L4 6v6c0 5.55 3.42 10.74 8 12 4.58-1.26 8-6.45 8-12V6l-8-4z" fill="url(#sad-a)" filter="url(#sad-s)" />
      {/* Gold check */}
      <path d="M9 12l2 2 4-4" stroke="url(#sad-b)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M6 6l3-1" stroke="white" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   USERS — INDIGO head + slate body
   ============================================================ */

export function SbUsers({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="su-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="su-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <filter id="su-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#4338ca" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="12" cy="8" r="4.5" fill="url(#su-a)" filter="url(#su-s)" />
      <path d="M4 21v-2a6 6 0 0112 0v2" fill="url(#su-b)" />
      <circle cx="12" cy="7" r="2" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ============================================================
   SUBSCRIPTION — GOLD card + green star
   ============================================================ */

export function SbSubscription({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="ssb-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ssb-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="ssb-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#92400e" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Gold card */}
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill="url(#ssb-a)" filter="url(#ssb-s)" />
      <rect x="2" y="9" width="20" height="3" fill="#92400e" opacity="0.5" />
      <rect x="4" y="6" width="6" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="4" y="14" width="4" height="1.5" rx="0.5" fill="white" opacity="0.2" />
      {/* Green star badge */}
      <circle cx="18" cy="17" r="4" fill="url(#ssb-b)" />
      <path d="M18 14.5l1 2h2l-1.5 1.5.5 2-2-1-2 1 .5-2L15 16.5h2l1-2z" fill="white" opacity="0.7" />
    </svg>
  );
}

/* ============================================================
   ACTIVITY LOG — SLATE clock + emerald hands + amber center
   ============================================================ */

export function SbActivityLog({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sal-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <filter id="sal-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#334155" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#sal-a)" filter="url(#sal-s)" />
      <circle cx="12" cy="12" r="8.5" fill="white" opacity="0.1" />
      {/* Emerald hands */}
      <line x1="12" y1="12" x2="12" y2="6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="17" y2="14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      {/* Amber center */}
      <circle cx="12" cy="12" r="1.5" fill="#f59e0b" />
      {/* Hour marks */}
      <circle cx="12" cy="4" r="0.8" fill="white" opacity="0.4" />
      <circle cx="20" cy="12" r="0.8" fill="white" opacity="0.4" />
      <circle cx="12" cy="20" r="0.8" fill="white" opacity="0.4" />
      <circle cx="4" cy="12" r="0.8" fill="white" opacity="0.4" />
    </svg>
  );
}

/* ============================================================
   HELP — BLUE compass + red north needle + amber center
   ============================================================ */

export function SbHelp({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sh-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sh-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="sh-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1d4ed8" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Blue compass body */}
      <circle cx="12" cy="12" r="10" fill="url(#sh-a)" filter="url(#sh-s)" />
      <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="0.5" opacity="0.2" fill="none" />
      {/* Red north needle */}
      <path d="M12 4l2 8-2 1-2-1z" fill="url(#sh-b)" />
      {/* White south needle */}
      <path d="M12 20l-2-8 2-1 2 1z" fill="white" opacity="0.5" />
      {/* Amber center */}
      <circle cx="12" cy="12" r="2" fill="#f59e0b" />
      <circle cx="12" cy="11.5" r="0.8" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   ANNOUNCEMENTS — SLATE megaphone + rose sound waves
   ============================================================ */

export function SbAnnouncements({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="san-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <filter id="san-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#334155" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Megaphone body */}
      <path d="M18 3v18l-8-4H5a2 2 0 01-2-2V9a2 2 0 012-2h5l8-4z" fill="url(#san-a)" filter="url(#san-s)" />
      <path d="M5 8h3v8H5" fill="white" opacity="0.15" />
      {/* Rose sound waves */}
      <path d="M20 8c1.5 1.5 1.5 6.5 0 8" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M22 5c3 3 3 11 0 14" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

/* ============================================================
   BUILDINGS — INDIGO main building + amber side building
   ============================================================ */

export function SbBuildings({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sbu-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="sbu-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sbu-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3730a3" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Amber side building */}
      <rect x="15" y="10" width="7" height="12" rx="1" fill="url(#sbu-b)" />
      <rect x="17" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="17" y="16" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Indigo main building */}
      <rect x="2" y="4" width="12" height="18" rx="1.5" fill="url(#sbu-a)" filter="url(#sbu-s)" />
      <rect x="4" y="6" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
      <rect x="8.5" y="6" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
      <rect x="4" y="11" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
      <rect x="8.5" y="11" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
      {/* Door */}
      <rect x="6" y="17" width="4" height="5" rx="1" fill="#1e1b4b" />
    </svg>
  );
}

/* ============================================================
   BUG — RED body + amber legs
   ============================================================ */

export function SbBug({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sbg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <filter id="sbg-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b91c1c" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Bug body — red */}
      <ellipse cx="12" cy="14" rx="5" ry="7" fill="url(#sbg-a)" filter="url(#sbg-s)" />
      <line x1="12" y1="8" x2="12" y2="20" stroke="white" strokeWidth="0.8" opacity="0.2" />
      {/* Bug head */}
      <circle cx="12" cy="7" r="3" fill="#991b1b" />
      {/* Amber legs */}
      <line x1="7" y1="11" x2="3" y2="9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="14" x2="3" y2="14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="17" x2="3" y2="19" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="11" x2="21" y2="9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="14" x2="21" y2="14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="17" x2="21" y2="19" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      {/* Antennae */}
      <line x1="10" y1="5" x2="8" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="5" x2="16" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   SECURITY — EMERALD shield + amber lock
   ============================================================ */

export function SbSecurity({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="ssc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ssc-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="ssc-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#047857" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Emerald shield */}
      <path d="M12 2L4 6v6c0 5.55 3.42 10.74 8 12 4.58-1.26 8-6.45 8-12V6l-8-4z" fill="url(#ssc-a)" filter="url(#ssc-s)" />
      <path d="M6 6.5l3-1.5" stroke="white" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
      {/* Amber lock */}
      <rect x="9" y="11" width="6" height="5" rx="1" fill="url(#ssc-b)" />
      <path d="M10 11V9a2 2 0 014 0v2" stroke="#d97706" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="13.5" r="1" fill="white" opacity="0.5" />
    </svg>
  );
}

/* ============================================================
   CATEGORY — EMERALD tag + amber dot
   ============================================================ */

export function SbCategory({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sca-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="sca-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#047857" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M2 4a2 2 0 012-2h7.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-7.586 7.586a2 2 0 01-2.828 0L2.586 13A2 2 0 012 11.586V4z" fill="url(#sca-a)" filter="url(#sca-s)" />
      <circle cx="7" cy="7" r="2" fill="#fbbf24" />
      <circle cx="7" cy="6.5" r="0.8" fill="white" opacity="0.4" />
    </svg>
  );
}

/* ============================================================
   FOLDERS — AMBER folder + emerald doc inside
   ============================================================ */

export function SbFolders({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sfo-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="sfo-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="sfo-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b45309" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Folder body */}
      <path d="M2 7a2 2 0 012-2h4l2 2h10a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" fill="url(#sfo-a)" filter="url(#sfo-s)" />
      <rect x="3" y="6" width="6" height="2" rx="0.5" fill="white" opacity="0.2" />
      {/* Green doc inside */}
      <rect x="8" y="11" width="8" height="8" rx="1" fill="url(#sfo-b)" />
      <rect x="10" y="13" width="4" height="1" rx="0.5" fill="white" opacity="0.4" />
      <rect x="10" y="15.5" width="3" height="1" rx="0.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   UNITS — AMBER ruler + cyan marks
   ============================================================ */

export function SbUnits({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sun-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sun-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#b45309" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Ruler body */}
      <rect x="3" y="6" width="18" height="12" rx="2" fill="url(#sun-a)" filter="url(#sun-s)" />
      {/* Cyan measurement marks */}
      <line x1="7" y1="6" x2="7" y2="11" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="6" x2="11" y2="13" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="6" x2="15" y2="11" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="6" x2="19" y2="9" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" />
      {/* Highlight */}
      <rect x="4" y="14" width="5" height="1.5" rx="0.5" fill="white" opacity="0.25" />
    </svg>
  );
}

/* ============================================================
   MOVEMENTS — CYAN left arrow + emerald right arrow
   ============================================================ */

export function SbMovements({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sm-a" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="sm-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="sm-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#0e7490" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Left-pointing arrow — cyan */}
      <path d="M10 6l-6 4 6 4V6z" fill="url(#sm-a)" filter="url(#sm-s)" />
      <rect x="10" y="8.5" width="10" height="3" rx="1" fill="url(#sm-a)" opacity="0.6" />
      {/* Right-pointing arrow — green */}
      <path d="M14 14l6 4-6 4v-8z" fill="url(#sm-b)" filter="url(#sm-s)" />
      <rect x="4" y="16.5" width="10" height="3" rx="1" fill="url(#sm-b)" opacity="0.6" />
    </svg>
  );
}

/* ============================================================
   USERS GLOBAL — INDIGO center + rose side people
   ============================================================ */

export function SbUsersGlobal({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sug-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="sug-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <filter id="sug-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3730a3" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Side people — rose */}
      <circle cx="5" cy="9" r="2.5" fill="url(#sug-b)" />
      <path d="M1 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#sug-b)" opacity="0.7" />
      <circle cx="19" cy="9" r="2.5" fill="url(#sug-b)" />
      <path d="M15 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#sug-b)" opacity="0.7" />
      {/* Center — indigo */}
      <circle cx="12" cy="7" r="3.5" fill="url(#sug-a)" filter="url(#sug-s)" />
      <path d="M7 21v-2a4 4 0 014-4h2a4 4 0 014 4v2" fill="url(#sug-a)" filter="url(#sug-s)" />
      <circle cx="12" cy="6.5" r="1.5" fill="white" opacity="0.25" />
      {/* Globe indicator */}
      <circle cx="18" cy="4" r="2.5" stroke="#818cf8" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M16 4h5M18 1.5v5" stroke="#818cf8" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   TRENDING UP — Green rising arrow + blue grid lines
   ============================================================ */

export function SbTrendingUp({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="stu-a" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="stu-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#047857" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Grid lines */}
      <line x1="3" y1="20" x2="21" y2="20" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="#93c5fd" strokeWidth="0.5" opacity="0.25" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="#93c5fd" strokeWidth="0.5" opacity="0.25" />
      {/* Rising line */}
      <path d="M3 18L9 12l4 4 8-10" stroke="url(#stu-a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#stu-s)" />
      {/* Arrow head */}
      <path d="M17 6h4v4" stroke="url(#stu-a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 6.5l2 0v2" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   MAP — Teal map fold + orange pin
   ============================================================ */

export function SbMap({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sma-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="sma-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="sma-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0f766e" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Map body */}
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" fill="url(#sma-a)" filter="url(#sma-s)" />
      <path d="M9 3v18M15 6v18" stroke="#99f6e4" strokeWidth="1" opacity="0.4" />
      <rect x="4" y="7" width="4" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Pin */}
      <circle cx="17" cy="10" r="3" fill="url(#sma-b)" />
      <circle cx="17" cy="9.5" r="1.2" fill="white" opacity="0.5" />
      <path d="M17 13l-1.5 3h3L17 13z" fill="url(#sma-b)" opacity="0.7" />
    </svg>
  );
}

/* ============================================================
   BAR CHART — Tricolor bars (indigo, cyan, amber)
   ============================================================ */

export function SbBarChart({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sbc-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sbc-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="sbc-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sbc-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3730a3" floodOpacity="0.25" />
        </filter>
      </defs>
      <line x1="3" y1="21" x2="21" y2="21" stroke="#c7d2fe" strokeWidth="1" opacity="0.5" />
      <rect x="3" y="10" width="4" height="11" rx="1.5" fill="url(#sbc-a)" filter="url(#sbc-s)" />
      <rect x="10" y="4" width="4" height="17" rx="1.5" fill="url(#sbc-b)" filter="url(#sbc-s)" />
      <rect x="17" y="7" width="4" height="14" rx="1.5" fill="url(#sbc-c)" filter="url(#sbc-s)" />
      <rect x="4" y="11" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="11" y="5" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
      <rect x="18" y="8" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   USER PLUS — Cyan person + green plus badge
   ============================================================ */

export function SbUserPlus({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sup-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="sup-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="sup-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0e7490" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="10" cy="8" r="4" fill="url(#sup-a)" filter="url(#sup-s)" />
      <path d="M4 21v-2a5 5 0 0110 0v2" fill="url(#sup-a)" opacity="0.8" />
      <circle cx="10" cy="7.5" r="1.5" fill="white" opacity="0.3" />
      {/* Plus badge */}
      <circle cx="18" cy="16" r="4.5" fill="url(#sup-b)" />
      <path d="M18 13.5v5M15.5 16h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   WALLET — Red-rose wallet + gold coins
   ============================================================ */

export function SbWallet({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sw-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="sw-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sw-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#be123c" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="2" y="6" width="20" height="14" rx="3" fill="url(#sw-a)" filter="url(#sw-s)" />
      <rect x="2" y="6" width="20" height="4" rx="1" fill="#9f1239" opacity="0.4" />
      <rect x="14" y="12" width="8" height="5" rx="2" fill="#881337" opacity="0.3" />
      <circle cx="17" cy="14.5" r="1.5" fill="url(#sw-b)" />
      <rect x="4" y="7" width="6" height="2" rx="0.5" fill="white" opacity="0.3" />
      {/* Gold coins peek */}
      <circle cx="7" cy="4" r="2" fill="url(#sw-b)" opacity="0.7" />
      <circle cx="10" cy="3.5" r="2" fill="url(#sw-b)" opacity="0.5" />
    </svg>
  );
}

/* ============================================================
   GIT COMPARE — Blue + purple split arrows
   ============================================================ */

export function SbCompare({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sgc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sgc-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <filter id="sgc-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1d4ed8" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Left arrow down */}
      <circle cx="7" cy="4" r="3" fill="url(#sgc-a)" filter="url(#sgc-s)" />
      <line x1="7" y1="7" x2="7" y2="17" stroke="url(#sgc-a)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="20" r="2.5" fill="url(#sgc-a)" opacity="0.6" />
      {/* Right arrow up */}
      <circle cx="17" cy="20" r="3" fill="url(#sgc-b)" filter="url(#sgc-s)" />
      <line x1="17" y1="17" x2="17" y2="7" stroke="url(#sgc-b)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="4" r="2.5" fill="url(#sgc-b)" opacity="0.6" />
      {/* Arrows */}
      <path d="M5 15l2 2.5 2-2.5" stroke="url(#sgc-a)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9l2-2.5 2 2.5" stroke="url(#sgc-b)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="4" r="1" fill="white" opacity="0.35" />
      <circle cx="17" cy="20" r="1" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ============================================================
   LIGHTBULB — Amber bulb + yellow glow
   ============================================================ */

export function SbLightbulb({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <radialGradient id="slb-a" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id="slb-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <filter id="slb-s" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#d97706" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Glow */}
      <circle cx="12" cy="9" r="8" fill="#fef3c7" opacity="0.3" />
      {/* Bulb */}
      <path d="M12 2a7 7 0 00-4 12.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3A7 7 0 0012 2z" fill="url(#slb-a)" filter="url(#slb-s)" />
      <path d="M10 9a2 2 0 014 0" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
      {/* Base */}
      <rect x="9" y="19" width="6" height="1.5" rx="0.5" fill="url(#slb-b)" />
      <rect x="10" y="21" width="4" height="1" rx="0.5" fill="url(#slb-b)" opacity="0.7" />
      {/* Filament lines */}
      <path d="M10 14h4" stroke="#d97706" strokeWidth="0.7" opacity="0.4" />
      <path d="M10 15.5h4" stroke="#d97706" strokeWidth="0.7" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   DOLLAR SIGN — Blue-green coin with $ symbol
   ============================================================ */

export function SbDollarSign({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sds-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sds-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="sds-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#1d4ed8" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#sds-a)" filter="url(#sds-s)" />
      <circle cx="12" cy="12" r="7.5" fill="url(#sds-b)" />
      <text x="12" y="16.5" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white">$</text>
      <circle cx="10" cy="9" r="2" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ============================================================
   SHOPPING CART — Emerald cart + orange badge
   ============================================================ */

export function SbShoppingCart({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="ssc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ssc-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="ssc-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#047857" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M1 1h4l2.68 13.39a1.5 1.5 0 001.49 1.11h8.36a1.5 1.5 0 001.46-1.14L21 7H6" stroke="url(#ssc-a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#ssc-s)" />
      <circle cx="9" cy="20" r="2" fill="url(#ssc-a)" />
      <circle cx="18" cy="20" r="2" fill="url(#ssc-a)" />
      {/* Items in cart */}
      <rect x="9" y="9" width="3" height="4" rx="0.5" fill="url(#ssc-b)" opacity="0.7" />
      <rect x="14" y="8" width="3" height="5" rx="0.5" fill="url(#ssc-b)" opacity="0.5" />
      <rect x="9.5" y="9.5" width="1.5" height="1" rx="0.3" fill="white" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
   TRUCK — Blue truck + green cargo
   ============================================================ */

export function SbTruck({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="stk-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="stk-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="stk-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1d4ed8" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Cargo body */}
      <rect x="1" y="6" width="14" height="10" rx="2" fill="url(#stk-b)" filter="url(#stk-s)" />
      <rect x="2" y="7" width="5" height="3" rx="0.5" fill="white" opacity="0.25" />
      {/* Cab */}
      <path d="M15 10h4l2 4v2a1 1 0 01-1 1h-5V10z" fill="url(#stk-a)" filter="url(#stk-s)" />
      <rect x="17" y="11" width="3" height="2" rx="0.5" fill="#93c5fd" opacity="0.5" />
      {/* Wheels */}
      <circle cx="7" cy="18" r="2" fill="#374151" />
      <circle cx="7" cy="18" r="0.8" fill="#9ca3af" />
      <circle cx="18" cy="18" r="2" fill="#374151" />
      <circle cx="18" cy="18" r="0.8" fill="#9ca3af" />
    </svg>
  );
}

/* ============================================================
   CHECK CIRCLE — Green circle + white check
   ============================================================ */

export function SbCheckCircle({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sck-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="sck-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#15803d" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#sck-a)" filter="url(#sck-s)" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="8" r="2.5" fill="white" opacity="0.15" />
    </svg>
  );
}

/* ============================================================
   CLOCK — Amber clock face + red hands
   ============================================================ */

export function SbClock({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="scl-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="scl-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#92400e" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#scl-a)" filter="url(#scl-s)" />
      <circle cx="12" cy="12" r="7.5" fill="#fef3c7" opacity="0.3" />
      {/* Clock hands */}
      <line x1="12" y1="12" x2="12" y2="7" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="16" y2="14" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="#dc2626" />
      <circle cx="12" cy="12" r="0.7" fill="white" />
      {/* Hour markers */}
      <circle cx="12" cy="4" r="0.7" fill="white" opacity="0.5" />
      <circle cx="20" cy="12" r="0.7" fill="white" opacity="0.5" />
      <circle cx="12" cy="20" r="0.7" fill="white" opacity="0.5" />
      <circle cx="4" cy="12" r="0.7" fill="white" opacity="0.5" />
    </svg>
  );
}

/* ============================================================
   SEARCH — Purple magnifying glass + cyan lens
   ============================================================ */

export function SbSearch({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sse-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="sse-b" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#06b6d4" />
        </radialGradient>
        <filter id="sse-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#6d28d9" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="10.5" cy="10.5" r="7.5" fill="url(#sse-b)" filter="url(#sse-s)" />
      <circle cx="10.5" cy="10.5" r="5" stroke="url(#sse-a)" strokeWidth="3" fill="none" />
      <circle cx="8.5" cy="8.5" r="2" fill="white" opacity="0.3" />
      {/* Handle */}
      <line x1="16" y1="16" x2="21" y2="21" stroke="url(#sse-a)" strokeWidth="3" strokeLinecap="round" filter="url(#sse-s)" />
    </svg>
  );
}

/* ============================================================
   INBOX — Slate tray + blue envelope
   ============================================================ */

export function SbInbox({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sin-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="sin-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="sin-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#334155" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Tray */}
      <path d="M3 14l3-8h12l3 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" fill="url(#sin-a)" filter="url(#sin-s)" />
      <path d="M3 14h5a2 2 0 012 2 2 2 0 002 2h0a2 2 0 002-2 2 2 0 012-2h5" stroke="#cbd5e1" strokeWidth="1" fill="none" />
      <rect x="5" y="7" width="4" height="2" rx="0.5" fill="white" opacity="0.2" />
      {/* Envelope peek */}
      <rect x="7" y="3" width="10" height="7" rx="1.5" fill="url(#sin-b)" />
      <path d="M7 3l5 4 5-4" stroke="white" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/* ============================================================
   ZAP — Yellow-amber lightning bolt + orange glow
   ============================================================ */

export function SbZap({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="szp-a" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="szp-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="szp-s" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#d97706" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Glow */}
      <circle cx="12" cy="12" r="9" fill="#fef3c7" opacity="0.25" />
      {/* Bolt */}
      <path d="M13 2L4.5 13h6L9 22l9.5-12h-6L13 2z" fill="url(#szp-a)" filter="url(#szp-s)" />
      <path d="M13 2L4.5 13h6L9 22l9.5-12h-6L13 2z" fill="url(#szp-b)" opacity="0.3" />
      {/* Highlight */}
      <path d="M12 4l-4 6h3" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ============================================================
   ALERT — Red-orange warning triangle
   ============================================================ */

export function SbAlert({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sal-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <filter id="sal-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#dc2626" floodOpacity="0.3" />
        </filter>
      </defs>
      <path d="M12 2L1 21h22L12 2z" fill="url(#sal-a)" filter="url(#sal-s)" />
      <path d="M12 9v5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="white" />
      <path d="M9 5l3-1.5 3 1.5" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ============================================================
   LOGIN — Blue door + green arrow entering
   ============================================================ */

export function SbLogin({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sli-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sli-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <filter id="sli-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1d4ed8" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Door frame */}
      <rect x="10" y="2" width="12" height="20" rx="2" fill="url(#sli-a)" filter="url(#sli-s)" />
      <rect x="11" y="3" width="4" height="3" rx="0.5" fill="white" opacity="0.25" />
      <circle cx="18" cy="12" r="1" fill="#fbbf24" />
      {/* Arrow entering */}
      <path d="M2 12h10" stroke="url(#sli-b)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 8l4 4-4 4" stroke="url(#sli-b)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   DOWNLOAD/EXPORT — Purple box + cyan arrow down
   ============================================================ */

export function SbDownload({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sdl-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="sdl-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="sdl-s" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#6d28d9" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Tray */}
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="url(#sdl-a)" strokeWidth="2.5" strokeLinecap="round" filter="url(#sdl-s)" />
      {/* Arrow */}
      <path d="M12 3v10" stroke="url(#sdl-b)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 10l4 4 4-4" stroke="url(#sdl-b)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
