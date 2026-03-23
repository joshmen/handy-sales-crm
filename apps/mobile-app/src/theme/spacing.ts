/**
 * HandySales Mobile — Spacing, Shadows & Border Radius
 * Consistent 4px-based scale for layout harmony.
 */

import { Platform, ViewStyle } from 'react-native';

/**
 * Spacing scale (4px base unit)
 * Use: padding, margin, gap
 */
export const spacing = {
  /** 2px — hairline gaps */
  xxs: 2,
  /** 4px — tight internal spacing */
  xs: 4,
  /** 8px — compact spacing */
  sm: 8,
  /** 12px — default inner padding */
  md: 12,
  /** 16px — standard padding/margin */
  lg: 16,
  /** 20px — comfortable spacing */
  xl: 20,
  /** 24px — section gaps */
  '2xl': 24,
  /** 32px — large section gaps */
  '3xl': 32,
  /** 40px — major section separators */
  '4xl': 40,
  /** 48px — hero spacing */
  '5xl': 48,
} as const;

/**
 * Border radius presets
 */
export const borderRadius = {
  /** 4px — subtle rounding (badges, chips) */
  xs: 4,
  /** 8px — buttons, inputs */
  sm: 8,
  /** 12px — cards, dialogs */
  md: 12,
  /** 16px — large cards */
  lg: 16,
  /** 20px — extra-large cards */
  xl: 20,
  /** 24px — panels */
  '2xl': 24,
  /** Full circle */
  full: 9999,
} as const;

/**
 * Shadow presets — cross-platform
 * iOS uses shadow* props, Android uses elevation.
 * Each preset returns a complete ViewStyle object.
 */
export const shadows: Record<string, ViewStyle> = {
  /** Subtle — list items, minimal depth */
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...Platform.select({
      android: { elevation: 1 },
      default: {},
    }),
  },

  /** Default — cards, buttons */
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    ...Platform.select({
      android: { elevation: 3 },
      default: {},
    }),
  },

  /** Prominent — floating elements, modals */
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    ...Platform.select({
      android: { elevation: 6 },
      default: {},
    }),
  },

  /** Hero — elevated cards, bottom sheets */
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    ...Platform.select({
      android: { elevation: 10 },
      default: {},
    }),
  },

  /** Colored shadow for brand-green elements */
  green: {
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    ...Platform.select({
      android: { elevation: 4 },
      default: {},
    }),
  },

  /** Colored shadow for primary (indigo) elements */
  blue: {
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    ...Platform.select({
      android: { elevation: 4 },
      default: {},
    }),
  },

  /** No shadow */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    ...Platform.select({
      android: { elevation: 0 },
      default: {},
    }),
  },
} as const;

/**
 * Common layout dimensions
 */
export const layout = {
  /** Screen horizontal padding */
  screenPaddingH: 16,
  /** Tab bar height */
  tabBarHeight: 60,
  /** Header height */
  headerHeight: 56,
  /** Bottom sheet handle area */
  sheetHandleHeight: 32,
  /** Card minimum touch target */
  minTouchTarget: 44,
} as const;
