/**
 * Maps common backend error messages (Spanish) to translation keys.
 * Used to translate API error responses that come in Spanish.
 */
const ERROR_MAP: Record<string, { es: string; en: string }> = {
  // Duplicate / already exists
  'Ya existe una familia con ese nombre': { es: 'Ya existe una familia con ese nombre', en: 'A family with that name already exists' },
  'Ya existe una categoría con ese nombre': { es: 'Ya existe una categoría con ese nombre', en: 'A category with that name already exists' },
  'Ya existe un producto con ese código': { es: 'Ya existe un producto con ese código', en: 'A product with that code already exists' },
  'Ya existe un producto con ese nombre': { es: 'Ya existe un producto con ese nombre', en: 'A product with that name already exists' },
  'Ya existe una unidad con ese nombre': { es: 'Ya existe una unidad con ese nombre', en: 'A unit with that name already exists' },
  'Ya existe una lista con ese nombre': { es: 'Ya existe una lista con ese nombre', en: 'A list with that name already exists' },
  'Ya existe una zona con ese nombre': { es: 'Ya existe una zona con ese nombre', en: 'A zone with that name already exists' },
  // Removed — handled by dynamic regex pattern below
  'Ya existe una promoción con ese nombre': { es: 'Ya existe una promoción con ese nombre', en: 'A promotion with that name already exists' },
  'Ya existe un cliente con ese correo': { es: 'Ya existe un cliente con ese correo', en: 'A client with that email already exists' },
  'Ya existe un usuario con ese correo': { es: 'Ya existe un usuario con ese correo', en: 'A user with that email already exists' },
  'El correo ya está registrado': { es: 'El correo ya está registrado', en: 'Email is already registered' },

  // Not found
  'Pedido no encontrado': { es: 'Pedido no encontrado', en: 'Order not found' },
  'Cliente no encontrado': { es: 'Cliente no encontrado', en: 'Client not found' },
  'Producto no encontrado': { es: 'Producto no encontrado', en: 'Product not found' },
  'Ruta no encontrada': { es: 'Ruta no encontrada', en: 'Route not found' },
  'Factura no encontrada': { es: 'Factura no encontrada', en: 'Invoice not found' },

  // Validation
  'El monto excede el saldo pendiente': { es: 'El monto excede el saldo pendiente', en: 'Amount exceeds outstanding balance' },
  'El RFC no tiene un formato válido': { es: 'El RFC no tiene un formato válido', en: 'Invalid Tax ID format' },
  'El correo no es válido': { es: 'El correo no es válido', en: 'Invalid email' },
  'La contraseña es incorrecta': { es: 'La contraseña es incorrecta', en: 'Incorrect password' },
  'Credenciales inválidas': { es: 'Credenciales inválidas', en: 'Invalid credentials' },

  // Permission / status
  'No tiene permisos para realizar esta acción': { es: 'No tiene permisos para realizar esta acción', en: 'You do not have permission to perform this action' },
  'Tu suscripción ha expirado': { es: 'Tu suscripción ha expirado', en: 'Your subscription has expired' },
  'Suscripción no activa': { es: 'Suscripción no activa', en: 'Subscription is not active' },

  // Already exists (generic)
  'Ya existe un registro con esos datos': { es: 'Ya existe un registro con esos datos', en: 'A record with this data already exists' },
  'Ya existe un registro con esos datos.': { es: 'Ya existe un registro con esos datos.', en: 'A record with this data already exists.' },
  'Ya existe un registro con ese nombre.': { es: 'Ya existe un registro con ese nombre.', en: 'A record with that name already exists.' },
  'Ya existe una familia con ese nombre.': { es: 'Ya existe una familia con ese nombre.', en: 'A family with that name already exists.' },
  'Ya existe una unidad con ese nombre.': { es: 'Ya existe una unidad con ese nombre.', en: 'A unit with that name already exists.' },
  'Se requiere al menos un ID': { es: 'Se requiere al menos un ID', en: 'At least one ID is required' },

  'Ya existe una promoción con esos datos.': { es: 'Ya existe una promoción con esos datos.', en: 'A promotion with this data already exists.' },
  'Ya existe una unidad de medida con ese nombre.': { es: 'Ya existe una unidad de medida con ese nombre.', en: 'A unit of measure with that name already exists.' },
  'Ya existe una lista de precios con ese nombre.': { es: 'Ya existe una lista de precios con ese nombre.', en: 'A price list with that name already exists.' },
  'Lista de IDs inválida (máx. 1000)': { es: 'Lista de IDs inválida (máx. 1000)', en: 'Invalid ID list (max 1000)' },

  // Promotion specific
  'Ya existe una promoción con ese nombre.': { es: 'Ya existe una promoción con ese nombre.', en: 'A promotion with that name already exists.' },
  'La fecha de fin debe ser posterior a la fecha de inicio.': { es: 'La fecha de fin debe ser posterior a la fecha de inicio.', en: 'End date must be after start date.' },
  'La fecha de fin debe ser posterior a la de inicio': { es: 'La fecha de fin debe ser posterior a la de inicio', en: 'End date must be after start date' },
  'Debe seleccionar al menos un producto.': { es: 'Debe seleccionar al menos un producto.', en: 'You must select at least one product.' },

  // Product/catalog specific
  'El producto no existe': { es: 'El producto no existe', en: 'Product does not exist' },
  'La familia no existe': { es: 'La familia no existe', en: 'Family does not exist' },
  'La categoría no existe': { es: 'La categoría no existe', en: 'Category does not exist' },
  'La unidad no existe': { es: 'La unidad no existe', en: 'Unit does not exist' },
  'La lista de precios no existe': { es: 'La lista de precios no existe', en: 'Price list does not exist' },

  // Category/family/unit duplicates (from services)
  'Ya existe una categoría de productos con ese nombre.': { es: 'Ya existe una categoría de productos con ese nombre.', en: 'A product category with that name already exists.' },
  'Ya existe una familia de productos con ese nombre.': { es: 'Ya existe una familia de productos con ese nombre.', en: 'A product family with that name already exists.' },

  // Route errors
  'La ruta no está en progreso': { es: 'La ruta no está en progreso', en: 'Route is not in progress' },
  'No se puede editar una ruta que ya está en progreso o completada': { es: 'No se puede editar una ruta que ya está en progreso o completada', en: 'Cannot edit a route that is already in progress or completed' },
  'No se puede eliminar una ruta en progreso': { es: 'No se puede eliminar una ruta en progreso', en: 'Cannot delete a route in progress' },
  'No se pueden agregar productos a una ruta en este estado': { es: 'No se pueden agregar productos a una ruta en este estado', en: 'Cannot add products to a route in this state' },
  'No se pueden eliminar paradas de una ruta en progreso': { es: 'No se pueden eliminar paradas de una ruta en progreso', en: 'Cannot remove stops from a route in progress' },
  'No se pueden reordenar paradas de una ruta en progreso': { es: 'No se pueden reordenar paradas de una ruta en progreso', en: 'Cannot reorder stops of a route in progress' },
  'Solo se pueden agregar paradas a rutas planificadas o pendientes de aceptar': { es: 'Solo se pueden agregar paradas a rutas planificadas o pendientes de aceptar', en: 'Stops can only be added to planned or pending routes' },
  'Solo se pueden cerrar rutas completadas/terminadas': { es: 'Solo se pueden cerrar rutas completadas/terminadas', en: 'Only completed routes can be closed' },
  'Solo se pueden enviar a carga rutas planificadas': { es: 'Solo se pueden enviar a carga rutas planificadas', en: 'Only planned routes can be sent for loading' },

  // Auth/user errors
  'El email ya está en uso': { es: 'El email ya está en uso', en: 'Email is already in use' },
  'La contraseña actual es incorrecta': { es: 'La contraseña actual es incorrecta', en: 'Current password is incorrect' },
  'Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.': { es: 'Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.', en: 'This password was found in data breaches. Please choose a different password.' },
  'No puedes desactivar tu propia cuenta': { es: 'No puedes desactivar tu propia cuenta', en: 'You cannot deactivate your own account' },
  'No se permiten correos electrónicos temporales o desechables.': { es: 'No se permiten correos electrónicos temporales o desechables.', en: 'Temporary or disposable email addresses are not allowed.' },

  // Role errors
  'No se puede eliminar el rol porque hay usuarios asignados a él': { es: 'No se puede eliminar el rol porque hay usuarios asignados a él', en: 'Cannot delete role because there are users assigned to it' },

  // Impersonation
  'Ya tienes una sesión de impersonación activa. Finalízala antes de iniciar otra.': { es: 'Ya tienes una sesión de impersonación activa. Finalízala antes de iniciar otra.', en: 'You already have an active impersonation session. End it before starting another.' },
  'La sesión ya fue finalizada.': { es: 'La sesión ya fue finalizada.', en: 'Session has already ended.' },

  // Limits
  'Has alcanzado el límite de usuarios': { es: 'Has alcanzado el límite de usuarios', en: 'You have reached the user limit' },
  'Has alcanzado el límite de productos': { es: 'Has alcanzado el límite de productos', en: 'You have reached the product limit' },
  'Has alcanzado el límite de clientes': { es: 'Has alcanzado el límite de clientes', en: 'You have reached the client limit' },
  'No quedan timbres disponibles': { es: 'No quedan timbres disponibles', en: 'No stamps available' },

  // Generic backend middleware errors
  'Ocurrió un error al procesar tu solicitud.': { es: 'Ocurrió un error al procesar tu solicitud.', en: 'An error occurred while processing your request.' },
  'No se pudo completar la operación.': { es: 'No se pudo completar la operación.', en: 'The operation could not be completed.' },
  'Parámetros de solicitud inválidos.': { es: 'Parámetros de solicitud inválidos.', en: 'Invalid request parameters.' },
  'Acceso no autorizado.': { es: 'Acceso no autorizado.', en: 'Unauthorized access.' },
  'Recurso no encontrado.': { es: 'Recurso no encontrado.', en: 'Resource not found.' },
};

/**
 * Translates a backend error message to the current locale.
 * If no translation found, returns the original message.
 */
export function translateError(message: string): string {
  if (!message) return message;

  let lang = 'es';
  try {
    const settings = JSON.parse(localStorage.getItem('company_settings') || '{}');
    lang = settings.language || 'es';
  } catch { /* ignore */ }

  if (lang === 'es') return message; // Backend already in Spanish

  // Exact match
  const exact = ERROR_MAP[message];
  if (exact) return exact[lang as keyof typeof exact] || message;

  // Partial match — check if message starts with a known pattern
  for (const [key, translations] of Object.entries(ERROR_MAP)) {
    if (message.startsWith(key)) {
      return message.replace(key, translations[lang as keyof typeof translations] || key);
    }
  }

  // Dynamic patterns with regex
  const dynamicPatterns: { pattern: RegExp; replacement: Record<string, string> }[] = [
    {
      pattern: /^Ya existe .+ con ese nombre$/,
      replacement: { en: message.replace('Ya existe', 'Already exists').replace('con ese nombre', 'with that name') },
    },
    {
      pattern: /^El monto \(.+\) excede el saldo pendiente del pedido \(.+\)$/,
      replacement: { en: message.replace('El monto', 'The amount').replace('excede el saldo pendiente del pedido', 'exceeds the outstanding balance of the order') },
    },
    {
      pattern: /^El producto '.+' ya tiene la promoción '.+' activa del .+ al .+ que se traslapa/,
      replacement: { en: message
        .replace(/^El producto '(.+)' ya tiene la promoción '(.+)' activa del (.+) al (.+) que se traslapa con las fechas seleccionadas\.$/,
          "Product '$1' already has promotion '$2' active from $3 to $4 which overlaps with the selected dates.")
      },
    },
    {
      pattern: /^Ya existe un descuento (global|para este producto) con cantidad mínima de \d+/,
      replacement: { en: message
        .replace(/^Ya existe un descuento (global|para este producto) con cantidad mínima de (\d+)\.?$/,
          (_, scope, qty) => `A ${scope === 'global' ? 'global' : 'product'} discount with minimum quantity of ${qty} already exists.`)
      },
    },
    {
      pattern: /^Ya existe un rol con el nombre '.+'$/,
      replacement: { en: message.replace("Ya existe un rol con el nombre", "A role with the name").replace("already exists", "") + " already exists" },
    },
    {
      pattern: /^Stock insuficiente:/,
      replacement: { en: message.replace('Stock insuficiente:', 'Insufficient stock:') },
    },
    {
      pattern: /^Escala de descuentos inconsistente/,
      replacement: { en: message
        .replace('Escala de descuentos inconsistente:', 'Inconsistent discount scale:')
        .replace('la cantidad mínima', 'minimum quantity')
        .replace('tiene un descuento igual o menor', 'has an equal or lower discount')
        .replace('que la cantidad', 'than quantity')
        .replace('Una mayor cantidad debe tener un descuento estrictamente mayor.', 'A higher quantity must have a strictly higher discount.')
      },
    },
  ];

  for (const { pattern, replacement } of dynamicPatterns) {
    if (pattern.test(message) && replacement[lang]) {
      return replacement[lang];
    }
  }

  return message;
}
