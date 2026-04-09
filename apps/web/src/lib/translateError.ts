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
  'Ya existe un descuento para este producto': { es: 'Ya existe un descuento para este producto', en: 'A discount already exists for this product' },
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

  // Limits
  'Has alcanzado el límite de usuarios': { es: 'Has alcanzado el límite de usuarios', en: 'You have reached the user limit' },
  'Has alcanzado el límite de productos': { es: 'Has alcanzado el límite de productos', en: 'You have reached the product limit' },
  'Has alcanzado el límite de clientes': { es: 'Has alcanzado el límite de clientes', en: 'You have reached the client limit' },
  'No quedan timbres disponibles': { es: 'No quedan timbres disponibles', en: 'No stamps available' },
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
  ];

  for (const { pattern, replacement } of dynamicPatterns) {
    if (pattern.test(message) && replacement[lang]) {
      return replacement[lang];
    }
  }

  return message;
}
