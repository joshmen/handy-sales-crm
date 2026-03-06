import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour, scheduleTourContinuation } from './types';

/** Clients, Products, Zones, Client Categories, Product Categories, Product Families, Units */
export const catalogTours: Record<string, TourConfig> = {
  '/clients': {
    id: 'clients-tour',
    title: 'Tour de Clientes',
    description: 'Aprende a gestionar tu cartera de clientes: agregar, filtrar, editar y organizar.',
    doneBtnText: 'Siguiente',
    steps: [
      {
        element: '[data-tour="clients-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tu lista de clientes en CSV o importa clientes desde un archivo CSV para cargas masivas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="clients-search"]',
        popover: {
          title: 'Buscar clientes',
          description:
            'Escribe el nombre o código del cliente para filtrar la lista rápidamente.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-zone-filter"]',
        popover: {
          title: 'Filtrar por zona',
          description:
            'Selecciona una zona geográfica para ver solo los clientes de esa área. Útil para planear rutas de visita.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-category-filter"]',
        popover: {
          title: 'Filtrar por categoría',
          description:
            'Filtra por categoría de cliente (mayorista, minorista, etc.) para segmentar tu cartera.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="clients-toggle-inactive"]',
        popover: {
          title: 'Mostrar clientes inactivos',
          description:
            'Activa este switch para ver también los clientes desactivados. Por defecto solo se muestran los activos.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="clients-table"]',
        popover: {
          title: 'Tabla de clientes',
          description:
            'Aquí ves todos tus clientes con su zona, categoría, saldo y estado. Puedes seleccionar varios con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="clients-add-btn"]',
        popover: {
          title: 'Crear nuevo cliente',
          description:
            'Haz clic en "Siguiente" para ir al formulario de nuevo cliente y conocer cada sección.',
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
    title: 'Tour de Crear Cliente',
    description: 'Aprende a completar el formulario para registrar un nuevo cliente.',
    steps: [
      {
        element: '[data-tour="new-client-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Cuando termines de llenar el formulario, haz clic en "Guardar" para registrar el cliente. Si deseas descartar los cambios, usa "Cancelar".',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="new-client-general"]',
        popover: {
          title: 'Información general',
          description:
            'Captura el nombre del cliente, selecciona su categoría (mayorista, minorista, etc.) y marca si es prospecto. El nombre y la categoría son obligatorios.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-pricing"]',
        popover: {
          title: 'Precios y descuento',
          description:
            'Asigna una lista de precios especial para este cliente y un porcentaje de descuento general. Esta sección es opcional.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-credit"]',
        popover: {
          title: 'Pago, venta y crédito',
          description:
            'Define el saldo inicial, límite de crédito y el monto mínimo para que una visita se considere efectiva.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-delivery"]',
        popover: {
          title: 'Configuración de entregas',
          description:
            'Elige si el cliente paga de contado, a crédito o ambos. Configura el tipo de pago predeterminado y los días de crédito.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-fiscal"]',
        popover: {
          title: 'Datos fiscales',
          description:
            'Si el cliente requiere factura, activa "Facturable" para capturar RFC, razón social, régimen fiscal y uso CFDI conforme a los requisitos del SAT.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-address"]',
        popover: {
          title: 'Dirección y mapa',
          description:
            'Escribe la dirección y el autocompletado de Google Maps llenará los campos automáticamente. Selecciona la zona geográfica del cliente. El mapa muestra la ubicación y valida que esté dentro de la zona.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="new-client-contact"]',
        popover: {
          title: 'Datos de contacto',
          description:
            'Registra el nombre del encargado, teléfono (10 dígitos) y correo electrónico del cliente. El teléfono y email son obligatorios.',
          side: 'left',
          align: 'start',
        },
      },
    ],
  },

  '/products': {
    id: 'products-tour',
    title: 'Tour de Productos',
    description: 'Aprende a dar de alta productos, asignar precios, familias y categorías.',
    steps: [
      {
        element: '[data-tour="products-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tu catálogo de productos en CSV o importa productos desde un archivo CSV para cargas masivas. El archivo debe incluir nombre, código de barras, precio base, familia, categoría y unidad de medida.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="products-new-btn"]',
        popover: {
          title: 'Crear nuevo producto',
          description:
            'Haz clic aquí para dar de alta un producto. Se abrirá un formulario lateral donde capturarás todos los datos.',
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
          title: 'Nombre del producto',
          description:
            'Captura el nombre del producto tal como lo conocen tus vendedores. Es obligatorio y debe ser único.',
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
          title: 'Código de barras',
          description:
            'Ingresa el código de barras del producto (EAN-13, UPC, etc.). Es obligatorio y debe ser único. Los vendedores podrán escanearlo desde la app móvil.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-image"]',
        popover: {
          title: 'Imagen del producto',
          description:
            'Sube una foto del producto en JPEG, PNG o WebP (máximo 5 MB). La imagen aparecerá en el catálogo y en la app móvil de los vendedores.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-family"]',
        popover: {
          title: 'Familia de productos',
          description:
            'Selecciona la familia principal del producto (ej: Bebidas, Abarrotes, Lácteos). Las familias se configuran en el catálogo de Familias de Productos.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-category"]',
        popover: {
          title: 'Categoría',
          description:
            'Selecciona la categoría que subdivide la familia (ej: Refrescos dentro de Bebidas). Las categorías se configuran en el catálogo de Categorías de Productos.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-unit"]',
        popover: {
          title: 'Unidad de medida',
          description:
            'Selecciona cómo se vende el producto: Pieza, Caja, Litro, Kilogramo, etc. Las unidades se configuran en el catálogo de Unidades de Medida.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-price"]',
        popover: {
          title: 'Precio base',
          description:
            'El precio de venta principal del producto. Si usas listas de precios, cada lista puede tener un precio diferente para este producto.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Producto" para guardarlo o "Cancelar" para descartar. Si hay cambios sin guardar, se te pedirá confirmar.',
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
          title: 'Buscar productos',
          description:
            'Escribe el nombre o código del producto para encontrarlo rápidamente.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-family-filter"]',
        popover: {
          title: 'Filtrar por familia',
          description:
            'Las familias agrupan productos por tipo (ej: Bebidas, Abarrotes, Lácteos). Selecciona una para filtrar la lista.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-category-filter"]',
        popover: {
          title: 'Filtrar por categoría',
          description:
            'Las categorías subdividen las familias (ej: Refrescos, Jugos dentro de Bebidas). Usa este filtro para refinar la búsqueda.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="products-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivos',
          description:
            'Activa este switch para ver productos desactivados. Los productos inactivos no aparecen al crear pedidos.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="products-table"]',
        popover: {
          title: 'Catálogo de productos',
          description:
            'Aquí ves todos tus productos con imagen, código, precio, existencia, familia y categoría. Los productos con stock bajo se marcan en rojo. Puedes seleccionar varios con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/zones': {
    id: 'zones-tour',
    title: 'Tour de Zonas',
    description: 'Aprende a organizar tu territorio en zonas geográficas para tus vendedores.',
    steps: [
      {
        element: '[data-tour="zones-map-btn"]',
        popover: {
          title: 'Ver mapa de zonas',
          description:
            'Abre un mapa interactivo con todas tus zonas dibujadas como círculos de colores. Útil para visualizar la cobertura territorial de tu equipo.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-import-export"]',
        popover: {
          title: 'Importar / Exportar',
          description:
            'Exporta tus zonas a CSV o importa desde un archivo para cargas masivas. El CSV incluye nombre, descripción y color.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-add-btn"]',
        popover: {
          title: 'Nueva zona',
          description:
            'Crea una zona geográfica con nombre, color y ubicación en el mapa. Después podrás asignar clientes a cada zona.',
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
          title: 'Nombre de la zona',
          description:
            'Escribe un nombre descriptivo para la zona (ej. "Centro Histórico", "Zona Norte", "Industrial Zapopan").',
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
          title: 'Color de la zona',
          description:
            'Selecciona un color para identificar visualmente la zona en el mapa y en las listas. Elige uno diferente para cada zona.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-drawer-map"]',
        popover: {
          title: 'Ubicación y radio',
          description:
            'Busca un lugar, haz doble clic en el mapa o arrastra el marcador para posicionar la zona. Ajusta el radio arrastrando el borde del círculo o escribiendo el valor en km.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Zona" para guardar o "Cancelar" para descartar los cambios.',
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
          title: 'Buscar zonas',
          description:
            'Escribe el nombre de la zona para encontrarla rápidamente. La búsqueda filtra en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las zonas desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-table"]',
        popover: {
          title: 'Tabla de zonas',
          description:
            'Cada zona muestra su color, nombre, clientes asignados y estado activo/inactivo. Haz clic en una fila para editarla. Selecciona varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/client-categories': {
    id: 'client-categories-tour',
    title: 'Tour de Categorías de Clientes',
    description: 'Aprende a organizar tus clientes por categoría (mayorista, minorista, etc.).',
    steps: [
      {
        element: '[data-tour="client-categories-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus categorías en CSV o importa desde un archivo para cargas masivas. El archivo requiere nombre (obligatorio) y descripción (opcional).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="client-categories-create-btn"]',
        popover: {
          title: 'Nueva categoría',
          description:
            'Crea una nueva categoría de cliente para segmentar tu cartera (mayorista, minorista, VIP, etc.).',
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
          title: 'Nombre de la categoría',
          description:
            'Escribe un nombre descriptivo para la categoría (ej. Mayorista, VIP, Distribuidor). Este campo es obligatorio.',
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
          title: 'Descripción',
          description:
            'Agrega una descripción opcional para identificar mejor la categoría.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="client-categories-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Categoría" para guardar o "Cancelar" para descartar los cambios.',
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
          title: 'Buscar categorías',
          description:
            'Escribe para filtrar las categorías por nombre.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="client-categories-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las categorías desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="client-categories-table"]',
        popover: {
          title: 'Tabla de categorías',
          description:
            'Lista de todas las categorías con nombre, descripción y estado. Puedes editar o activar/desactivar cada una.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/product-categories': {
    id: 'product-categories-tour',
    title: 'Tour de Categorías de Productos',
    description: 'Aprende a clasificar tus productos por categoría para organizarlos mejor.',
    steps: [
      {
        element: '[data-tour="product-categories-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus categorías en CSV o importa desde un archivo para cargas masivas. El archivo requiere nombre (obligatorio) y descripción (opcional).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-categories-create-btn"]',
        popover: {
          title: 'Nueva categoría',
          description:
            'Crea una nueva categoría de producto. Se abrirá un formulario lateral donde capturarás nombre y descripción.',
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
          title: 'Nombre de la categoría',
          description:
            'Captura el nombre de la categoría (ej: Refrescos, Galletas, Lácteos). Es obligatorio y debe ser único. Las categorías subdividen las familias de productos.',
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
          title: 'Descripción',
          description:
            'Agrega una descripción opcional para identificar qué tipo de productos pertenecen a esta categoría.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-categories-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Categoría" para guardarla o "Cancelar" para descartar.',
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
          title: 'Buscar categorías',
          description:
            'Escribe para filtrar las categorías por nombre.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-categories-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las categorías desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-categories-table"]',
        popover: {
          title: 'Tabla de categorías',
          description:
            'Lista de categorías con nombre, descripción, estado y acciones. Puedes seleccionar varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/product-families': {
    id: 'product-families-tour',
    title: 'Tour de Familias de Productos',
    description: 'Aprende a agrupar tus productos por familia (Bebidas, Abarrotes, etc.).',
    steps: [
      {
        element: '[data-tour="product-families-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus familias en CSV o importa desde un archivo para cargas masivas. El archivo requiere nombre (obligatorio) y descripción (opcional).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-families-create-btn"]',
        popover: {
          title: 'Nueva familia',
          description:
            'Crea una nueva familia de productos. Se abrirá un formulario lateral donde capturarás nombre y descripción.',
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
          title: 'Nombre de la familia',
          description:
            'Captura el nombre de la familia (ej: Bebidas, Abarrotes, Lácteos). Es obligatorio y debe ser único. Las familias son la agrupación principal de tu catálogo.',
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
          title: 'Descripción',
          description:
            'Agrega una descripción opcional para ayudar a identificar el tipo de productos que pertenecen a esta familia.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-families-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Familia" para guardarla o "Cancelar" para descartar.',
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
          title: 'Buscar familias',
          description:
            'Escribe para filtrar las familias por nombre.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="product-families-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las familias desactivadas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="product-families-table"]',
        popover: {
          title: 'Tabla de familias',
          description:
            'Lista de familias con nombre, descripción, estado y acciones. Puedes seleccionar varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/units': {
    id: 'units-tour',
    title: 'Tour de Unidades de Medida',
    description: 'Aprende a configurar las unidades de medida para tus productos.',
    steps: [
      {
        element: '[data-tour="units-import-export"]',
        popover: {
          title: 'Importar y exportar',
          description:
            'Descarga tus unidades en CSV o importa desde un archivo para cargas masivas. El archivo requiere nombre (obligatorio) y abreviatura (opcional).',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="units-create-btn"]',
        popover: {
          title: 'Nueva unidad',
          description:
            'Crea una nueva unidad de medida. Se abrirá un formulario lateral donde capturarás nombre y abreviatura.',
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
          title: 'Nombre de la unidad',
          description:
            'Captura el nombre completo de la unidad (ej: Kilogramo, Pieza, Litro). Es obligatorio y debe ser único. Las unidades se asignan a cada producto.',
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
          title: 'Abreviatura',
          description:
            'Abreviatura corta de la unidad (ej: kg, pz, lt, m). Se muestra en tablas y reportes para ahorrar espacio. Máximo 10 caracteres.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="units-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear Unidad" para guardarla o "Cancelar" para descartar.',
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
          title: 'Buscar unidades',
          description:
            'Escribe para filtrar las unidades por nombre o abreviatura.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="units-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las unidades desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="units-table"]',
        popover: {
          title: 'Tabla de unidades',
          description:
            'Lista de unidades con nombre, abreviatura, estado y acciones. Puedes seleccionar varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/metas': {
    id: 'metas-tour',
    title: 'Tour de Metas de Vendedor',
    description: 'Aprende a definir y dar seguimiento a las metas de ventas, pedidos y visitas de tu equipo.',
    steps: [
      {
        element: '[data-tour="metas-add-btn"]',
        popover: {
          title: 'Nueva meta',
          description:
            'Crea una meta para un vendedor: elige si es de ventas ($), pedidos o visitas, define el período (semanal o mensual) y el objetivo numérico.',
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
          title: 'Seleccionar vendedor',
          description:
            'Elige a qué vendedor aplica esta meta. Cada vendedor puede tener metas distintas para cada tipo de indicador.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-tipo"]',
        popover: {
          title: 'Tipo de meta',
          description:
            'Ventas ($) mide el monto total vendido. Pedidos (#) cuenta el número de pedidos cerrados. Visitas (#) mide las visitas completadas al cliente.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-monto"]',
        popover: {
          title: 'Objetivo',
          description:
            'Ingresa el número a alcanzar: monto en pesos para ventas, o cantidad de pedidos/visitas para los otros tipos.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-fechas"]',
        popover: {
          title: 'Período de vigencia',
          description:
            'Define el rango de fechas en que aplica la meta. La automatización "Meta no cumplida" evalúa estos rangos cada viernes para enviar alertas.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-drawer-actions"]',
        popover: {
          title: 'Guardar meta',
          description:
            'Crea la meta. Aparecerá en el tablero del vendedor y en la automatización de alerta semanal.',
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
          title: 'Buscar metas',
          description:
            'Filtra por nombre del vendedor o tipo de meta para encontrar rápidamente lo que buscas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-tipo-filter"]',
        popover: {
          title: 'Filtrar por tipo',
          description:
            'Muestra solo las metas de ventas, de pedidos o de visitas para comparar objetivos del mismo indicador.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="metas-table"]',
        popover: {
          title: 'Lista de metas',
          description:
            'Cada fila muestra el vendedor, tipo, período, objetivo y estado. Usa el toggle para activar/desactivar y los botones de acción para editar o eliminar.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
