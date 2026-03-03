import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour } from './types';

/** Discounts, Promotions, Price Lists */
export const commercialTours: Record<string, TourConfig> = {
  '/discounts': {
    id: 'discounts-tour',
    title: 'Tour de Descuentos',
    description: 'Aprende a crear descuentos por cantidad, globales o por producto específico.',
    steps: [
      {
        element: '[data-tour="discounts-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus descuentos en CSV o importa desde un archivo. Columnas: TipoAplicacion (Global/Producto), Producto, CantidadMinima, DescuentoPorcentaje.',
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
          title: 'Dos tipos de descuento',
          description:
            'Hay dos tipos: <b>Descuento global</b> (aplica a todo el catálogo) y <b>Descuento por producto</b> (aplica a un producto específico). Veamos primero el global.',
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
          title: 'Descuento global — Campos',
          description:
            'Para un descuento global solo necesitas dos campos: el <b>porcentaje de descuento</b> (1-100%) y la <b>cantidad mínima</b> de unidades. El descuento aplica a todos los productos del catálogo.',
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
          title: 'Guardar descuento global',
          description:
            'Haz clic en "Crear" para guardar o "Cancelar" para descartar. Ahora veamos cómo se crea un descuento por producto.',
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
          title: 'Descuento por producto — Producto',
          description:
            'A diferencia del global, aquí debes <b>seleccionar un producto específico</b> del catálogo. El descuento solo aplicará a ese producto. Los campos de porcentaje y cantidad mínima funcionan igual.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="discounts-drawer-actions"]',
        popover: {
          title: 'Guardar descuento por producto',
          description:
            'Guarda el descuento por producto o cancela para descartar los cambios.',
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
          title: 'Pestañas de tipo',
          description:
            'Navega entre las pestañas para ver los descuentos de cada tipo por separado: "Descuento global" y "Descuento por producto".',
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
            'Activa este switch para ver también los descuentos desactivados. Por defecto solo se muestran los activos.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="discounts-cards"]',
        popover: {
          title: 'Tarjetas de descuento',
          description:
            'Cada tarjeta muestra el porcentaje, cantidad mínima, quién lo creó y su estado. Puedes seleccionar varios con los checkboxes para activar/desactivar en lote.',
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
        element: '[data-tour="promotions-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus promociones en CSV o importa desde un archivo. Columnas: Nombre*, Descripcion, DescuentoPorcentaje*, FechaInicio*, FechaFin*, Productos* (separados por punto y coma).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="promotions-create-btn"]',
        popover: {
          title: 'Nueva promoción',
          description:
            'Crea una promoción con descuento para uno o más productos con fechas de vigencia.',
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
          title: 'Nombre de la promoción',
          description:
            'Escribe un nombre descriptivo (ej. "Promo Verano 2026"). El nombre debe ser único, no puede repetirse.',
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
          title: 'Seleccionar productos',
          description:
            'Selecciona los productos que incluirá la promoción. Puedes agregar varios productos y también usar "Seleccionar todos". Un producto no puede estar en dos promociones activas con fechas que se solapen.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-discount"]',
        popover: {
          title: 'Porcentaje de descuento',
          description:
            'Define el porcentaje de descuento (1-100%). Se aplica automáticamente al crear pedidos con estos productos durante la vigencia.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-dates"]',
        popover: {
          title: 'Fechas de vigencia',
          description:
            'Define cuándo inicia y termina la promoción (formato yyyy-MM-dd). La fecha de fin debe ser posterior a la de inicio. Al vencer, la promoción se marca como expirada.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear promoción" para guardar o "Cancelar" para descartar los cambios.',
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
          title: 'Buscar promociones',
          description:
            'Busca por nombre o descripción de la promoción.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="promotions-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este filtro para ver también las promociones desactivadas o vencidas. Útil para reactivar promociones anteriores.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="promotions-table"]',
        popover: {
          title: 'Tabla de promociones',
          description:
            'Cada promoción muestra nombre, productos incluidos, porcentaje, vigencia y estado. Puedes seleccionar varias con los checkboxes para activar/desactivar en lote.',
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
        element: '[data-tour="pricelists-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus listas en CSV o importa desde un archivo para cargas masivas. El archivo requiere nombre (obligatorio) y descripción (opcional).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="pricelists-new-btn"]',
        popover: {
          title: 'Nueva lista de precios',
          description:
            'Crea una lista de precios para asignar precios específicos por producto según tipo de cliente (mayoreo, menudeo, etc.).',
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
          title: 'Nombre de la lista',
          description:
            'Escribe un nombre descriptivo (ej. Lista mayoreo, Lista minorista). Este campo es obligatorio.',
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
          title: 'Descripción',
          description:
            'Agrega una descripción opcional para identificar mejor la lista de precios.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="pricelists-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Lista" para guardar o "Cancelar" para descartar. Después podrás asignar precios por producto.',
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
          title: 'Buscar listas',
          description:
            'Escribe el nombre de la lista de precios para encontrarla rápidamente.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="pricelists-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver las listas de precios desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="pricelists-table"]',
        popover: {
          title: 'Tabla de listas',
          description:
            'Cada lista muestra nombre, descripción, última modificación y estado. Puedes seleccionar varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
