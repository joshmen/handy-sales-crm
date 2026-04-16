import { TourConfig } from './types';

/** Dashboard, Profile, Global Settings, Roles, Reports */
export const generalTours: Record<string, TourConfig> = {
  '/dashboard': {
    id: 'dashboard-general',
    title: 'dashboard-general.title',
    description: 'dashboard-general.desc',
    steps: [
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: 'dashboard-general.steps.0.title',
          description: 'dashboard-general.steps.0.desc',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="header-search"]',
        popover: {
          title: 'dashboard-general.steps.1.title',
          description: 'dashboard-general.steps.1.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="header-notifications"]',
        popover: {
          title: 'dashboard-general.steps.2.title',
          description: 'dashboard-general.steps.2.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="header-help"]',
        popover: {
          title: 'dashboard-general.steps.3.title',
          description: 'dashboard-general.steps.3.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="header-user-menu"]',
        popover: {
          title: 'dashboard-general.steps.4.title',
          description: 'dashboard-general.steps.4.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="dashboard-metrics"]',
        popover: {
          title: 'dashboard-general.steps.5.title',
          description: 'dashboard-general.steps.5.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-chart"]',
        popover: {
          title: 'dashboard-general.steps.6.title',
          description: 'dashboard-general.steps.6.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-activity"]',
        popover: {
          title: 'dashboard-general.steps.7.title',
          description: 'dashboard-general.steps.7.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-goal"]',
        popover: {
          title: 'dashboard-general.steps.8.title',
          description: 'dashboard-general.steps.8.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/reports': {
    id: 'reports-tour',
    title: 'reports-tour.title',
    description: 'reports-tour.desc',
    steps: [
      {
        element: '[data-tour="reports-cards"]',
        popover: {
          title: 'reports-tour.steps.0.title',
          description: 'reports-tour.steps.0.desc',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="report-filters"]',
        popover: {
          title: 'reports-tour.steps.1.title',
          description: 'reports-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="report-kpis"]',
        popover: {
          title: 'reports-tour.steps.2.title',
          description: 'reports-tour.steps.2.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="report-table"]',
        popover: {
          title: 'reports-tour.steps.3.title',
          description: 'reports-tour.steps.3.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/global-settings': {
    id: 'global-settings-tour',
    title: 'global-settings-tour.title',
    description: 'global-settings-tour.desc',
    steps: [
      {
        element: '[data-tour="settings-platform"]',
        popover: {
          title: 'global-settings-tour.steps.0.title',
          description: 'global-settings-tour.steps.0.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-colors"]',
        popover: {
          title: 'global-settings-tour.steps.1.title',
          description: 'global-settings-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-regional"]',
        popover: {
          title: 'global-settings-tour.steps.2.title',
          description: 'global-settings-tour.steps.2.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-save"]',
        popover: {
          title: 'global-settings-tour.steps.3.title',
          description: 'global-settings-tour.steps.3.desc',
          side: 'top',
          align: 'end',
        },
      },
    ],
  },

  '/roles': {
    id: 'roles-tour',
    title: 'roles-tour.title',
    description: 'roles-tour.desc',
    steps: [
      {
        element: '[data-tour="roles-create-btn"]',
        popover: {
          title: 'roles-tour.steps.0.title',
          description: 'roles-tour.steps.0.desc',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="roles-stats"]',
        popover: {
          title: 'roles-tour.steps.1.title',
          description: 'roles-tour.steps.1.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="roles-table"]',
        popover: {
          title: 'roles-tour.steps.2.title',
          description: 'roles-tour.steps.2.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/profile': {
    id: 'profile-tour',
    title: 'profile-tour.title',
    description: 'profile-tour.desc',
    steps: [
      {
        element: '[data-tour="profile-avatar"]',
        popover: {
          title: 'profile-tour.steps.0.title',
          description: 'profile-tour.steps.0.desc',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="profile-tabs"]',
        popover: {
          title: 'profile-tour.steps.1.title',
          description: 'profile-tour.steps.1.desc',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="profile-personal"]',
        popover: {
          title: 'profile-tour.steps.2.title',
          description: 'profile-tour.steps.2.desc',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
