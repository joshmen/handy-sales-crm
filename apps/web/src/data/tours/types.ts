export interface TourStep {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right' | 'over';
    align?: 'start' | 'center' | 'end';
    popoverClass?: string;
    /** Custom handler when "Next" is clicked. Receives driverObj to call moveNext(). */
    onNextClick?: (driverObj: any) => void;
    /** Custom handler when "Previous" is clicked. Receives driverObj to call movePrevious(). */
    onPrevClick?: (driverObj: any) => void;
  };
}

/** Boost drawer z-index so driver.js can highlight elements inside it */
export function boostDrawerForTour() {
  document.querySelector('[data-drawer-root]')?.classList.add('tour-drawer-active');
}

/** Restore drawer z-index after tour leaves the drawer */
export function restoreDrawerFromTour() {
  document.querySelector('[data-drawer-root]')?.classList.remove('tour-drawer-active');
}

/** Close any open drawer (via Escape key) */
export function closeDrawerForTour() {
  restoreDrawerFromTour();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

export interface TourConfig {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}

/** Creates a centered image preview step (no element highlight) */
export function imageStep(title: string, imagePath: string, caption: string): TourStep {
  return {
    popover: {
      title: `📋 ${title}`,
      description: `<div class="tour-img-wrap"><img src="${imagePath}" alt="${title}" /><p class="tour-img-caption">${caption}</p></div>`,
      side: 'over',
      popoverClass: 'tour-image-step',
    },
  };
}

/** Normalize dynamic path segments (e.g. /routes/manage/8/load → /routes/manage/[id]/load) */
function normalizeDynamicPath(pathname: string): string {
  return pathname
    .replace(/\/manage\/\d+\//, '/manage/[id]/')
    .replace(/\/manage\/\d+$/, '/manage/[id]');
}

/** Get tour config for a pathname (with parent-path fallback) */
export function getTourForPath(
  toursByPage: Record<string, TourConfig>,
  pathname: string,
): TourConfig | null {
  if (toursByPage[pathname]) return toursByPage[pathname];

  const normalized = normalizeDynamicPath(pathname);
  if (toursByPage[normalized]) return toursByPage[normalized];

  const segments = pathname.split('/').filter(Boolean);
  while (segments.length > 0) {
    const testPath = '/' + segments.join('/');
    if (toursByPage[testPath]) return toursByPage[testPath];
    segments.pop();
  }

  return null;
}
