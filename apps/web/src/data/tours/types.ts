import type { Driver } from 'driver.js';

export interface TourStep {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right' | 'over';
    align?: 'start' | 'center' | 'end';
    popoverClass?: string;
    /** Custom handler when "Next" is clicked. Receives driverObj to call moveNext(). */
    onNextClick?: (driverObj: Driver) => void;
    /** Custom handler when "Previous" is clicked. Receives driverObj to call movePrevious(). */
    onPrevClick?: (driverObj: Driver) => void;
  };
}

// --- Drawer spotlight: SVG overlay with cutout (like driver.js) ---
let _tourFrameId: number | null = null;

/** Build the SVG path: outer rect (covers scroll area) with rounded-rect cutout */
function buildOverlayPath(
  panel: HTMLElement,
  activeEl: HTMLElement | null,
): string {
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;

  // Determine scroll body area (between header & footer)
  const header = panel.querySelector(':scope > .flex-shrink-0.border-b') as HTMLElement | null;
  const footer = panel.querySelector(':scope > .drawer-footer') as HTMLElement | null;
  const top = header ? header.offsetHeight : 0;
  const bot = footer ? ph - footer.offsetHeight : ph;

  // Extend overlay to cover footer when the active element lives there
  const activeInFooter = activeEl && footer && footer.contains(activeEl);
  const effectiveBot = activeInFooter ? ph : bot;

  // Outer rect covering scroll area (and footer when active element is in it)
  const outer = `M0,${top} L${pw},${top} L${pw},${effectiveBot} L0,${effectiveBot}Z`;
  if (!activeEl) return outer;

  const panelRect = panel.getBoundingClientRect();
  const elRect = activeEl.getBoundingClientRect();
  const pad = 10; // matches driver.js stagePadding
  const r = 8;    // matches driver.js stageRadius

  const x = elRect.left - panelRect.left - pad;
  const y = elRect.top - panelRect.top - pad;
  const w = elRect.width + pad * 2;
  const h = elRect.height + pad * 2;

  // Inner rounded-rect cutout (counter-clockwise → evenodd creates hole)
  const cutout =
    `M${x + r},${y} h${w - 2 * r}` +
    ` a${r},${r} 0 0 1 ${r},${r}` +
    ` v${h - 2 * r}` +
    ` a${r},${r} 0 0 1 -${r},${r}` +
    ` h-${w - 2 * r}` +
    ` a${r},${r} 0 0 1 -${r},-${r}` +
    ` v-${h - 2 * r}` +
    ` a${r},${r} 0 0 1 ${r},-${r}z`;

  return `${outer} ${cutout}`;
}

/** Boost drawer z-index and inject an SVG overlay with an animated cutout
 *  that tracks the driver-active-element via requestAnimationFrame. */
export function boostDrawerForTour() {
  const root = document.querySelector('[data-drawer-root]');
  if (!root) return;
  root.classList.add('tour-drawer-active');

  const panel = root.querySelector('[data-drawer-panel]') as HTMLElement | null;
  if (!panel || panel.querySelector('.tour-drawer-svg')) return;

  // Create SVG overlay
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('tour-drawer-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.style.fill = 'rgb(0,0,0)';
  path.style.opacity = '0.7';
  path.style.fillRule = 'evenodd';
  svg.appendChild(path);
  panel.appendChild(svg);

  // rAF loop: keep cutout in sync with the active element
  function tick() {
    const pw = panel!.offsetWidth;
    const ph = panel!.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${pw} ${ph}`);
    const activeEl = panel!.querySelector('.driver-active-element') as HTMLElement | null;
    path.setAttribute('d', buildOverlayPath(panel!, activeEl));
    _tourFrameId = requestAnimationFrame(tick);
  }
  _tourFrameId = requestAnimationFrame(tick);
}

/** Restore drawer z-index and remove SVG overlay */
export function restoreDrawerFromTour() {
  if (_tourFrameId != null) {
    cancelAnimationFrame(_tourFrameId);
    _tourFrameId = null;
  }
  const root = document.querySelector('[data-drawer-root]');
  if (!root) return;
  root.classList.remove('tour-drawer-active');
  root.querySelectorAll('.tour-drawer-svg').forEach(el => el.remove());
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
  /** Override the "done" button text on the last step (default: "Terminar").
   *  Use "Siguiente" when the tour continues on another page. */
  doneBtnText?: string;
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

// --- Cross-page tour continuation ---
const TOUR_CONTINUE_KEY = 'handy-tour-continue';

/** Schedule a tour to auto-start on the next page after navigation */
export function scheduleTourContinuation(tourId: string) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(TOUR_CONTINUE_KEY, tourId);
  }
}

/** Check and consume a pending tour continuation. Returns tourId or null. */
export function consumeTourContinuation(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const tourId = sessionStorage.getItem(TOUR_CONTINUE_KEY);
  if (tourId) sessionStorage.removeItem(TOUR_CONTINUE_KEY);
  return tourId;
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
