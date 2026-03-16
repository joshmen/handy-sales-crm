/**
 * HandySales Mobile — Typography System
 * Uses system fonts with specific weights for character.
 * Spanish-language optimized — letter-spacing tuned for es-MX readability.
 */

import { Platform, TextStyle } from 'react-native';

/**
 * Font weight presets for semantic text roles
 */
export const typography = {
  /** Page titles, hero numbers */
  heading: {
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },

  /** Section headers, card titles */
  subheading: {
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },

  /** Default body text */
  body: {
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  /** Medium body — descriptions, secondary info */
  bodyMedium: {
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  /** Uppercase labels, badges, status tags */
  label: {
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  /** Large numbers, KPI values, currency */
  metric: {
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -1,
  },

  /** Button text */
  button: {
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },

  /** Caption, timestamps, helper text */
  caption: {
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
} as const;

/**
 * Font size scale (in logical pixels)
 * Named for intent, not arbitrary numbers.
 */
export const fontSizes = {
  /** Hero metric — dashboard KPI main number */
  hero: 32,
  /** Page title */
  title: 24,
  /** Section title */
  subtitle: 18,
  /** Body text, form fields */
  body: 15,
  /** Secondary text, descriptions */
  small: 13,
  /** Badges, timestamps, fine print */
  tiny: 11,
} as const;

/**
 * Line height multipliers for each size
 * Ensures comfortable reading in Spanish (accents need vertical room).
 */
export const lineHeights = {
  hero: 38,
  title: 30,
  subtitle: 24,
  body: 22,
  small: 18,
  tiny: 14,
} as const;

/**
 * Platform-aware font family.
 * System defaults look great on both platforms;
 * no need for custom fonts until brand-specific typeface is chosen.
 */
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});
