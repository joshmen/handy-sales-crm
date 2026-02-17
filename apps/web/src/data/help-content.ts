export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
}

export interface HelpPage {
  title: string;
  description: string;
  articles: HelpArticle[];
}

export const helpPages: Record<string, HelpPage> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Panel principal con resumen de tu negocio.',
    articles: [
      {
        id: 'dashboard-overview',
        title: '¿Qué es el Dashboard?',
        summary: 'Vista general de tu negocio.',
        body: 'El Dashboard muestra un resumen de la actividad de tu negocio: ventas recientes, productos más vendidos, clientes activos y alertas importantes como productos con stock bajo.',
      },
      {
        id: 'navegacion',
        title: 'Navegación del sistema',
        summary: 'Cómo moverte entre las secciones.',
        body: 'Usa el menú lateral (sidebar) para navegar entre las secciones: Clientes, Productos, Inventario, Pedidos, Rutas, etc. En cada sección encontrarás un botón de ayuda (i) que te mostrará información contextual.',
      },
      {
        id: 'help-system',
        title: '¿Cómo usar la ayuda?',
        summary: 'Accede a la ayuda desde cualquier página.',
        body: 'Haz click en el icono (i) en la barra superior para abrir este panel de ayuda. El contenido cambia automáticamente según la página en la que te encuentres. También verás iconos (i) pequeños junto a campos que requieren explicación adicional.',
      },
    ],
  },
  '/inventory': {
    title: 'Inventario de Almacén',
    description: 'Gestión de existencias y control de stock de productos.',
    articles: [
      {
        id: 'que-es-inventario',
        title: '¿Qué es el inventario de almacén?',
        summary: 'Registro de existencias de productos en tu negocio.',
        body: 'El inventario de almacén registra las existencias de cada producto en tu negocio. Aquí puedes ver cuántas unidades tienes disponibles, establecer límites de stock y recibir alertas cuando un producto esté por agotarse.',
      },
      {
        id: 'stock-minimo-maximo',
        title: 'Stock mínimo y máximo',
        summary: 'Límites de inventario para alertas automáticas.',
        body: 'El stock mínimo es la cantidad mínima que debes tener en almacén. Cuando las existencias caen por debajo de este nivel, el sistema muestra una alerta de "Stock bajo". El stock máximo indica la cantidad ideal máxima para evitar sobreinventario y optimizar el espacio de almacenamiento.',
      },
      {
        id: 'estados-stock',
        title: 'Estados de stock',
        summary: 'Indicadores visuales del nivel de inventario.',
        body: 'Cada producto muestra un indicador de estado: "Disponible" (verde) cuando hay suficiente stock, "Stock bajo" (amarillo) cuando las existencias están por debajo del mínimo configurado, y "Sin stock" (rojo) cuando no hay unidades disponibles.',
      },
      {
        id: 'existencias-totales',
        title: 'Existencias totales, almacén y ruta',
        summary: 'Diferencia entre los tipos de existencias.',
        body: 'Las existencias totales son la suma de unidades en almacén más las asignadas a rutas de venta. Las existencias en almacén son las unidades físicamente en tu bodega. Las existencias en ruta son las unidades que los vendedores llevan consigo para venta directa.',
      },
    ],
  },
  '/inventory/movements': {
    title: 'Movimientos de Inventario',
    description: 'Registro de entradas, salidas y ajustes de mercancía.',
    articles: [
      {
        id: 'tipos-movimiento',
        title: 'Tipos de movimiento',
        summary: 'Entrada, salida y ajuste de inventario.',
        body: 'Existen tres tipos de movimiento: Entrada (ingreso de mercancía al almacén, por ejemplo al recibir una compra a proveedor), Salida (despacho de mercancía del almacén, por ejemplo al surtir un pedido o transferir a ruta) y Ajuste (corrección de cantidades por diferencias físicas, mermas, roturas o errores de conteo).',
      },
      {
        id: 'cuando-usar',
        title: '¿Cuándo usar cada tipo?',
        summary: 'Guía para elegir el tipo correcto.',
        body: 'Usa Entrada cuando recibas mercancía nueva de un proveedor o cuando un vendedor devuelva producto no vendido. Usa Salida cuando despachas producto a un cliente o cargas la ruta de un vendedor. Usa Ajuste cuando hagas un conteo físico y las cantidades no coincidan con el sistema.',
      },
      {
        id: 'referencia-movimiento',
        title: 'Referencia del movimiento',
        summary: 'Identificador para rastrear el movimiento.',
        body: 'La referencia es un texto libre que te ayuda a identificar el motivo del movimiento. Por ejemplo: "Compra proveedor #123", "Carga ruta vendedor Juan", "Ajuste por inventario físico marzo". Es opcional pero recomendado para mantener un buen control.',
      },
    ],
  },
  '/promotions': {
    title: 'Promociones',
    description: 'Gestión de descuentos y ofertas especiales.',
    articles: [
      {
        id: 'como-funcionan',
        title: '¿Cómo funcionan las promociones?',
        summary: 'Descuentos aplicados automáticamente a productos.',
        body: 'Las promociones permiten aplicar descuentos a uno o más productos durante un período de tiempo definido. Se aplican automáticamente al crear pedidos si el producto está dentro del período de la promoción y esta se encuentra activa.',
      },
      {
        id: 'tipos-descuento',
        title: 'Tipos de descuento',
        summary: 'Porcentaje vs monto fijo.',
        body: 'Porcentaje: descuento proporcional al precio del producto (ej: 10% de descuento sobre $100 = $90 final). Monto fijo: rebaja directa en pesos (ej: $15 de descuento sobre $100 = $85 final). Elige porcentaje para descuentos relativos y monto fijo para rebajas absolutas.',
      },
      {
        id: 'traslape-fechas',
        title: 'Traslape de fechas',
        summary: 'No puede haber dos promociones activas para el mismo producto.',
        body: 'El sistema no permite que un mismo producto tenga dos promociones activas con fechas que se solapen. Por ejemplo, si el producto "Refresco Cola" tiene una promoción del 1 al 15 de marzo, no puedes crear otra promoción para ese mismo producto que incluya cualquier fecha dentro de ese rango.',
      },
    ],
  },
  '/products': {
    title: 'Productos',
    description: 'Catálogo de productos de tu negocio.',
    articles: [
      {
        id: 'unidad-medida',
        title: 'Unidades de medida',
        summary: 'Cómo se contabilizan los productos.',
        body: 'La unidad de medida define cómo se cuenta el producto: piezas (PZS) para artículos individuales, kilogramos (KG) para productos a granel por peso, litros (LT) para líquidos, cajas (CJ) para paquetes, etc. La unidad afecta cómo se registran los movimientos de inventario.',
      },
      {
        id: 'codigo-barras',
        title: 'Código de barras',
        summary: 'Identificador único del producto.',
        body: 'El código de barras es un identificador único que permite localizar rápidamente el producto. Puede ser el código EAN/UPC impreso en el empaque del producto o un código interno de tu negocio. Se usa para búsquedas rápidas y registro de ventas.',
      },
      {
        id: 'categorias-familias',
        title: 'Categorías y familias',
        summary: 'Organización jerárquica de productos.',
        body: 'Las categorías agrupan productos similares (ej: "Bebidas", "Snacks", "Limpieza"). Las familias son un nivel más específico dentro de una categoría (ej: dentro de "Bebidas" puedes tener "Refrescos", "Aguas", "Jugos"). Esto facilita la búsqueda y los reportes.',
      },
    ],
  },
  '/clients': {
    title: 'Clientes',
    description: 'Gestión de tu cartera de clientes.',
    articles: [
      {
        id: 'categorias-clientes',
        title: 'Categorías de clientes',
        summary: 'Clasificación de clientes por tipo.',
        body: 'Las categorías permiten clasificar a tus clientes según su tipo de negocio o volumen de compra: Mayorista, Minorista, Tienda de conveniencia, etc. Esto te ayuda a asignar listas de precios diferenciadas y generar reportes por segmento.',
      },
      {
        id: 'zonas',
        title: 'Zonas geográficas',
        summary: 'Organización territorial de clientes.',
        body: 'Las zonas agrupan clientes por ubicación geográfica. Esto facilita la planificación de rutas de venta, asignación de vendedores y análisis de cobertura territorial.',
      },
    ],
  },
  '/price-lists': {
    title: 'Listas de Precios',
    description: 'Precios diferenciados por tipo de cliente.',
    articles: [
      {
        id: 'que-son-listas',
        title: '¿Qué son las listas de precios?',
        summary: 'Precios personalizados por segmento.',
        body: 'Las listas de precios permiten definir precios distintos para un mismo producto según el tipo de cliente. Por ejemplo, puedes tener una lista "Mayorista" con precios más bajos y una lista "Menudeo" con precios regulares. Cada cliente se asigna a una lista de precios.',
      },
    ],
  },
  '/discounts': {
    title: 'Descuentos por Cantidad',
    description: 'Descuentos automáticos según volumen de compra.',
    articles: [
      {
        id: 'como-funcionan-descuentos',
        title: '¿Cómo funcionan?',
        summary: 'Descuentos que se activan al comprar cierta cantidad.',
        body: 'Los descuentos por cantidad se aplican automáticamente cuando el cliente compra una cantidad mínima de un producto. Por ejemplo: "Comprando 10 o más unidades de Refresco Cola, obtén 5% de descuento". Se configuran por producto y se pueden combinar con listas de precios.',
      },
    ],
  },
};

export const tooltips: Record<string, string> = {
  // Inventory
  'min-stock': 'Cantidad mínima recomendada en almacén. Al caer por debajo, se muestra alerta de "Stock bajo".',
  'max-stock': 'Cantidad máxima recomendada para evitar sobreinventario.',
  'total-quantity': 'Total de unidades del producto sumando existencias en almacén más existencias en ruta.',
  'warehouse-quantity': 'Unidades físicamente disponibles en la bodega o almacén.',
  'route-quantity': 'Unidades asignadas a vendedores para venta en ruta.',

  // Movements
  'movement-type': 'Entrada: ingreso de mercancía. Salida: despacho de producto. Ajuste: corrección por conteo físico o merma.',
  'movement-reference': 'Texto libre para identificar el motivo del movimiento (ej: "Compra proveedor #123").',
  'movement-quantity': 'Cantidad de unidades que entran, salen o se ajustan.',

  // Promotions
  'discount-type': 'Porcentaje: descuento proporcional al precio. Monto fijo: rebaja directa en pesos.',
  'promo-dates': 'Período en que la promoción estará activa. No puede solaparse con otra promoción del mismo producto.',
  'promo-products': 'Productos a los que se aplicará esta promoción. Un producto no puede tener dos promociones activas con fechas solapadas.',

  // Products
  'unit-of-measure': 'Define cómo se contabiliza el producto: piezas, kilogramos, litros, cajas, etc.',
  'barcode': 'Código EAN/UPC del empaque o código interno. Usado para búsquedas rápidas.',
  'product-category': 'Grupo general del producto (ej: Bebidas, Snacks). Facilita búsqueda y reportes.',
  'product-family': 'Subgrupo dentro de la categoría (ej: Refrescos dentro de Bebidas).',
};
