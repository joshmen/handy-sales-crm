/**
 * Multicolor 3D SVG icons for the mobile app.
 * "Polished Glass" aesthetic — each icon has 2-3 contrasting colors,
 * gradient fills, and white highlights for depth.
 *
 * Ported from web: apps/web/src/components/layout/DashboardIcons.tsx
 * Note: feDropShadow is NOT supported in react-native-svg.
 * 3D depth is achieved via outer View shadow styles instead.
 *
 * viewBox 24x24, default size 24px.
 */

import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Line,
  G,
  Ellipse,
} from 'react-native-svg';

interface IconProps {
  size?: number;
  /** Optional override for the outer container style */
  style?: ViewStyle;
}

/* ----------------------------------------------------------------
   Shared shadow style for the 3D glass effect
   ---------------------------------------------------------------- */
const iconShadow = (shadowColor: string): ViewStyle => ({
  shadowColor,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  ...Platform.select({
    android: { elevation: 3 },
    default: {},
  }),
});

/* ============================================================
   DASHBOARD — Blue grid + emerald & amber accents (Hoy tab)
   ============================================================ */

export function SbDashboard({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#1d4ed8'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="sd-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#2563eb" />
          </LinearGradient>
          <LinearGradient id="sd-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#34d399" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
          <LinearGradient id="sd-c" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        <Rect x="3" y="3" width="8" height="8" rx="2" fill="url(#sd-a)" />
        <Rect x="13" y="3" width="8" height="5" rx="1.5" fill="url(#sd-c)" />
        <Rect x="13" y="10" width="8" height="11" rx="2" fill="url(#sd-b)" />
        <Rect x="3" y="13" width="8" height="8" rx="2" fill="url(#sd-a)" />
        <Rect x="4" y="4" width="3" height="2" rx="0.5" fill="white" opacity="0.35" />
      </Svg>
    </View>
  );
}

/* ============================================================
   ORDERS — ORANGE bag + blue check badge (Vender tab)
   ============================================================ */

export function SbOrders({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#c2410c'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="so-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#ea580c" />
          </LinearGradient>
          <LinearGradient id="so-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#2563eb" />
          </LinearGradient>
        </Defs>
        <Path d="M6 2L4 6v14a2 2 0 002 2h12a2 2 0 002-2V6l-2-4H6z" fill="url(#so-a)" />
        <Path d="M4 6h16" stroke="#fdba74" strokeWidth="1.5" />
        <Path d="M9 10a3 3 0 006 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <Circle cx="17" cy="17" r="4.5" fill="url(#so-b)" />
        <Path d="M15 17l1.5 1.5L19 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="7" y="3" width="4" height="1.5" rx="0.5" fill="white" opacity="0.3" />
      </Svg>
    </View>
  );
}

/* ============================================================
   PAYMENTS — VIOLET card + gold chip (Cobrar tab)
   ============================================================ */

export function SbPayments({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#6d28d9'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="sp-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#a78bfa" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </LinearGradient>
          <LinearGradient id="sp-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        <Rect x="2" y="5" width="20" height="14" rx="2.5" fill="url(#sp-a)" />
        <Rect x="2" y="9" width="20" height="3" fill="#5b21b6" />
        <Rect x="14" y="14" width="5" height="3" rx="1" fill="url(#sp-b)" />
        <Rect x="4" y="14" width="4" height="1.5" rx="0.5" fill="white" opacity="0.25" />
        <Rect x="4" y="6" width="6" height="2" rx="0.5" fill="white" opacity="0.3" />
      </Svg>
    </View>
  );
}

/* ============================================================
   CLIENTS — ROYAL BLUE people + pink accent (Clientes tab)
   ============================================================ */

export function SbClients({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#1e40af'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="sc-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#1d4ed8" />
          </LinearGradient>
          <LinearGradient id="sc-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#f472b6" />
            <Stop offset="100%" stopColor="#db2777" />
          </LinearGradient>
        </Defs>
        {/* Back person — pink */}
        <Circle cx="17" cy="8" r="3" fill="url(#sc-b)" />
        <Path d="M13 21v-2a3 3 0 013-3h2a3 3 0 013 3v2" fill="url(#sc-b)" opacity="0.7" />
        {/* Front person — blue */}
        <Circle cx="9" cy="7" r="3.5" fill="url(#sc-a)" />
        <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" fill="url(#sc-a)" />
        <Circle cx="9" cy="6.5" r="1.5" fill="white" opacity="0.2" />
      </Svg>
    </View>
  );
}

/* ============================================================
   TEAM — AMBER center person + indigo side people (Equipo tab)
   ============================================================ */

export function SbTeam({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#b45309'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="st-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
          <LinearGradient id="st-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#818cf8" />
            <Stop offset="100%" stopColor="#4f46e5" />
          </LinearGradient>
        </Defs>
        {/* Side people — indigo */}
        <Circle cx="5" cy="9" r="2.5" fill="url(#st-b)" />
        <Path d="M1 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#st-b)" opacity="0.7" />
        <Circle cx="19" cy="9" r="2.5" fill="url(#st-b)" />
        <Path d="M15 20v-1.5a3 3 0 013-3h2a3 3 0 013 3V20" fill="url(#st-b)" opacity="0.7" />
        {/* Center person — amber/gold */}
        <Circle cx="12" cy="7" r="3.5" fill="url(#st-a)" />
        <Path d="M7 21v-2a4 4 0 014-4h2a4 4 0 014 4v2" fill="url(#st-a)" />
        <Circle cx="12" cy="6.5" r="1.5" fill="white" opacity="0.25" />
      </Svg>
    </View>
  );
}

/* ============================================================
   MAP — EMERALD pin + gold ring (Mapa tab)
   ============================================================ */

export function SbMap({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#15803d'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="sm-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#16a34a" />
          </LinearGradient>
          <LinearGradient id="sm-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        {/* Emerald map pin */}
        <Path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="url(#sm-a)"
        />
        {/* Gold inner ring */}
        <Circle cx="12" cy="9" r="3.5" fill="url(#sm-b)" />
        <Circle cx="12" cy="8.5" r="1.5" fill="white" opacity="0.4" />
        {/* Subtle shadow base ellipse */}
        <Ellipse cx="12" cy="21" rx="4" ry="1" fill="#0f172a" opacity="0.15" />
      </Svg>
    </View>
  );
}

/* ============================================================
   MENU — Blue hamburger lines (Mas tab)
   ============================================================ */

export function SbMenu({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#1d4ed8'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="smn-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#2563eb" />
          </LinearGradient>
          <LinearGradient id="smn-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        {/* Rounded rectangle background */}
        <Rect x="2" y="3" width="20" height="18" rx="4" fill="url(#smn-a)" />
        {/* Three white lines */}
        <Rect x="6" y="7.5" width="12" height="2" rx="1" fill="white" opacity="0.9" />
        <Rect x="6" y="11" width="9" height="2" rx="1" fill="white" opacity="0.7" />
        <Rect x="6" y="14.5" width="12" height="2" rx="1" fill="white" opacity="0.5" />
        {/* Amber accent dot */}
        <Circle cx="18" cy="12" r="2" fill="url(#smn-b)" />
      </Svg>
    </View>
  );
}

/* ============================================================
   ROUTE — Orange winding path + green pin (Ruta)
   ============================================================ */

export function SbRoute({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#c2410c'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="srt-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#ea580c" />
          </LinearGradient>
          <LinearGradient id="srt-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#16a34a" />
          </LinearGradient>
        </Defs>
        {/* Orange winding road */}
        <Path
          d="M4 20c0-4 4-4 4-8s4-4 4-8"
          stroke="url(#srt-a)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M12 4c0 4 4 4 4 8s4 4 4 8"
          stroke="url(#srt-a)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* Green destination pin */}
        <Circle cx="8" cy="6" r="4" fill="url(#srt-b)" />
        <Circle cx="8" cy="5.5" r="1.5" fill="white" opacity="0.5" />
        {/* Orange start dot */}
        <Circle cx="18" cy="19" r="2.5" fill="url(#srt-a)" />
        <Circle cx="18" cy="19" r="1" fill="white" opacity="0.4" />
      </Svg>
    </View>
  );
}

/* ============================================================
   CHART — Green bars + blue trend line (KPIs)
   ============================================================ */

export function SbChart({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#16a34a'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="sch-a" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#16a34a" />
            <Stop offset="100%" stopColor="#4ade80" />
          </LinearGradient>
          <LinearGradient id="sch-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#2563eb" />
          </LinearGradient>
        </Defs>
        {/* Green bars */}
        <Rect x="3" y="13" width="4" height="8" rx="1.5" fill="url(#sch-a)" />
        <Rect x="10" y="8" width="4" height="13" rx="1.5" fill="url(#sch-a)" />
        <Rect x="17" y="5" width="4" height="16" rx="1.5" fill="url(#sch-a)" />
        {/* White highlights */}
        <Rect x="4" y="14" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
        <Rect x="11" y="9" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
        <Rect x="18" y="6" width="2" height="2" rx="0.5" fill="white" opacity="0.3" />
        {/* Blue trend line */}
        <Path
          d="M5 12L12 7l7 4"
          stroke="url(#sch-b)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Trend dots */}
        <Circle cx="5" cy="12" r="1.5" fill="url(#sch-b)" />
        <Circle cx="12" cy="7" r="1.5" fill="url(#sch-b)" />
        <Circle cx="19" cy="11" r="1.5" fill="url(#sch-b)" />
      </Svg>
    </View>
  );
}

/* ============================================================
   MONEY — Green dollar (Ventas KPI)
   ============================================================ */

export function SbMoney({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#15803d'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="smo-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#16a34a" />
          </LinearGradient>
          <LinearGradient id="smo-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        {/* Green circle */}
        <Circle cx="12" cy="12" r="10" fill="url(#smo-a)" />
        {/* Inner ring */}
        <Circle cx="12" cy="12" r="8" stroke="white" strokeWidth="0.5" opacity="0.2" fill="none" />
        {/* Dollar sign — gold */}
        <Path
          d="M12 6v1.5M12 16.5V18M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5c0 1.38 1.34 2.5 3 2.5s3 1.12 3 2.5c0 1.38-1.34 2.5-3 2.5s-3-1.12-3-2.5"
          stroke="url(#smo-b)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Glass highlight */}
        <Circle cx="9" cy="8" r="2.5" fill="white" opacity="0.15" />
      </Svg>
    </View>
  );
}

/* ============================================================
   VISIT — Purple location check (Visitas KPI)
   ============================================================ */

export function SbVisit({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#6d28d9'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="svi-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#c084fc" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </LinearGradient>
          <LinearGradient id="svi-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#16a34a" />
          </LinearGradient>
        </Defs>
        {/* Purple map pin */}
        <Path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="url(#svi-a)"
        />
        {/* White inner circle */}
        <Circle cx="12" cy="9" r="3.5" fill="white" opacity="0.9" />
        {/* Green check inside */}
        <Path
          d="M10 9l1.5 1.5L14 8"
          stroke="url(#svi-b)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Glass highlight */}
        <Circle cx="10" cy="6" r="1.5" fill="white" opacity="0.3" />
      </Svg>
    </View>
  );
}

/* ============================================================
   TARGET — Red/amber bullseye (Metas)
   ============================================================ */

export function SbWarning({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#d97706'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="swn-a" x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
          <LinearGradient id="swn-b" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#92400e" />
            <Stop offset="100%" stopColor="#78350f" />
          </LinearGradient>
        </Defs>
        {/* Triangle body */}
        <Path d="M12 2.5L22.5 20.5H1.5L12 2.5Z" fill="url(#swn-a)" />
        {/* Inner white triangle */}
        <Path d="M12 6L19.5 19H4.5L12 6Z" fill="white" opacity="0.15" />
        {/* Exclamation mark */}
        <Rect x="11" y="10" width="2" height="5" rx="1" fill="url(#swn-b)" />
        <Circle cx="12" cy="17.5" r="1.2" fill="url(#swn-b)" />
        {/* Glass highlight */}
        <Path d="M9 7L12 3.5L13 5.5L10 8.5Z" fill="white" opacity="0.25" />
      </Svg>
    </View>
  );
}

export function SbTarget({ size = 24, style }: IconProps) {
  return (
    <View style={[iconShadow('#b91c1c'), style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="stg-a" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#f87171" />
            <Stop offset="100%" stopColor="#dc2626" />
          </LinearGradient>
          <LinearGradient id="stg-b" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>
        {/* Outer red ring */}
        <Circle cx="12" cy="12" r="10" fill="url(#stg-a)" />
        <Circle cx="12" cy="12" r="7.5" fill="white" />
        {/* Middle red ring */}
        <Circle cx="12" cy="12" r="6" fill="url(#stg-a)" />
        <Circle cx="12" cy="12" r="3.5" fill="white" />
        {/* Gold bullseye */}
        <Circle cx="12" cy="12" r="2.5" fill="url(#stg-b)" />
        {/* Glass highlight */}
        <Circle cx="12" cy="11" r="1" fill="white" opacity="0.35" />
      </Svg>
    </View>
  );
}
