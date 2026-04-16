import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour } from './types';

/** Discounts, Promotions, Price Lists */
export const commercialTours: Record<string, TourConfig> = {
  '/discounts': {
    id: 'discounts-tour',
    title: 'discounts-tour.title',
    description: 'discounts-tour.desc',
    steps: [
      {
        element: '[data-tour="discounts-import-export"]',
        popover: {
          title: 'discounts-tour.steps.0.title',
          description: 'discounts-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="discounts-create-btn"]',
        // Force the hover-dropdown visible so the user sees both options
        onHighlighted: () => {
          const dropdown = document.querySelector(
            '[data-tour="discounts-create-btn"] > div',
          ) as HTMLElement | null;
          if (dropdown) {
            dropdown.style.opacity = '1';
            dropdown.style.visibility = 'visible';
          }
        },
        onDeselected: () => {
          const dropdown = document.querySelector(
            '[data-tour="discounts-create-btn"] > div',
          ) as HTMLElement | null;
          if (dropdown) {
            dropdown.style.opacity = '';
            dropdown.style.visibility = '';
          }
        },
        popover: {
          title: 'discounts-tour.steps.1.title',
          description: 'discounts-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            // Click "Descuento global" (first option in dropdown)
            const wrapper = document.querySelector('[data-tour="discounts-create-btn"]');
            const globalBtn = wrapper?.querySelectorAll(':scope > div > button')?.[0] as HTMLElement;
            globalBtn?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── GLOBAL DRAWER OPEN ──
      {
        element: '[data-tour="discounts-drawer-fields"]',
        popover: {
          title: 'discounts-tour.steps.2.title',
          description: 'discounts-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="discounts-drawer-actions"]',
        popover: {
          title: 'discounts-tour.steps.3.title',
          description: 'discounts-tour.steps.3.desc',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            // Close Global drawer, reopen as Producto
            closeDrawerForTour();
            setTimeout(() => {
              const wrapper = document.querySelector('[data-tour="discounts-create-btn"]');
              const dropdown = wrapper?.querySelector(':scope > div') as HTMLElement;
              // Briefly show dropdown to click Producto option
              if (dropdown) { dropdown.style.opacity = '1'; dropdown.style.visibility = 'visible'; }
              setTimeout(() => {
                const productoBtn = wrapper?.querySelectorAll(':scope > div > button')?.[1] as HTMLElement;
                productoBtn?.click();
                if (dropdown) { dropdown.style.opacity = ''; dropdown.style.visibility = ''; }
                setTimeout(() => {
                  boostDrawerForTour();
                  driverObj.moveNext();
                }, 400);
              }, 100);
            }, 400);
          },
        },
      },
      // ── GLOBAL DRAWER CLOSE → PRODUCTO DRAWER OPEN ──
      {
        element: '[data-tour="discounts-drawer-product"]',
        popover: {
          title: 'discounts-tour.steps.4.title',
          description: 'discounts-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-drawer-actions"]',
        popover: {
          title: 'discounts-tour.steps.5.title',
          description: 'discounts-tour.steps.5.desc',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── PRODUCTO DRAWER CLOSE ──
      {
        element: '[data-tour="discounts-tabs"]',
        popover: {
          title: 'discounts-tour.steps.6.title',
          description: 'discounts-tour.steps.6.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-search"]',
        popover: {
          title: 'discounts-tour.steps.7.title',
          description: 'discounts-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-toggle-inactive"]',
        popover: {
          title: 'discounts-tour.steps.8.title',
          description: 'discounts-tour.steps.8.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="discounts-cards"]',
        popover: {
          title: 'discounts-tour.steps.9.title',
          description: 'discounts-tour.steps.9.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/promotions': {
    id: 'promotions-tour',
    title: 'promotions-tour.title',
    description: 'promotions-tour.desc',
    steps: [
      {
        element: '[data-tour="promotions-import-export"]',
        popover: {
          title: 'promotions-tour.steps.0.title',
          description: 'promotions-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="promotions-create-btn"]',
        popover: {
          title: 'promotions-tour.steps.1.title',
          description: 'promotions-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="promotions-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="promotions-drawer-name"]',
        popover: {
          title: 'promotions-tour.steps.2.title',
          description: 'promotions-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="promotions-drawer-products"]',
        popover: {
          title: 'promotions-tour.steps.3.title',
          description: 'promotions-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-discount"]',
        popover: {
          title: 'promotions-tour.steps.4.title',
          description: 'promotions-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-dates"]',
        popover: {
          title: 'promotions-tour.steps.5.title',
          description: 'promotions-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-actions"]',
        popover: {
          title: 'promotions-tour.steps.6.title',
          description: 'promotions-tour.steps.6.desc',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="promotions-search"]',
        popover: {
          title: 'promotions-tour.steps.7.title',
          description: 'promotions-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-toggle-inactive"]',
        popover: {
          title: 'promotions-tour.steps.8.title',
          description: 'promotions-tour.steps.8.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="promotions-table"]',
        popover: {
          title: 'promotions-tour.steps.9.title',
          description: 'promotions-tour.steps.9.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/price-lists': {
    id: 'price-lists-tour',
    title: 'price-lists-tour.title',
    description: 'price-lists-tour.desc',
    steps: [
      {
        element: '[data-tour="pricelists-import-export"]',
        popover: {
          title: 'price-lists-tour.steps.0.title',
          description: 'price-lists-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="pricelists-new-btn"]',
        popover: {
          title: 'price-lists-tour.steps.1.title',
          description: 'price-lists-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="pricelists-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="pricelists-drawer-name"]',
        popover: {
          title: 'price-lists-tour.steps.2.title',
          description: 'price-lists-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="pricelists-drawer-description"]',
        popover: {
          title: 'price-lists-tour.steps.3.title',
          description: 'price-lists-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="pricelists-drawer-actions"]',
        popover: {
          title: 'price-lists-tour.steps.4.title',
          description: 'price-lists-tour.steps.4.desc',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="pricelists-search"]',
        popover: {
          title: 'price-lists-tour.steps.5.title',
          description: 'price-lists-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="pricelists-toggle-inactive"]',
        popover: {
          title: 'price-lists-tour.steps.6.title',
          description: 'price-lists-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="pricelists-table"]',
        popover: {
          title: 'price-lists-tour.steps.7.title',
          description: 'price-lists-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
