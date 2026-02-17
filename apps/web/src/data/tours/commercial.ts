import { TourConfig, boostDrawerForTour, closeDrawerForTour } from './types';

/** Discounts, Promotions, Price Lists */
export const commercialTours: Record<string, TourConfig> = {
  '/discounts': {
    id: 'discounts-tour',
    title: 'Tour de Descuentos',
    description: 'Aprende a crear descuentos por cantidad, globales o por producto específico.',
    steps: [
      {
        element: '[data-tour="discounts-create-btn"]',
        popover: {
          title: 'Crear nuevo descuento',
          description:
            'Haz clic aquí y elige entre descuento global (aplica a todos los productos) o por producto específico. Define el porcentaje y la cantidad mínima.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="discounts-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de descuento',
          description:
            'Elige entre descuento global o por producto, define rangos de cantidad y porcentaje de descuento para cada rango.',
          side: 'over',
          onPrevClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="discounts-tabs"]',
        popover: {
          title: 'Tipos de descuento',
          description:
            'Navega entre las pestañas para ver descuentos globales (aplican a todo el catálogo) o por producto (aplican solo a un producto específico).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-search"]',
        popover: {
          title: 'Buscar descuentos',
          description:
            'Busca descuentos por nombre de producto, código o porcentaje.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivos',
          description:
            'Activa este switch para ver también los descuentos desactivados.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="discounts-cards"]',
        popover: {
          title: 'Tarjetas de descuento',
          description:
            'Cada tarjeta muestra el porcentaje de descuento, la cantidad mínima, quién lo creó y su estado. Puedes seleccionar varios para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/promotions': {
    id: 'promotions-tour',
    title: 'Tour de Promociones',
    description: 'Aprende a crear promociones con descuento para tus productos.',
    steps: [
      {
        element: '[data-tour="promotions-create-btn"]',
        popover: {
          title: 'Crear promoción',
          description:
            'Crea una nueva promoción con descuento para uno o más productos. Define nombre, productos, descuento y fechas de vigencia.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="promotions-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de promoción',
          description:
            'Define el nombre, selecciona productos, establece el porcentaje de descuento y las fechas de vigencia de la promoción.',
          side: 'over',
          onPrevClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="promotions-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este filtro para ver también las promociones desactivadas o vencidas. Útil para reactivar promociones anteriores.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-table"]',
        popover: {
          title: 'Lista de promociones',
          description:
            'Cada promoción muestra su nombre, productos incluidos, porcentaje de descuento, fechas de vigencia y estado. Puedes activar/desactivar, editar o eliminar.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/price-lists': {
    id: 'price-lists-tour',
    title: 'Tour de Listas de Precios',
    description: 'Aprende a crear listas de precios diferenciados para distintos tipos de clientes.',
    steps: [
      {
        element: '[data-tour="pricelists-new-btn"]',
        popover: {
          title: 'Nueva lista de precios',
          description:
            'Crea una lista de precios con nombre y descripción. Después podrás asignar precios específicos por producto dentro de cada lista.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="pricelists-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de lista de precios',
          description:
            'Define el nombre y descripción de la lista. Después podrás asignar precios específicos por producto.',
          side: 'over',
          onPrevClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="pricelists-search"]',
        popover: {
          title: 'Buscar listas',
          description:
            'Escribe el nombre de la lista de precios para encontrarla.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="pricelists-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver las listas de precios desactivadas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="pricelists-table"]',
        popover: {
          title: 'Tabla de listas',
          description:
            'Cada lista muestra nombre, descripción, última modificación y estado. Puedes editar los precios de cada producto dentro de una lista.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
