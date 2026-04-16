import { TourConfig, imageStep } from './types';

/** Users, Devices, Notifications, Activity Logs, Forms */
export const adminTours: Record<string, TourConfig> = {
  '/users': {
    id: 'users-tour',
    title: 'users-tour.title',
    description: 'users-tour.desc',
    steps: [
      {
        element: '[data-tour="users-create-btn"]',
        popover: {
          title: 'users-tour.steps.0.title',
          description: 'users-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      imageStep(
        'users-tour.steps.1.title',
        '/images/tour/usuarios-crear.jpg',
        'users-tour.steps.1.desc',
      ),
      {
        element: '[data-tour="users-role-filter"]',
        popover: {
          title: 'users-tour.steps.2.title',
          description: 'users-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="users-cards"]',
        popover: {
          title: 'users-tour.steps.3.title',
          description: 'users-tour.steps.3.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/forms': {
    id: 'forms-tour',
    title: 'forms-tour.title',
    description: 'forms-tour.desc',
    steps: [
      {
        element: '[data-tour="forms-create-btn"]',
        popover: {
          title: 'forms-tour.steps.0.title',
          description: 'forms-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="forms-toggle-inactive"]',
        popover: {
          title: 'forms-tour.steps.1.title',
          description: 'forms-tour.steps.1.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="forms-table"]',
        popover: {
          title: 'forms-tour.steps.2.title',
          description: 'forms-tour.steps.2.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/devices': {
    id: 'devices-tour',
    title: 'devices-tour.title',
    description: 'devices-tour.desc',
    steps: [
      {
        element: '[data-tour="devices-search"]',
        popover: {
          title: 'devices-tour.steps.0.title',
          description: 'devices-tour.steps.0.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="devices-filter-user"]',
        popover: {
          title: 'devices-tour.steps.1.title',
          description: 'devices-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="devices-table"]',
        popover: {
          title: 'devices-tour.steps.2.title',
          description: 'devices-tour.steps.2.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="devices-refresh"]',
        popover: {
          title: 'devices-tour.steps.3.title',
          description: 'devices-tour.steps.3.desc',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/notifications': {
    id: 'notifications-tour',
    title: 'notifications-tour.title',
    description: 'notifications-tour.desc',
    steps: [
      {
        element: '[data-tour="notifications-create-btn"]',
        popover: {
          title: 'notifications-tour.steps.0.title',
          description: 'notifications-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="notifications-search"]',
        popover: {
          title: 'notifications-tour.steps.1.title',
          description: 'notifications-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="notifications-filter-type"]',
        popover: {
          title: 'notifications-tour.steps.2.title',
          description: 'notifications-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="notifications-list"]',
        popover: {
          title: 'notifications-tour.steps.3.title',
          description: 'notifications-tour.steps.3.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/activity-logs': {
    id: 'activity-logs-tour',
    title: 'activity-logs-tour.title',
    description: 'activity-logs-tour.desc',
    steps: [
      {
        element: '[data-tour="logs-export-btn"]',
        popover: {
          title: 'activity-logs-tour.steps.0.title',
          description: 'activity-logs-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="logs-search"]',
        popover: {
          title: 'activity-logs-tour.steps.1.title',
          description: 'activity-logs-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-filter-action"]',
        popover: {
          title: 'activity-logs-tour.steps.2.title',
          description: 'activity-logs-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-filter-entity"]',
        popover: {
          title: 'activity-logs-tour.steps.3.title',
          description: 'activity-logs-tour.steps.3.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-table"]',
        popover: {
          title: 'activity-logs-tour.steps.4.title',
          description: 'activity-logs-tour.steps.4.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
