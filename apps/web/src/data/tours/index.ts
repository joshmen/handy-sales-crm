export type { TourStep, TourConfig } from './types';
export { imageStep, getTourForPath } from './types';

import { TourConfig, getTourForPath as _getTourForPath } from './types';
import { generalTours } from './general';
import { catalogTours } from './catalogs';
import { operationTours } from './operations';
import { commercialTours } from './commercial';
import { adminTours } from './admin';

/** All tours merged into a single lookup by pathname */
export const toursByPage: Record<string, TourConfig> = {
  ...generalTours,
  ...catalogTours,
  ...operationTours,
  ...commercialTours,
  ...adminTours,
};

/** Get tour config for a pathname (with dynamic-segment normalization and parent-path fallback) */
export function getTourForPathname(pathname: string): TourConfig | null {
  return _getTourForPath(toursByPage, pathname);
}
