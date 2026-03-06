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
        body: 'Las promociones permiten aplicar un porcentaje de descuento a uno o más productos durante un período de vigencia definido. Se aplican automáticamente al crear pedidos si el producto está dentro del período de la promoción y esta se encuentra activa. Cada promoción tiene nombre único, productos asociados, porcentaje (1-100%) y fechas de inicio y fin.',
      },
      {
        id: 'traslape-fechas',
        title: 'Traslape de fechas',
        summary: 'No puede haber dos promociones activas para el mismo producto.',
        body: 'El sistema no permite que un mismo producto tenga dos promociones activas con fechas que se solapen. Por ejemplo, si el producto "Refresco Cola" tiene una promoción del 1 al 15 de marzo, no puedes crear otra promoción para ese mismo producto que incluya cualquier fecha dentro de ese rango.',
      },
      {
        id: 'importar-exportar-promociones',
        title: 'Importar y exportar promociones',
        summary: 'Carga masiva y descarga de promociones en CSV.',
        body: 'Exportar: Descarga un CSV con todas las promociones (Nombre, Descripcion, DescuentoPorcentaje, FechaInicio, FechaFin, Productos, Activo). Importar: Descarga la plantilla primero. Columnas requeridas: Nombre* (único), DescuentoPorcentaje* (0.01-100), FechaInicio* (yyyy-MM-dd), FechaFin* (posterior a inicio), Productos* (nombres separados por punto y coma, deben existir en catálogo). Descripcion es opcional. No se permiten nombres duplicados. Las filas con errores se omiten y las válidas se importan.',
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
      {
        id: 'importar-productos',
        title: 'Importar y exportar productos',
        summary: 'Carga masiva o descarga de tu catálogo.',
        body: 'Usa el botón de importar/exportar para descargar tu catálogo en CSV o importar productos desde un archivo. El archivo requiere Nombre y Precio (obligatorios). Opcionalmente puedes incluir Código de barras, Categoría, Familia, Unidad de medida, Descripción e IVA. Los productos con nombre duplicado serán rechazados.',
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
  '/zones': {
    title: 'Zonas',
    description: 'Organiza tu territorio en zonas geográficas para asignar clientes y vendedores.',
    articles: [
      {
        id: 'que-son-zonas',
        title: '¿Qué son las zonas?',
        summary: 'Divisiones geográficas de tu territorio de ventas.',
        body: 'Las zonas permiten dividir tu territorio de ventas en áreas geográficas (ej. "Centro", "Zona Norte", "Industrial"). Cada zona tiene un nombre, color, descripción y opcionalmente una ubicación en el mapa con un radio de cobertura en kilómetros.',
      },
      {
        id: 'mapa-zonas',
        title: 'Mapa y ubicación',
        summary: 'Cómo posicionar una zona en el mapa.',
        body: 'Al crear o editar una zona puedes buscar un lugar con Google Maps, hacer doble clic en el mapa o arrastrar el marcador para definir el centro. Ajusta el radio arrastrando el borde del círculo o escribiendo el valor en km. El mapa general muestra todas las zonas como círculos de colores superpuestos.',
      },
      {
        id: 'asignar-clientes',
        title: 'Asignar clientes a zonas',
        summary: 'Cómo vincular clientes con una zona.',
        body: 'Al crear o editar un cliente puedes seleccionar la zona a la que pertenece. El contador "Clientes" en la tabla de zonas muestra cuántos clientes tiene cada una. Si intentas eliminar una zona con clientes asignados, el sistema te lo impedirá hasta que reasignes los clientes.',
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
      {
        id: 'crear-lista',
        title: '¿Cómo crear una lista de precios?',
        summary: 'Agrega listas para segmentar precios.',
        body: 'Haz clic en "Nueva lista", captura un nombre descriptivo (ej. Mayoreo, Minorista) y opcionalmente una descripción. Una vez creada, podrás asignar precios específicos por producto dentro de cada lista desde la sección de precios por producto.',
      },
      {
        id: 'importar-listas',
        title: 'Importar y exportar listas',
        summary: 'Carga masiva o descarga de listas.',
        body: 'Usa el botón de importar/exportar para descargar tus listas en CSV o importar desde un archivo. El archivo requiere "Nombre" (obligatorio) y opcionalmente "Descripción". Los nombres duplicados serán rechazados. La importación solo crea listas nuevas, no actualiza existentes.',
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
        body: 'Los descuentos por cantidad se aplican automáticamente cuando el cliente compra una cantidad mínima de un producto. Hay dos tipos: "Global" aplica a todo el catálogo, y "Por producto" aplica solo a un producto específico. Por ejemplo: "Comprando 10+ unidades, obtén 5% de descuento". Se pueden combinar con listas de precios y la escala debe ser progresiva (mayor cantidad = mayor descuento).',
      },
      {
        id: 'como-crear-descuento',
        title: '¿Cómo crear un descuento?',
        summary: 'Pasos para crear un descuento global o por producto.',
        body: 'Haz clic en "Nuevo descuento" y elige el tipo: Global (aplica a todos los productos) o Por producto (aplica a un producto específico). Luego define el porcentaje de descuento (1-100%) y la cantidad mínima de unidades para que aplique. Para descuentos por producto, selecciona el producto del catálogo. La escala de descuentos debe ser progresiva: a mayor cantidad, mayor porcentaje. Usa las pestañas para ver y administrar cada tipo por separado.',
      },
      {
        id: 'importar-exportar-descuentos',
        title: 'Importar y exportar descuentos',
        summary: 'Carga masiva y descarga de descuentos en CSV.',
        body: 'Exportar: Descarga un CSV con todos los descuentos (TipoAplicacion, Producto, CantidadMinima, DescuentoPorcentaje, Activo). Importar: Descarga la plantilla primero. Columnas requeridas: TipoAplicacion* (Global o Producto), CantidadMinima* (mayor a 0), DescuentoPorcentaje* (entre 0.01 y 100). Para tipo Producto, la columna Producto* es obligatoria (nombre exacto del catálogo). Para tipo Global, la columna Producto debe estar vacía. No se permiten duplicados (mismo tipo + producto + cantidad mínima). La escala debe ser progresiva.',
      },
    ],
  },
  '/routes': {
    title: 'Rutas de Venta',
    description: 'Planificación y seguimiento de rutas de visita para vendedores.',
    articles: [
      {
        id: 'que-son-rutas',
        title: '¿Qué son las rutas?',
        summary: 'Asigna rutas de visita a tus vendedores.',
        body: 'Las rutas permiten planificar la jornada de tus vendedores: a qué zona ir, qué clientes visitar y en qué fecha. Cada ruta tiene un estado (Planificada, En progreso, Completada, Cerrada, etc.) y muestra el progreso de paradas completadas vs totales.',
      },
      {
        id: 'crear-ruta',
        title: '¿Cómo crear una ruta?',
        summary: 'Pasos para asignar una ruta a un vendedor.',
        body: 'Haz clic en "Nueva ruta", selecciona el vendedor, opcionalmente una zona, la fecha programada y el horario estimado de inicio y fin. Puedes agregar descripción y notas. Una vez creada, la ruta aparece como "Planificada" y el vendedor la verá en su app móvil.',
      },
      {
        id: 'exportar-rutas',
        title: 'Exportar rutas',
        summary: 'Descarga tus rutas en archivo CSV.',
        body: 'Usa el botón "Exportar" para descargar un CSV con todas las rutas: Nombre, Fecha, Vendedor, Zona, Estado, TotalParadas, ParadasCompletadas, HoraInicioEstimada, HoraFinEstimada, Descripcion, Notas y Activo. Útil para reportes de productividad y análisis de cobertura.',
      },
    ],
  },
  '/routes/manage': {
    title: 'Administrar Rutas',
    description: 'Gestión operativa de rutas: carga de inventario, seguimiento y cierre.',
    articles: [
      {
        id: 'que-es-admin-rutas',
        title: '¿Qué es Administrar Rutas?',
        summary: 'Panel de operación diaria para gestionar rutas activas.',
        body: 'Administrar Rutas es el centro de operaciones donde gestionas las rutas del día: cargas inventario antes de que el vendedor salga, das seguimiento mientras está en campo y cierras la ruta al final del día reconciliando inventario y efectivo.',
      },
      {
        id: 'flujo-ruta',
        title: 'Flujo de una ruta operativa',
        summary: 'Desde la carga hasta el cierre.',
        body: 'Una ruta pasa por estas etapas: 1) Planificada — se creó pero no tiene carga. 2) Pendiente de aceptar — se envió la carga al vendedor. 3) Carga aceptada — el vendedor aceptó la carga en su app. 4) En progreso — el vendedor está realizando entregas y ventas. 5) Terminada — el vendedor finalizó su jornada. 6) Cerrada — el administrador reconcilió inventario y efectivo.',
      },
      {
        id: 'exportar-admin-rutas',
        title: 'Exportar rutas',
        summary: 'Descarga datos operativos en CSV.',
        body: 'Usa el botón "Exportar" para descargar un CSV con todas las rutas filtradas. Incluye: Nombre, Fecha, Vendedor, Zona, Estado, Total de paradas, Paradas completadas, Horarios estimados, Descripción, Notas y estado Activo.',
      },
    ],
  },
  '/routes/manage/[id]/load': {
    title: 'Cargar Inventario de Ruta',
    description: 'Asigna productos y pedidos al vendedor antes de salir a campo.',
    articles: [
      {
        id: 'como-cargar-ruta',
        title: '¿Cómo cargar inventario a una ruta?',
        summary: 'Pasos para preparar la carga del vendedor.',
        body: 'Para cargar una ruta: 1) Define el efectivo inicial (viáticos/cambio) y comentarios. 2) Asigna pedidos confirmados que el vendedor debe entregar. 3) Agrega productos adicionales para venta directa (sin pedido previo). 4) Verifica la tabla consolidada que muestra el total de la carga. 5) Haz clic en "Enviar a carga" para que el vendedor reciba la notificación en su app.',
      },
      {
        id: 'tipos-carga',
        title: 'Pedidos vs venta directa',
        summary: 'Diferencia entre los dos tipos de carga.',
        body: 'La carga tiene dos componentes: Pedidos para entrega — pedidos previamente confirmados que el vendedor debe entregar a clientes específicos. Productos para venta directa — inventario adicional que el vendedor lleva para vender sin pedido previo (autoventa). La tabla consolidada suma ambos tipos y muestra la disponibilidad en almacén.',
      },
      {
        id: 'disponibilidad-stock',
        title: 'Disponibilidad de stock',
        summary: 'Verificar que hay suficiente inventario.',
        body: 'La columna "Disponible" en la tabla consolidada muestra cuántas unidades hay en almacén. Si aparece en rojo, no hay suficiente stock para cubrir la cantidad total asignada. En ese caso, ajusta las cantidades o registra una entrada de inventario antes de enviar la carga.',
      },
    ],
  },
  '/routes/manage/[id]/close': {
    title: 'Cierre de Ruta',
    description: 'Reconcilia inventario, verifica efectivo y cierra la ruta al final del día.',
    articles: [
      {
        id: 'como-cerrar-ruta',
        title: '¿Cómo cerrar una ruta?',
        summary: 'Pasos para la reconciliación de fin de día.',
        body: 'Para cerrar una ruta: 1) Revisa el resumen financiero (ventas, cobros, devoluciones). 2) Verifica el balance: compara el monto "a recibir" con lo "recibido" realmente. 3) Reconcilia el inventario de retorno: para cada producto, indica cuántas unidades se perdieron (mermas), cuántas regresan al almacén y cuántas se quedan en el vehículo. 4) Cuando la diferencia sea 0 en todos los productos, haz clic en "Cerrar ruta".',
      },
      {
        id: 'inventario-retorno',
        title: 'Inventario de retorno',
        summary: 'Reconcilia lo que sale vs lo que regresa.',
        body: 'La tabla de retorno muestra por cada producto: cantidad inicial (lo que se cargó), vendidos, entregados, devueltos por clientes, mermas (pérdidas), recepción a almacén y carga en vehículo. La columna "Dif." debe ser 0 — usa los botones +/- para ajustar mermas, almacén o carga. Los botones rápidos "Almacén" y "Carga" asignan toda la diferencia restante automáticamente.',
      },
      {
        id: 'diferencia-financiera',
        title: 'Diferencia financiera',
        summary: 'Sobrante o faltante de efectivo.',
        body: 'El balance muestra la diferencia entre lo que el vendedor debería entregar ("A recibir") y lo que realmente entregó ("Recibido"). Una diferencia positiva (verde) indica sobrante de efectivo. Una diferencia negativa (rojo) indica faltante. Ambos casos deben investigarse antes de cerrar la ruta.',
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
        body: 'Cada tarjeta tiene un interruptor (toggle) a la derecha. Al activarlo, la automatización comienza a funcionar. Puedes desactivarla en cualquier momento. Haz clic en el ícono de engranaje para ajustar parámetros como umbrales, frecuencias y a quién se notifica.',
      },
      {
        id: 'destinatario-y-canales',
        title: '¿A quién notifica y cómo?',
        summary: 'Configura destinatarios. El canal es automático.',
        body: 'En la configuración de cada automatización puedes elegir a quién notificar: solo al administrador, solo a los vendedores, o a ambos. El canal de entrega se asigna automáticamente: alertas operativas (stock bajo, cobros vencidos) se envían por push al celular/web, mientras que reportes como el resumen diario se envían por email. No necesitas configurar el canal — el sistema elige el más adecuado.',
      },
      {
        id: 'categorias',
        title: 'Categorías de automatizaciones',
        summary: 'Cobranza, Ventas, Inventario y Operación.',
        body: 'Las automatizaciones están organizadas por área: Cobranza (recordatorios de pago, avisos de cobros vencidos), Ventas (bienvenida a clientes nuevos, sugerencias de reorden), Inventario (alertas de stock bajo y producto en cero) y Operación (resumen diario por email, alertas de metas).',
      },
      {
        id: 'historial',
        title: 'Historial de ejecuciones',
        summary: 'Revisa cuándo se ejecutó cada automatización.',
        body: 'Al final de la página encontrarás el historial de ejecuciones. Ahí puedes ver cuándo se ejecutó cada automatización, si fue exitosa o tuvo algún error, y qué acción tomó (por ejemplo: "Resumen enviado: 5 ventas, 3 cobros").',
      },
    ],
  },

  '/visits': {
    title: 'Visitas',
    description: 'Planificación, seguimiento y registro de visitas a clientes.',
    articles: [
      {
        id: 'visits-overview',
        title: '¿Qué son las visitas?',
        summary: 'Registro de cada interacción presencial con un cliente.',
        body: 'Las visitas representan cada vez que un vendedor acude a un cliente. Puedes programarlas con anticipación, iniciarlas con check-in (registra hora y ubicación de llegada) y finalizarlas con check-out (registra resultado: con venta, sin venta, no encontrado o reprogramada).',
      },
      {
        id: 'visits-checkin-checkout',
        title: 'Check-In y Check-Out',
        summary: 'Cómo registrar el inicio y fin de una visita.',
        body: 'Al iniciar una visita (check-in), el sistema captura tu ubicación GPS y la hora exacta. Al finalizar (check-out), seleccionas el resultado de la visita. Si hubo venta, se puede asociar un pedido. La duración se calcula automáticamente.',
      },
      {
        id: 'visits-calendar',
        title: 'Vista de calendario',
        summary: 'Visualiza las visitas en formato calendario.',
        body: 'Usa el toggle Lista/Calendario para cambiar la vista. En el calendario puedes ver las visitas del mes, navegar entre meses, y hacer clic en un día vacío para programar una nueva visita directamente en esa fecha.',
      },
      {
        id: 'visits-filters',
        title: 'Filtros y búsqueda',
        summary: 'Filtra visitas por tipo, resultado o fecha.',
        body: 'Puedes filtrar por tipo de visita (Rutina, Cobranza, Entrega, etc.), por resultado (Pendiente, Con Venta, Sin Venta, etc.) y por rango de fechas (Hoy, Esta semana, Este mes, etc.). Usa la barra de búsqueda para encontrar visitas por nombre de cliente.',
      },
    ],
  },
  '/reports': {
    title: 'Reportes',
    description: 'Análisis de ventas, clientes e inventario con gráficas y tablas descargables.',
    articles: [
      {
        id: 'reports-overview',
        title: '¿Qué reportes hay disponibles?',
        summary: 'Siete reportes organizados en tres categorías.',
        body: 'Los reportes se dividen en Ventas (por período, vendedor, producto y zona), Clientes (actividad y nuevos registros) e Inventario (estado actual de stock). Cada uno incluye tarjetas de KPI, gráficas interactivas y tabla de datos con ordenamiento.',
      },
      {
        id: 'reports-filters',
        title: 'Filtros de fecha',
        summary: 'Selecciona el rango de fechas para analizar.',
        body: 'Todos los reportes de ventas y clientes requieren un rango de fechas (Desde / Hasta). Por defecto se muestra el último mes. Usa el botón "Consultar" para aplicar los filtros. El reporte de inventario muestra datos en tiempo real sin filtro de fecha.',
      },
      {
        id: 'reports-charts',
        title: 'Gráficas interactivas',
        summary: 'Líneas, barras y pastel para visualizar tendencias.',
        body: 'Ventas por período muestra tendencias en línea o barras según la agrupación (día, semana, mes). Ventas por zona usa gráfica de pastel para distribución porcentual. Inventario muestra una dona con el estado del stock. Pasa el cursor sobre las gráficas para ver valores exactos.',
      },
      {
        id: 'reports-tables',
        title: 'Tablas de datos',
        summary: 'Ordena por cualquier columna para encontrar lo que buscas.',
        body: 'Cada reporte incluye una tabla detallada. Haz clic en el encabezado de cualquier columna para ordenar ascendente o descendente. Algunas tablas muestran una fila de totales al final. La tabla de actividad de clientes tiene paginación para manejar grandes volúmenes.',
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
