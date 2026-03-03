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
  '/clients/new': {
    title: 'Crear Cliente',
    description: 'Formulario para registrar un nuevo cliente en tu cartera.',
    articles: [
      {
        id: 'campos-obligatorios',
        title: 'Campos obligatorios',
        summary: 'Qué datos necesitas para registrar un cliente.',
        body: 'Para crear un cliente necesitas al mínimo: nombre, categoría, zona, dirección con número exterior, teléfono y correo electrónico. Los demás campos son opcionales y puedes completarlos después desde la pantalla de edición.',
      },
      {
        id: 'datos-fiscales',
        title: 'Datos fiscales (SAT)',
        summary: 'Cuándo y cómo activar la facturación.',
        body: 'Si el cliente requiere factura fiscal CFDI 4.0, activa la opción "Facturable". Se habilitarán campos adicionales: RFC (12 o 13 caracteres), razón social, código postal fiscal, régimen fiscal y uso CFDI. Estos datos deben coincidir exactamente con la Constancia de Situación Fiscal del SAT del cliente.',
      },
      {
        id: 'mapa-ubicacion',
        title: 'Dirección y mapa',
        summary: 'Cómo funciona la geolocalización.',
        body: 'Al escribir la dirección, el autocompletado de Google Maps sugerirá opciones y llenará automáticamente ciudad, colonia y código postal. El mapa mostrará la ubicación y verificará que esté dentro de la zona seleccionada. Si la ubicación cae fuera de la zona, se mostrará una advertencia y no podrás guardar hasta corregirlo.',
      },
    ],
  },
  '/client-categories': {
    title: 'Categorías de Clientes',
    description: 'Clasificación de clientes por tipo de negocio o volumen de compra.',
    articles: [
      {
        id: 'que-son-categorias',
        title: '¿Qué son las categorías de clientes?',
        summary: 'Segmenta tu cartera por tipo de negocio.',
        body: 'Las categorías te permiten clasificar a tus clientes según su tipo de negocio o volumen de compra: Mayorista, Minorista, Tienda de conveniencia, VIP, etc. Esto facilita asignar listas de precios diferenciadas, generar reportes por segmento y filtrar clientes rápidamente.',
      },
      {
        id: 'crear-categoria',
        title: '¿Cómo crear una categoría?',
        summary: 'Agrega nuevas categorías para clasificar clientes.',
        body: 'Haz clic en "Nueva categoría", captura un nombre descriptivo y opcionalmente una descripción. Después podrás asignar esta categoría a tus clientes desde el formulario de cada cliente. Las categorías se usan como filtro en la lista de clientes y en reportes.',
      },
      {
        id: 'importar-categorias',
        title: 'Importar y exportar categorías',
        summary: 'Carga masiva o descarga de categorías.',
        body: 'Usa el botón de importar/exportar para descargar tus categorías en formato CSV o para importar categorías desde un archivo. Esto es útil cuando necesitas migrar datos desde otro sistema o hacer cambios masivos.',
      },
    ],
  },
  '/product-categories': {
    title: 'Categorías de Productos',
    description: 'Clasificación de productos para organizar tu catálogo.',
    articles: [
      {
        id: 'que-son-categorias-productos',
        title: '¿Qué son las categorías de productos?',
        summary: 'Agrupa tus productos por tipo.',
        body: 'Las categorías permiten organizar tu catálogo agrupando productos similares: Bebidas, Snacks, Limpieza, Lácteos, etc. Esto facilita la búsqueda de productos, la generación de reportes por categoría y la asignación de promociones o descuentos por grupo.',
      },
      {
        id: 'crear-categoria-producto',
        title: '¿Cómo crear una categoría?',
        summary: 'Agrega nuevas categorías para clasificar productos.',
        body: 'Haz clic en "Nueva categoría", captura un nombre descriptivo y opcionalmente una descripción. Después podrás asignar esta categoría al crear o editar cualquier producto. Las categorías se usan como filtro en la lista de productos y en reportes de ventas.',
      },
      {
        id: 'importar-categorias-productos',
        title: 'Importar y exportar categorías',
        summary: 'Carga masiva o descarga de categorías.',
        body: 'Usa el botón de importar/exportar para descargar tus categorías en formato CSV o importar desde un archivo. El archivo requiere una columna "Nombre" (obligatoria) y opcionalmente "Descripción". Las categorías duplicadas (mismo nombre) serán rechazadas.',
      },
    ],
  },
  '/product-families': {
    title: 'Familias de Productos',
    description: 'Subgrupos dentro de categorías para organización más detallada.',
    articles: [
      {
        id: 'que-son-familias',
        title: '¿Qué son las familias de productos?',
        summary: 'Nivel adicional de organización bajo categorías.',
        body: 'Las familias son un nivel más específico dentro de una categoría. Por ejemplo, dentro de la categoría "Bebidas" puedes tener familias como "Refrescos", "Aguas", "Jugos". Esto permite una organización más precisa del catálogo y reportes más detallados.',
      },
      {
        id: 'crear-familia',
        title: '¿Cómo crear una familia?',
        summary: 'Agrega familias para detallar tu catálogo.',
        body: 'Haz clic en "Nueva familia", captura el nombre y opcionalmente una descripción. Las familias son independientes de las categorías — no necesitas asignarlas a una categoría específica. Se asignan directamente a los productos junto con su categoría.',
      },
      {
        id: 'importar-familias',
        title: 'Importar y exportar familias',
        summary: 'Carga masiva o descarga de familias.',
        body: 'Usa el botón de importar/exportar para descargar tus familias en CSV o importar desde un archivo. El archivo requiere "Nombre" (obligatorio) y opcionalmente "Descripción". Los nombres duplicados serán rechazados automáticamente.',
      },
    ],
  },
  '/units': {
    title: 'Unidades de Medida',
    description: 'Define cómo se contabilizan tus productos.',
    articles: [
      {
        id: 'que-son-unidades',
        title: '¿Qué son las unidades de medida?',
        summary: 'Definen cómo se cuenta cada producto.',
        body: 'Las unidades de medida definen cómo se contabiliza un producto: piezas (PZS) para artículos individuales, kilogramos (KG) para productos a granel, litros (LT) para líquidos, cajas (CJ) para paquetes, etc. La unidad afecta cómo se registran movimientos de inventario y cómo se muestran las cantidades en pedidos.',
      },
      {
        id: 'crear-unidad',
        title: '¿Cómo crear una unidad?',
        summary: 'Agrega nuevas unidades de medida.',
        body: 'Haz clic en "Nueva unidad", captura el nombre completo (ej: "Kilogramo") y una abreviatura corta (ej: "KG", máximo 10 caracteres). La abreviatura se muestra junto a las cantidades en pedidos e inventario para ahorrar espacio.',
      },
      {
        id: 'importar-unidades',
        title: 'Importar y exportar unidades',
        summary: 'Carga masiva o descarga de unidades.',
        body: 'Usa el botón de importar/exportar para descargar tus unidades en CSV o importar desde un archivo. El archivo requiere "Nombre" (obligatorio) y opcionalmente "Abreviatura" (máximo 10 caracteres). Los nombres duplicados serán rechazados.',
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
  '/cobranza': {
    title: 'Cobranza',
    description: 'Registra cobros, consulta saldos pendientes y exporta datos de cobranza.',
    articles: [
      {
        id: 'que-es-cobranza',
        title: '¿Cómo funciona la cobranza?',
        summary: 'Registra pagos de clientes y revisa quién te debe.',
        body: 'La sección de Cobranza te permite llevar control de los pagos de tus clientes. En la pestaña "¿Quién debe?" ves rápidamente qué clientes tienen deuda pendiente. Desde "Historial de cobros" puedes revisar todos los pagos recibidos. Para registrar un cobro, haz clic en "Nuevo cobro", selecciona el cliente y el pedido pendiente.',
      },
      {
        id: 'estado-cuenta',
        title: 'Estado de cuenta por cliente',
        summary: 'Detalle de deudas y pagos por cliente.',
        body: 'Haz clic en el ícono de ojo en cualquier cliente para ver su estado de cuenta completo. Ahí verás cada pedido con su monto total, cuánto ha pagado y cuánto falta. La barra de avance te muestra visualmente el progreso de pago.',
      },
      {
        id: 'exportar-cobros',
        title: 'Exportar cobros',
        summary: 'Descarga tus cobros en CSV.',
        body: 'Usa el botón "Exportar" para descargar un archivo CSV con todos los cobros del período seleccionado. Útil para contabilidad, conciliación bancaria o reportes.',
      },
    ],
  },
  '/orders': {
    title: 'Pedidos',
    description: 'Gestión de pedidos de venta: creación, seguimiento y control.',
    articles: [
      {
        id: 'tipos-venta',
        title: 'Tipos de venta',
        summary: 'Preventa vs Venta Directa.',
        body: 'Existen dos tipos de venta: Preventa — el vendedor levanta el pedido durante su ruta y se entrega después desde el almacén. Venta Directa — el vendedor lleva producto y lo entrega en el momento. El tipo se selecciona al crear el pedido y afecta cómo se gestiona la entrega.',
      },
      {
        id: 'estados-pedido',
        title: 'Estados del pedido',
        summary: 'Ciclo de vida de un pedido.',
        body: 'Un pedido pasa por estos estados: Borrador (aún no se envía), Pendiente (enviado, esperando confirmación), Confirmado (aprobado para surtir), En proceso (preparándose o en ruta), Entregado (completado) y Cancelado. Los administradores pueden cambiar el estado manualmente.',
      },
      {
        id: 'crear-pedido',
        title: '¿Cómo crear un pedido?',
        summary: 'Pasos para registrar un nuevo pedido.',
        body: 'Haz clic en "Nuevo pedido", selecciona el cliente, agrega productos con sus cantidades y el sistema calculará subtotales, IVA y total automáticamente. Puedes agregar notas y definir fecha de entrega estimada. Al guardar, el pedido se crea en estado Borrador.',
      },
      {
        id: 'filtros-pedidos',
        title: 'Filtros y búsqueda',
        summary: 'Encuentra pedidos rápidamente.',
        body: 'Usa la barra de búsqueda para encontrar pedidos por número o nombre del cliente. Los filtros de fecha limitan el período (por defecto últimos 30 días). También puedes filtrar por estado, vendedor y tipo de venta para encontrar exactamente lo que necesitas.',
      },
    ],
  },
  '/automations': {
    title: 'Automatizaciones',
    description: 'Recetas automáticas que el sistema ejecuta por ti para ahorrarte tiempo.',
    articles: [
      {
        id: 'que-son-automatizaciones',
        title: '¿Qué son las automatizaciones?',
        summary: 'Recetas que el sistema ejecuta solo.',
        body: 'Las automatizaciones son acciones pre-configuradas que el sistema ejecuta automáticamente. Por ejemplo: enviarte un resumen de ventas al final del día, alertarte cuando un producto tiene stock bajo, o recordarte cobros vencidos. Solo actívalas y el sistema hace el trabajo por ti.',
      },
      {
        id: 'como-activar',
        title: '¿Cómo activo una automatización?',
        summary: 'Usa el interruptor en cada tarjeta.',
        body: 'Cada tarjeta tiene un interruptor (toggle) a la derecha. Al activarlo, la automatización comienza a funcionar. Puedes desactivarla en cualquier momento. Si la automatización tiene parámetros configurables (como "avisar después de 7 días"), puedes ajustarlos haciendo clic en "Configurar".',
      },
      {
        id: 'categorias',
        title: 'Categorías de automatizaciones',
        summary: 'Cobranza, Ventas, Inventario y Operación.',
        body: 'Las automatizaciones están organizadas por área: Cobranza (recordatorios de pago, avisos de cobros vencidos), Ventas (bienvenida a clientes nuevos, sugerencias de reorden), Inventario (alertas de stock bajo) y Operación (resumen diario, alertas de metas).',
      },
      {
        id: 'historial',
        title: 'Historial de ejecuciones',
        summary: 'Revisa cuándo se ejecutó cada automatización.',
        body: 'Al final de la página encontrarás el historial de ejecuciones. Ahí puedes ver cuándo se ejecutó cada automatización, si fue exitosa o tuvo algún error, y qué acción tomó (por ejemplo: "Resumen enviado: 5 ventas, 3 cobros").',
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

  // Cobranza
  'cobranza-total-vendido': 'Suma del monto total de todos los pedidos en el período, sin importar si ya se cobraron.',
  'cobranza-cobrado': 'Monto efectivamente recibido de clientes en cobros registrados.',
  'cobranza-por-cobrar': 'Lo que tus clientes aún te deben. Es la diferencia entre lo vendido y lo cobrado.',
  'cobranza-clientes-deben': 'Cantidad de clientes que tienen al menos un pedido con saldo pendiente.',
};
