import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour, scheduleTourContinuation } from './types';

/** Orders, Inventory, Movements, Routes (all variants), Deliveries, Calendar, Visits */
export const operationTours: Record<string, TourConfig> = {
  '/orders': {
    id: 'orders-tour',
    title: 'orders-tour.title',
    description: 'orders-tour.desc',
    steps: [
      {
        element: '[data-tour="orders-search"]',
        popover: {
          title: 'orders-tour.steps.0.title',
          description: 'orders-tour.steps.0.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-date-filter"]',
        popover: {
          title: 'orders-tour.steps.1.title',
          description: 'orders-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-estado-filter"]',
        popover: {
          title: 'orders-tour.steps.2.title',
          description: 'orders-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-user-filter"]',
        popover: {
          title: 'orders-tour.steps.3.title',
          description: 'orders-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-tipo-filter"]',
        popover: {
          title: 'orders-tour.steps.4.title',
          description: 'orders-tour.steps.4.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: 'orders-tour.steps.5.title',
          description: 'orders-tour.steps.5.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="orders-create-btn"]',
        popover: {
          title: 'orders-tour.steps.6.title',
          description: 'orders-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="orders-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="order-client-selector"]',
        popover: {
          title: 'orders-tour.steps.7.title',
          description: 'orders-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="order-add-product"]',
        popover: {
          title: 'orders-tour.steps.8.title',
          description: 'orders-tour.steps.8.desc',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-tour="order-products-list"]',
        popover: {
          title: 'orders-tour.steps.9.title',
          description: 'orders-tour.steps.9.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="order-notes"]',
        popover: {
          title: 'orders-tour.steps.10.title',
          description: 'orders-tour.steps.10.desc',
          side: 'top',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
    ],
  },

  '/inventory': {
    id: 'inventory-tour',
    title: 'inventory-tour.title',
    description: 'inventory-tour.desc',
    steps: [
      {
        element: '[data-tour="inventory-import-export"]',
        popover: {
          title: 'inventory-tour.steps.0.title',
          description: 'inventory-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="inventory-add-btn"]',
        popover: {
          title: 'inventory-tour.steps.1.title',
          description: 'inventory-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="inventory-add-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="inventory-product-selector"]',
        popover: {
          title: 'inventory-tour.steps.2.title',
          description: 'inventory-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="inventory-quantity"]',
        popover: {
          title: 'inventory-tour.steps.3.title',
          description: 'inventory-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-stock-fields"]',
        popover: {
          title: 'inventory-tour.steps.4.title',
          description: 'inventory-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-drawer-actions"]',
        popover: {
          title: 'inventory-tour.steps.5.title',
          description: 'inventory-tour.steps.5.desc',
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
        element: '[data-tour="inventory-search"]',
        popover: {
          title: 'inventory-tour.steps.6.title',
          description: 'inventory-tour.steps.6.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-table"]',
        popover: {
          title: 'inventory-tour.steps.7.title',
          description: 'inventory-tour.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="inventory-stock-columns"]',
        popover: {
          title: 'inventory-tour.steps.8.title',
          description: 'inventory-tour.steps.8.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/inventory/movements': {
    id: 'movements-tour',
    title: 'movements-tour.title',
    description: 'movements-tour.desc',
    steps: [
      {
        element: '[data-tour="movements-export-btn"]',
        popover: {
          title: 'movements-tour.steps.0.title',
          description: 'movements-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="movements-new-btn"]',
        popover: {
          title: 'movements-tour.steps.1.title',
          description: 'movements-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="movements-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="movements-product-selector"]',
        popover: {
          title: 'movements-tour.steps.2.title',
          description: 'movements-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="movements-type-selector"]',
        popover: {
          title: 'movements-tour.steps.3.title',
          description: 'movements-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-quantity"]',
        popover: {
          title: 'movements-tour.steps.4.title',
          description: 'movements-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-reason"]',
        popover: {
          title: 'movements-tour.steps.5.title',
          description: 'movements-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-drawer-actions"]',
        popover: {
          title: 'movements-tour.steps.6.title',
          description: 'movements-tour.steps.6.desc',
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
        element: '[data-tour="movements-search"]',
        popover: {
          title: 'movements-tour.steps.7.title',
          description: 'movements-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-type-filter"]',
        popover: {
          title: 'movements-tour.steps.8.title',
          description: 'movements-tour.steps.8.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-reason-filter"]',
        popover: {
          title: 'movements-tour.steps.9.title',
          description: 'movements-tour.steps.9.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-table"]',
        popover: {
          title: 'movements-tour.steps.10.title',
          description: 'movements-tour.steps.10.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/routes': {
    id: 'routes-tour',
    title: 'routes-tour.title',
    description: 'routes-tour.desc',
    steps: [
      {
        element: '[data-tour="routes-export-btn"]',
        popover: {
          title: 'routes-tour.steps.0.title',
          description: 'routes-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-new-btn"]',
        popover: {
          title: 'routes-tour.steps.1.title',
          description: 'routes-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="routes-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="routes-drawer-nombre"]',
        popover: {
          title: 'routes-tour.steps.2.title',
          description: 'routes-tour.steps.2.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="routes-drawer-vendedor"]',
        popover: {
          title: 'routes-tour.steps.3.title',
          description: 'routes-tour.steps.3.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-zona"]',
        popover: {
          title: 'routes-tour.steps.4.title',
          description: 'routes-tour.steps.4.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-fecha"]',
        popover: {
          title: 'routes-tour.steps.5.title',
          description: 'routes-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-horario"]',
        popover: {
          title: 'routes-tour.steps.6.title',
          description: 'routes-tour.steps.6.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-actions"]',
        popover: {
          title: 'routes-tour.steps.7.title',
          description: 'routes-tour.steps.7.desc',
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
        element: '[data-tour="routes-filters"]',
        popover: {
          title: 'routes-tour.steps.8.title',
          description: 'routes-tour.steps.8.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-toggle-inactive"]',
        popover: {
          title: 'routes-tour.steps.9.title',
          description: 'routes-tour.steps.9.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-table"]',
        popover: {
          title: 'routes-tour.steps.10.title',
          description: 'routes-tour.steps.10.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/routes/manage': {
    id: 'routes-manage-tour',
    title: 'routes-manage-tour.title',
    description: 'routes-manage-tour.desc',
    doneBtnText: 'routes-manage-tour.doneBtn',
    steps: [
      {
        element: '[data-tour="routes-manage-export-btn"]',
        popover: {
          title: 'routes-manage-tour.steps.0.title',
          description: 'routes-manage-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-manage-filters"]',
        popover: {
          title: 'routes-manage-tour.steps.1.title',
          description: 'routes-manage-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-date-filter"]',
        popover: {
          title: 'routes-manage-tour.steps.2.title',
          description: 'routes-manage-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-user-filter"]',
        popover: {
          title: 'routes-manage-tour.steps.3.title',
          description: 'routes-manage-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-estado-filter"]',
        popover: {
          title: 'routes-manage-tour.steps.4.title',
          description: 'routes-manage-tour.steps.4.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-refresh"]',
        popover: {
          title: 'routes-manage-tour.steps.5.title',
          description: 'routes-manage-tour.steps.5.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-manage-table"]',
        popover: {
          title: 'routes-manage-tour.steps.6.title',
          description: 'routes-manage-tour.steps.6.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-manage-row"]',
        popover: {
          title: 'routes-manage-tour.steps.7.title',
          description: 'routes-manage-tour.steps.7.desc',
          side: 'bottom',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            const row = document.querySelector('[data-tour="routes-manage-row"]') as HTMLElement;
            if (!row) return;
            // Detect if the route goes to close page (Terminada/Cerrada) or load page
            const badge = row.querySelector('.rounded-full');
            const badgeText = badge?.textContent?.trim() || '';
            const isClose = badgeText === 'Terminada' || badgeText === 'Cerrada';
            scheduleTourContinuation(isClose ? 'routes-close-tour' : 'routes-load-tour');
            driverObj.destroy();
            row.click();
          },
        },
      },
    ],
  },

  '/routes/manage/[id]/load': {
    id: 'routes-load-tour',
    title: 'routes-load-tour.title',
    description: 'routes-load-tour.desc',
    steps: [
      {
        element: '[data-tour="routes-load-stats"]',
        popover: {
          title: 'routes-load-tour.steps.0.title',
          description: 'routes-load-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-header-actions"]',
        popover: {
          title: 'routes-load-tour.steps.1.title',
          description: 'routes-load-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-load-user-section"]',
        popover: {
          title: 'routes-load-tour.steps.2.title',
          description: 'routes-load-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-pedidos"]',
        popover: {
          title: 'routes-load-tour.steps.3.title',
          description: 'routes-load-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-add-products"]',
        popover: {
          title: 'routes-load-tour.steps.4.title',
          description: 'routes-load-tour.steps.4.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-consolidated"]',
        popover: {
          title: 'routes-load-tour.steps.5.title',
          description: 'routes-load-tour.steps.5.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-submit"]',
        popover: {
          title: 'routes-load-tour.steps.6.title',
          description: 'routes-load-tour.steps.6.desc',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },

  '/routes/manage/[id]/close': {
    id: 'routes-close-tour',
    title: 'routes-close-tour.title',
    description: 'routes-close-tour.desc',
    steps: [
      {
        element: '[data-tour="routes-close-tabs"]',
        popover: {
          title: 'routes-close-tour.steps.0.title',
          description: 'routes-close-tour.steps.0.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-details"]',
        popover: {
          title: 'routes-close-tour.steps.1.title',
          description: 'routes-close-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-financial"]',
        popover: {
          title: 'routes-close-tour.steps.2.title',
          description: 'routes-close-tour.steps.2.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-balance"]',
        popover: {
          title: 'routes-close-tour.steps.3.title',
          description: 'routes-close-tour.steps.3.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-inventory"]',
        popover: {
          title: 'routes-close-tour.steps.4.title',
          description: 'routes-close-tour.steps.4.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-actions"]',
        popover: {
          title: 'routes-close-tour.steps.5.title',
          description: 'routes-close-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-btn"]',
        popover: {
          title: 'routes-close-tour.steps.6.title',
          description: 'routes-close-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/deliveries': {
    id: 'deliveries-tour',
    title: 'deliveries-tour.title',
    description: 'deliveries-tour.desc',
    steps: [
      {
        element: '[data-tour="deliveries-stats"]',
        popover: {
          title: 'deliveries-tour.steps.0.title',
          description: 'deliveries-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="deliveries-search"]',
        popover: {
          title: 'deliveries-tour.steps.1.title',
          description: 'deliveries-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="deliveries-status-filter"]',
        popover: {
          title: 'deliveries-tour.steps.2.title',
          description: 'deliveries-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="deliveries-table"]',
        popover: {
          title: 'deliveries-tour.steps.3.title',
          description: 'deliveries-tour.steps.3.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="deliveries-refresh"]',
        popover: {
          title: 'deliveries-tour.steps.4.title',
          description: 'deliveries-tour.steps.4.desc',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/calendar': {
    id: 'calendar-tour',
    title: 'calendar-tour.title',
    description: 'calendar-tour.desc',
    steps: [
      {
        element: '[data-tour="calendar-schedule-visit"]',
        popover: {
          title: 'calendar-tour.steps.0.title',
          description: 'calendar-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="calendar-prospect-rules"]',
        popover: {
          title: 'calendar-tour.steps.1.title',
          description: 'calendar-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="calendar-user-filter"]',
        popover: {
          title: 'calendar-tour.steps.2.title',
          description: 'calendar-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="calendar-nav"]',
        popover: {
          title: 'calendar-tour.steps.3.title',
          description: 'calendar-tour.steps.3.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="calendar-view"]',
        popover: {
          title: 'calendar-tour.steps.4.title',
          description: 'calendar-tour.steps.4.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/visits': {
    id: 'visits-tour',
    title: 'visits-tour.title',
    description: 'visits-tour.desc',
    steps: [
      {
        element: '[data-tour="visits-summary"]',
        popover: {
          title: 'visits-tour.steps.0.title',
          description: 'visits-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-list"]',
        popover: {
          title: 'visits-tour.steps.1.title',
          description: 'visits-tour.steps.1.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-view-toggle"]',
        popover: {
          title: 'visits-tour.steps.2.title',
          description: 'visits-tour.steps.2.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-create"]',
        popover: {
          title: 'visits-tour.steps.3.title',
          description: 'visits-tour.steps.3.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="visits-create"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="visits-form-client"]',
        popover: {
          title: 'visits-tour.steps.4.title',
          description: 'visits-tour.steps.4.desc',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="visits-form-type"]',
        popover: {
          title: 'visits-tour.steps.5.title',
          description: 'visits-tour.steps.5.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="visits-form-date"]',
        popover: {
          title: 'visits-tour.steps.6.title',
          description: 'visits-tour.steps.6.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="visits-form-actions"]',
        popover: {
          title: 'visits-tour.steps.7.title',
          description: 'visits-tour.steps.7.desc',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
    ],
  },

  '/automations': {
    id: 'automations-tour',
    title: 'automations-tour.title',
    description: 'automations-tour.desc',
    steps: [
      {
        element: '[data-tour="automations-kpis"]',
        popover: {
          title: 'automations-tour.steps.0.title',
          description: 'automations-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-categories"]',
        popover: {
          title: 'automations-tour.steps.1.title',
          description: 'automations-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="automations-grid"]',
        popover: {
          title: 'automations-tour.steps.2.title',
          description: 'automations-tour.steps.2.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-toggle"]',
        popover: {
          title: 'automations-tour.steps.3.title',
          description: 'automations-tour.steps.3.desc',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-config-btn"]',
        popover: {
          title: 'automations-tour.steps.4.title',
          description: 'automations-tour.steps.4.desc',
          side: 'left',
          align: 'center',
          onNextClick: (driverObj: Driver) => {
            const btn = document.querySelector('[data-tour="automations-config-btn"]') as HTMLElement;
            btn?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="automations-drawer-desc"]',
        popover: {
          title: 'automations-tour.steps.5.title',
          description: 'automations-tour.steps.5.desc',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="automations-drawer-form"]',
        popover: {
          title: 'automations-tour.steps.6.title',
          description: 'automations-tour.steps.6.desc',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="automations-drawer-actions"]',
        popover: {
          title: 'automations-tour.steps.7.title',
          description: 'automations-tour.steps.7.desc',
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
        element: '[data-tour="automations-historial"]',
        popover: {
          title: 'automations-tour.steps.8.title',
          description: 'automations-tour.steps.8.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/cobranza': {
    id: 'cobranza-tour',
    title: 'cobranza-tour.title',
    description: 'cobranza-tour.desc',
    steps: [
      {
        element: '[data-tour="cobranza-kpis"]',
        popover: {
          title: 'cobranza-tour.steps.0.title',
          description: 'cobranza-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="cobranza-date-filter"]',
        popover: {
          title: 'cobranza-tour.steps.1.title',
          description: 'cobranza-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="cobranza-new-btn"]',
        popover: {
          title: 'cobranza-tour.steps.2.title',
          description: 'cobranza-tour.steps.2.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="cobranza-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="cobro-client-selector"]',
        popover: {
          title: 'cobranza-tour.steps.3.title',
          description: 'cobranza-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="cobro-pedido-selector"]',
        popover: {
          title: 'cobranza-tour.steps.4.title',
          description: 'cobranza-tour.steps.4.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="cobro-amount-method"]',
        popover: {
          title: 'cobranza-tour.steps.5.title',
          description: 'cobranza-tour.steps.5.desc',
          side: 'top',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="cobranza-tabs"]',
        popover: {
          title: 'cobranza-tour.steps.6.title',
          description: 'cobranza-tour.steps.6.desc',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            // Switch to cobros tab before showing cobros table
            (document.querySelector('[data-tour="cobranza-tabs"] button:first-child') as HTMLElement)?.click();
            setTimeout(() => driverObj.moveNext(), 200);
          },
        },
      },
      {
        element: '[data-tour="cobranza-cobros-table"]',
        popover: {
          title: 'cobranza-tour.steps.7.title',
          description: 'cobranza-tour.steps.7.desc',
          side: 'top',
          align: 'center',
          onNextClick: (driverObj: Driver) => {
            // Switch to saldos tab before showing saldos table
            (document.querySelector('[data-tour="cobranza-tabs"] button:last-child') as HTMLElement)?.click();
            setTimeout(() => driverObj.moveNext(), 200);
          },
        },
      },
      {
        element: '[data-tour="cobranza-saldos-table"]',
        popover: {
          title: 'cobranza-tour.steps.8.title',
          description: 'cobranza-tour.steps.8.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
  '/reports': {
    id: 'reports-tour',
    title: 'reports-tour-ops.title',
    description: 'reports-tour-ops.desc',
    steps: [
      {
        element: '[data-tour="reports-cards"]',
        popover: {
          title: 'reports-tour-ops.steps.0.title',
          description: 'reports-tour-ops.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
    ],
  },
};
