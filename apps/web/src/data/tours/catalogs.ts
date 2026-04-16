import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour, scheduleTourContinuation } from './types';

/** Clients, Products, Zones, Client Categories, Product Categories, Product Families, Units */
export const catalogTours: Record<string, TourConfig> = {
  '/clients': {
    id: 'clients-tour',
    title: 'clients-tour.title',
    description: 'clients-tour.desc',
    doneBtnText: 'clients-tour.doneBtn',
    steps: [
      {
        element: '[data-tour="clients-import-export"]',
        popover: {
          title: 'clients-tour.steps.0.title',
          description: 'clients-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="clients-search"]',
        popover: {
          title: 'clients-tour.steps.1.title',
          description: 'clients-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-zone-filter"]',
        popover: {
          title: 'clients-tour.steps.2.title',
          description: 'clients-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-category-filter"]',
        popover: {
          title: 'clients-tour.steps.3.title',
          description: 'clients-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-toggle-inactive"]',
        popover: {
          title: 'clients-tour.steps.4.title',
          description: 'clients-tour.steps.4.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="clients-table"]',
        popover: {
          title: 'clients-tour.steps.5.title',
          description: 'clients-tour.steps.5.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="clients-add-btn"]',
        popover: {
          title: 'clients-tour.steps.6.title',
          description: 'clients-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            scheduleTourContinuation('new-client-tour');
            driverObj.destroy();
            (document.querySelector('[data-tour="clients-add-btn"]') as HTMLElement)?.click();
          },
        },
      },
    ],
  },

  '/clients/new': {
    id: 'new-client-tour',
    title: 'new-client-tour.title',
    description: 'new-client-tour.desc',
    steps: [
      {
        element: '[data-tour="new-client-actions"]',
        popover: {
          title: 'new-client-tour.steps.0.title',
          description: 'new-client-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="new-client-general"]',
        popover: {
          title: 'new-client-tour.steps.1.title',
          description: 'new-client-tour.steps.1.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-pricing"]',
        popover: {
          title: 'new-client-tour.steps.2.title',
          description: 'new-client-tour.steps.2.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-credit"]',
        popover: {
          title: 'new-client-tour.steps.3.title',
          description: 'new-client-tour.steps.3.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-delivery"]',
        popover: {
          title: 'new-client-tour.steps.4.title',
          description: 'new-client-tour.steps.4.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-fiscal"]',
        popover: {
          title: 'new-client-tour.steps.5.title',
          description: 'new-client-tour.steps.5.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-address"]',
        popover: {
          title: 'new-client-tour.steps.6.title',
          description: 'new-client-tour.steps.6.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-contact"]',
        popover: {
          title: 'new-client-tour.steps.7.title',
          description: 'new-client-tour.steps.7.desc',
          side: 'left',
          align: 'start',
        },
      },
    ],
  },

  '/products': {
    id: 'products-tour',
    title: 'products-tour.title',
    description: 'products-tour.desc',
    steps: [
      {
        element: '[data-tour="products-import-export"]',
        popover: {
          title: 'products-tour.steps.0.title',
          description: 'products-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="products-new-btn"]',
        popover: {
          title: 'products-tour.steps.1.title',
          description: 'products-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="products-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="product-drawer-name"]',
        popover: {
          title: 'products-tour.steps.2.title',
          description: 'products-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="product-drawer-barcode"]',
        popover: {
          title: 'products-tour.steps.3.title',
          description: 'products-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-image"]',
        popover: {
          title: 'products-tour.steps.4.title',
          description: 'products-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-family"]',
        popover: {
          title: 'products-tour.steps.5.title',
          description: 'products-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-category"]',
        popover: {
          title: 'products-tour.steps.6.title',
          description: 'products-tour.steps.6.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-unit"]',
        popover: {
          title: 'products-tour.steps.7.title',
          description: 'products-tour.steps.7.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-price"]',
        popover: {
          title: 'products-tour.steps.8.title',
          description: 'products-tour.steps.8.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-actions"]',
        popover: {
          title: 'products-tour.steps.9.title',
          description: 'products-tour.steps.9.desc',
          side: 'left',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="products-search"]',
        popover: {
          title: 'products-tour.steps.10.title',
          description: 'products-tour.steps.10.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-family-filter"]',
        popover: {
          title: 'products-tour.steps.11.title',
          description: 'products-tour.steps.11.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-category-filter"]',
        popover: {
          title: 'products-tour.steps.12.title',
          description: 'products-tour.steps.12.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-toggle-inactive"]',
        popover: {
          title: 'products-tour.steps.13.title',
          description: 'products-tour.steps.13.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="products-table"]',
        popover: {
          title: 'products-tour.steps.14.title',
          description: 'products-tour.steps.14.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/zones': {
    id: 'zones-tour',
    title: 'zones-tour.title',
    description: 'zones-tour.desc',
    steps: [
      {
        element: '[data-tour="zones-map-btn"]',
        popover: {
          title: 'zones-tour.steps.0.title',
          description: 'zones-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-import-export"]',
        popover: {
          title: 'zones-tour.steps.1.title',
          description: 'zones-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-add-btn"]',
        popover: {
          title: 'zones-tour.steps.2.title',
          description: 'zones-tour.steps.2.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="zones-add-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="zones-drawer-name"]',
        popover: {
          title: 'zones-tour.steps.3.title',
          description: 'zones-tour.steps.3.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="zones-drawer-color"]',
        popover: {
          title: 'zones-tour.steps.4.title',
          description: 'zones-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-drawer-map"]',
        popover: {
          title: 'zones-tour.steps.5.title',
          description: 'zones-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-drawer-actions"]',
        popover: {
          title: 'zones-tour.steps.6.title',
          description: 'zones-tour.steps.6.desc',
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
        element: '[data-tour="zones-search"]',
        popover: {
          title: 'zones-tour.steps.7.title',
          description: 'zones-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-toggle-inactive"]',
        popover: {
          title: 'zones-tour.steps.8.title',
          description: 'zones-tour.steps.8.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-table"]',
        popover: {
          title: 'zones-tour.steps.9.title',
          description: 'zones-tour.steps.9.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/client-categories': {
    id: 'client-categories-tour',
    title: 'client-categories-tour.title',
    description: 'client-categories-tour.desc',
    steps: [
      {
        element: '[data-tour="client-categories-import-export"]',
        popover: {
          title: 'client-categories-tour.steps.0.title',
          description: 'client-categories-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="client-categories-create-btn"]',
        popover: {
          title: 'client-categories-tour.steps.1.title',
          description: 'client-categories-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="client-categories-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="client-categories-drawer-name"]',
        popover: {
          title: 'client-categories-tour.steps.2.title',
          description: 'client-categories-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="client-categories-drawer-description"]',
        popover: {
          title: 'client-categories-tour.steps.3.title',
          description: 'client-categories-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="client-categories-drawer-actions"]',
        popover: {
          title: 'client-categories-tour.steps.4.title',
          description: 'client-categories-tour.steps.4.desc',
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
        element: '[data-tour="client-categories-search"]',
        popover: {
          title: 'client-categories-tour.steps.5.title',
          description: 'client-categories-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="client-categories-toggle-inactive"]',
        popover: {
          title: 'client-categories-tour.steps.6.title',
          description: 'client-categories-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="client-categories-table"]',
        popover: {
          title: 'client-categories-tour.steps.7.title',
          description: 'client-categories-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/product-categories': {
    id: 'product-categories-tour',
    title: 'product-categories-tour.title',
    description: 'product-categories-tour.desc',
    steps: [
      {
        element: '[data-tour="product-categories-import-export"]',
        popover: {
          title: 'product-categories-tour.steps.0.title',
          description: 'product-categories-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-categories-create-btn"]',
        popover: {
          title: 'product-categories-tour.steps.1.title',
          description: 'product-categories-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="product-categories-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="product-categories-drawer-name"]',
        popover: {
          title: 'product-categories-tour.steps.2.title',
          description: 'product-categories-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="product-categories-drawer-description"]',
        popover: {
          title: 'product-categories-tour.steps.3.title',
          description: 'product-categories-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-categories-drawer-actions"]',
        popover: {
          title: 'product-categories-tour.steps.4.title',
          description: 'product-categories-tour.steps.4.desc',
          side: 'left',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="product-categories-search"]',
        popover: {
          title: 'product-categories-tour.steps.5.title',
          description: 'product-categories-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-categories-toggle-inactive"]',
        popover: {
          title: 'product-categories-tour.steps.6.title',
          description: 'product-categories-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-categories-table"]',
        popover: {
          title: 'product-categories-tour.steps.7.title',
          description: 'product-categories-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/product-families': {
    id: 'product-families-tour',
    title: 'product-families-tour.title',
    description: 'product-families-tour.desc',
    steps: [
      {
        element: '[data-tour="product-families-import-export"]',
        popover: {
          title: 'product-families-tour.steps.0.title',
          description: 'product-families-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-families-create-btn"]',
        popover: {
          title: 'product-families-tour.steps.1.title',
          description: 'product-families-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="product-families-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="product-families-drawer-name"]',
        popover: {
          title: 'product-families-tour.steps.2.title',
          description: 'product-families-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="product-families-drawer-description"]',
        popover: {
          title: 'product-families-tour.steps.3.title',
          description: 'product-families-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-families-drawer-actions"]',
        popover: {
          title: 'product-families-tour.steps.4.title',
          description: 'product-families-tour.steps.4.desc',
          side: 'left',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="product-families-search"]',
        popover: {
          title: 'product-families-tour.steps.5.title',
          description: 'product-families-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-families-toggle-inactive"]',
        popover: {
          title: 'product-families-tour.steps.6.title',
          description: 'product-families-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-families-table"]',
        popover: {
          title: 'product-families-tour.steps.7.title',
          description: 'product-families-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/units': {
    id: 'units-tour',
    title: 'units-tour.title',
    description: 'units-tour.desc',
    steps: [
      {
        element: '[data-tour="units-import-export"]',
        popover: {
          title: 'units-tour.steps.0.title',
          description: 'units-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="units-create-btn"]',
        popover: {
          title: 'units-tour.steps.1.title',
          description: 'units-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="units-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="units-drawer-name"]',
        popover: {
          title: 'units-tour.steps.2.title',
          description: 'units-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="units-drawer-abbreviation"]',
        popover: {
          title: 'units-tour.steps.3.title',
          description: 'units-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="units-drawer-actions"]',
        popover: {
          title: 'units-tour.steps.4.title',
          description: 'units-tour.steps.4.desc',
          side: 'left',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="units-search"]',
        popover: {
          title: 'units-tour.steps.5.title',
          description: 'units-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="units-toggle-inactive"]',
        popover: {
          title: 'units-tour.steps.6.title',
          description: 'units-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="units-table"]',
        popover: {
          title: 'units-tour.steps.7.title',
          description: 'units-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/metas': {
    id: 'metas-tour',
    title: 'metas-tour.title',
    description: 'metas-tour.desc',
    steps: [
      {
        element: '[data-tour="metas-add-btn"]',
        popover: {
          title: 'metas-tour.steps.0.title',
          description: 'metas-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="metas-add-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="metas-drawer-vendedor"]',
        popover: {
          title: 'metas-tour.steps.1.title',
          description: 'metas-tour.steps.1.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-tipo"]',
        popover: {
          title: 'metas-tour.steps.2.title',
          description: 'metas-tour.steps.2.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-monto"]',
        popover: {
          title: 'metas-tour.steps.3.title',
          description: 'metas-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-fechas"]',
        popover: {
          title: 'metas-tour.steps.4.title',
          description: 'metas-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-actions"]',
        popover: {
          title: 'metas-tour.steps.5.title',
          description: 'metas-tour.steps.5.desc',
          side: 'top',
          align: 'center',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 350);
          },
        },
      },
      {
        element: '[data-tour="metas-search"]',
        popover: {
          title: 'metas-tour.steps.6.title',
          description: 'metas-tour.steps.6.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-tipo-filter"]',
        popover: {
          title: 'metas-tour.steps.7.title',
          description: 'metas-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-table"]',
        popover: {
          title: 'metas-tour.steps.8.title',
          description: 'metas-tour.steps.8.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
