import { TourConfig, imageStep, boostDrawerForTour, closeDrawerForTour } from './types';

/** Clients, Products, Zones, Client Categories, Product Categories, Product Families, Units */
export const catalogTours: Record<string, TourConfig> = {
  '/clients': {
    id: 'clients-tour',
    title: 'Tour de Clientes',
    description: 'Aprende a gestionar tu cartera de clientes: agregar, filtrar, editar y organizar.',
    steps: [
      {
        element: '[data-tour="clients-add-btn"]',
        popover: {
          title: 'Agregar nuevo cliente',
          description:
            'Haz clic aquí para registrar un nuevo cliente. Podrás capturar su nombre, dirección, zona, categoría y datos de contacto.',
          side: 'bottom',
          align: 'end',
        },
      },
      imageStep(
        'Formulario de nuevo cliente',
        '/images/tour/clientes-crear.jpg',
        'Formulario de alta de cliente con datos generales, dirección, precios y datos fiscales',
      ),
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
    ],
  },

  '/products': {
    id: 'products-tour',
    title: 'Tour de Productos',
    description: 'Aprende a dar de alta productos, asignar precios, familias y categorías.',
    steps: [
      {
        element: '[data-tour="products-new-btn"]',
        popover: {
          title: 'Crear nuevo producto',
          description:
            'Haz clic aquí para dar de alta un producto. Deberás capturar nombre, código de barras, familia, categoría, unidad de medida y precio base. También puedes subir una imagen.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="products-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de producto',
          description:
            'Captura nombre, código de barras, familia, categoría, unidad de medida, precio base y sube una imagen del producto.',
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
            'Aquí ves todos tus productos con imagen, código, precio, existencia, familia, categoría y unidad. Los productos con stock bajo se marcan en rojo. Puedes seleccionar varios para activar/desactivar en lote.',
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
        element: '[data-tour="zones-add-btn"]',
        popover: {
          title: 'Agregar nueva zona',
          description:
            'Crea una zona geográfica con nombre, descripción y color. Después podrás asignar clientes y vendedores a cada zona.',
          side: 'bottom',
          align: 'end',
        },
      },
      imageStep(
        'Formulario de nueva zona',
        '/images/tour/zonas-crear.jpg',
        'Formulario para crear una zona geográfica con nombre y color',
      ),
      {
        element: '[data-tour="zones-search"]',
        popover: {
          title: 'Buscar zonas',
          description:
            'Escribe el nombre de la zona para encontrarla rápidamente.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="zones-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver las zonas desactivadas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="zones-table"]',
        popover: {
          title: 'Tabla de zonas',
          description:
            'Cada zona muestra su color, nombre, cantidad de clientes asignados y estado activo. Puedes seleccionar varias para activar/desactivar en lote.',
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
        element: '[data-tour="client-categories-create-btn"]',
        popover: {
          title: 'Nueva categoría',
          description:
            'Crea una nueva categoría de cliente con nombre y descripción. Las categorías te permiten segmentar tu cartera.',
          side: 'bottom',
          align: 'end',
        },
      },
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
        element: '[data-tour="client-categories-table"]',
        popover: {
          title: 'Tabla de categorías',
          description:
            'Lista de todas las categorías con nombre, descripción y acciones. Puedes editar o eliminar cada una.',
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
        element: '[data-tour="product-categories-create-btn"]',
        popover: {
          title: 'Nueva categoría',
          description:
            'Crea una nueva categoría de producto (ej: Refrescos, Galletas, Lácteos). Las categorías subdividen las familias de productos.',
          side: 'bottom',
          align: 'end',
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
        element: '[data-tour="product-categories-table"]',
        popover: {
          title: 'Tabla de categorías',
          description:
            'Lista de todas las categorías de producto con nombre, descripción y acciones. Puedes editar o eliminar cada una.',
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
        element: '[data-tour="product-families-create-btn"]',
        popover: {
          title: 'Nueva familia',
          description:
            'Crea una nueva familia de productos con nombre y descripción. Las familias son la agrupación principal de tu catálogo.',
          side: 'bottom',
          align: 'end',
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
            'Lista de familias con nombre, descripción, estado y acciones. Puedes seleccionar varias para activar/desactivar en lote.',
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
        element: '[data-tour="units-create-btn"]',
        popover: {
          title: 'Nueva unidad',
          description:
            'Crea una nueva unidad de medida (ej: Pieza, Caja, Litro, Kilogramo). Las unidades se asignan a cada producto.',
          side: 'bottom',
          align: 'end',
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
        element: '[data-tour="units-table"]',
        popover: {
          title: 'Tabla de unidades',
          description:
            'Lista de unidades de medida con nombre, abreviatura y acciones. Puedes editar o eliminar cada una.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
