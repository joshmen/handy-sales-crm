# Mobile Testing Checklist — Apr 26, 2026

Esta APK apunta a **STAGING** (`mobile-api-staging.up.railway.app`) para que pruebes sin riesgo a datos de producción. Main API sigue siendo prod (no hay servicio main staging deployed).

**Build URL**: https://expo.dev/accounts/xjoshmenx/projects/handy-suites/builds/73573f2d-dad2-4a3f-aedb-f0129f36307d

---

## A. Hardware específico (NO se puede en emulador)

### A1. Impresora Bluetooth (printerService.ts)
Requiere impresora térmica BT real (POS 80mm).

- [ ] **Recibo de cobro 80mm**: registrar un cobro → tap "Imprimir recibo" → conectar impresora BT → verificar que sale ticket con folio, monto, método pago, fecha
- [ ] **CFDI 80mm**: emitir factura desde mobile (commit `8ce62ed`) → imprimir CFDI con código QR + sello SAT + UUID. Verificar formato 80mm legible
- [ ] **Reconectar impresora tras desconexión**: bluetooth off → on, reintentar imprimir
- [ ] **Validación ancho impresora antes de imprimir CFDI** (commit `74a1ed5`): si la impresora no soporta 80mm, debe avisar antes de mandar el job

### A2. Cámara real
Emulador puede simular cámara pero la captura es básica.

- [ ] **Foto de evidencia en visita**: PhotoEvidence component → capturar foto durante visita → ver thumbnail → marcar visita "Con Venta" → checkout
- [ ] **Foto de recibo en cobro**: capturar foto del recibo físico al registrar cobro → attachment con `tipo='receipt'`
- [ ] **Firma digital del cliente** (SignatureCapture): firmar con el dedo en pantalla → guardar como attachment
- [ ] **Permiso de cámara denegado**: ir a Settings → revocar permiso → intentar tomar foto → ver UX (debería mostrar mensaje, no crash)
- [ ] **Storage lleno**: simular memoria llena → captura debe fallar gracefully

### A3. Push notifications remotas (FCM end-to-end)
Requiere device físico + Expo push token registrado.

- [ ] **Push "Nueva ruta asignada"**: admin desde web crea ruta para tu vendedor → llega push con sound + vibración → tap → app abre en `/ruta/index` con la ruta nueva
- [ ] **Push "Aceptar ruta"** (commit `d1fc3a7`): admin envía push de aceptación → vendedor tap "Aceptar" → estado cambia a "EnProgreso" → backend recibe `aceptada_en` + `hora_inicio_real`
- [ ] **Deep-link cuando app está cerrada**: cerrar app completa → llega push → tap → app cold-boot al deep-link correcto
- [ ] **Deep-link cuando app está en background**: app minimizada → push → tap → app trae al frente con navegación correcta
- [ ] **Push "Pedido confirmado"** (post backend confirmation)
- [ ] **Push "Cobro registrado"** (notificación al admin)
- [ ] **Notification badge count**: si llegan múltiples sin abrir, ver badge en app icon

### A4. GPS real con coordenadas reales
Emulador permite mock GPS pero no contexto real.

- [ ] **Geofence check-in al cliente**: caminar/manejar al cliente → tap "Check-in" → verifica `distancia_check_in` < 100m → permite empezar visita
- [ ] **Geofence con distancia >100m**: estar lejos del cliente → tap check-in → debe rechazar o avisar fuera de rango
- [ ] **GPS sin señal (interior edificio)**: validar timeout y fallback a manual
- [ ] **Background tracking**: iniciar ruta → cerrar app → verificar que sigue capturando location (si está implementado)
- [ ] **Permiso "Mientras usa la app" vs "Todo el tiempo"**: probar ambos modos
- [ ] **GPS denegado en crear cliente** (cambio de hoy `5936ab6`): en `clients/crear` denegar permiso → ver Toast info "Podrás seleccionar manualmente en el mapa"

---

## B. Flujos completos end-to-end del vendedor (necesitan device + datos reales)

### B1. Día típico vendedor (golden path)
- [ ] Login con `vendedor1@jeyma.com` / `test123`
- [ ] Ver "Ruta de hoy" en home
- [ ] Tap primera parada → ver detalle cliente
- [ ] Check-in con GPS
- [ ] Crear pedido (3 productos diferentes con cantidades)
- [ ] Aplicar descuento por cantidad → verificar que se calcula correcto
- [ ] Confirmar pedido → estado=Confirmado
- [ ] Si es venta directa: cobro inmediato → método pago efectivo → imprimir recibo
- [ ] Checkout parada → siguiente cliente
- [ ] Al final del día: ver resumen "Cierre de ruta"

### B2. Sync offline → online (probar SIN red)
- [ ] Activar **modo avión**
- [ ] Crear 1 cliente nuevo offline → debe persistir local
- [ ] Crear 1 pedido offline → toast "Guardado offline, se sincronizará"
- [ ] Registrar 1 cobro offline
- [ ] Hacer check-in/check-out de visita offline
- [ ] **Desactivar modo avión**
- [ ] Esperar sync automático (o pull-to-refresh)
- [ ] Verificar en web que cliente, pedido, cobro y visita aparecen
- [ ] Verificar que **no hay duplicados** (server_id mapping correcto)

### B3. Edge cases ruta
- [ ] **Re-arribo a parada ya completada**: regresar al cliente → no debería permitir crear segundo pedido sin reabrir
- [ ] **Saltar parada (omitir)**: marcar "No encontrado" → estado=Omitida → siguiente
- [ ] **Cancelar visita en progreso**: empezar check-in → cancelar → debe quedar en estado "Pendiente" o cancelada
- [ ] **Cerrar ruta antes de tiempo**: ¿permite guardar ruta a medias?

### B4. Validación Zod nueva (cambio de hoy `a1588a4`)
- [ ] **Crear cliente con RFC inválido**: `"XX"` → error inline "RFC inválido"
- [ ] **Crear cliente facturable sin razón social**: marcar facturable=true → dejar razón social vacía → submit → error "Razón social requerida para clientes facturables"
- [ ] **CP fiscal con menos de 5 dígitos**: error "CP fiscal debe tener 5 dígitos"
- [ ] **Email inválido**: `"abc"` → error "Correo inválido"
- [ ] **Descuento >100**: error "Descuento debe ser entre 0 y 100"

### B5. ErrorBoundary (cambio de hoy `7f1111d`)
Difícil de provocar a propósito; observar si en algún flujo aparece la pantalla "Algo salió mal" con botón "Reintentar".

- [ ] Si ocurre crash en alguna pantalla, **NO debe quedar en pantalla blanca** sino mostrar fallback
- [ ] Tap "Reintentar" → vuelve a la pantalla sin perder progreso del pedido/cobro

### B6. Visita con fotos del backend (cambio de hoy `66d6daf`)
Solo aplica si hay visitas creadas desde otra app (web admin, otra mobile app)

- [ ] Como admin desde web, crear una visita en cliente X con 2 fotos adjuntas
- [ ] Mobile vendedor sync → abrir esa visita → debe ver las 2 fotos cargadas (mapper v11 mapea `fotos_json`)

---

## C. Multi-rol / permisos

### C1. Vendedor (rol restringido)
- [ ] Login como `vendedor1@jeyma.com` → NO debe ver tab "Equipo" ni "Empresas"
- [ ] No debe poder ver pedidos de otros vendedores
- [ ] No debe poder cambiar configuración fiscal

### C2. Admin (más permisos)
- [ ] Login como `admin@jeyma.com` → Ver tab "Equipo" + reportes
- [ ] Ver dashboard con KPIs
- [ ] Activar/desactivar productos

### C3. SuperAdmin (xjoshmenx) — refactor `es_admin` (commits `e2916ea` etc.)
- [ ] Login con `xjoshmenx@gmail.com` desde mobile
- [ ] El JWT debe contener claim `role: "SUPER_ADMIN"` (NO `es_admin`/`es_super_admin`)
- [ ] No debe pedir confirmación "ya hay otra sesión activa" (SA exempted del single-session check)
- [ ] Single-session enforcement: login con admin@jeyma desde 2 dispositivos → segundo debe pedir "¿continuar aquí?"

---

## D. Funciones específicas mexicanas

### D1. CFDI / Facturación electrónica
Requiere tenant facturable + cliente con datos fiscales completos.

- [ ] Cliente facturable con RFC válido + razón social + CP fiscal + régimen fiscal
- [ ] Crear pedido para cliente facturable
- [ ] Tap "Generar factura" → llamada a Billing API → backend timbra con PAC (Finkok)
- [ ] Ver UUID + sello SAT + cadena original
- [ ] Imprimir CFDI 80mm con QR
- [ ] **Cancelar factura**: motivo + folio sustituto si aplica
- [ ] **Factura global** (suma de varios cobros): si está implementado

### D2. Tipos de pago SAT
- [ ] Cobro con efectivo → método_pago=01
- [ ] Cobro transferencia → método_pago=03
- [ ] Cobro tarjeta crédito → método_pago=04
- [ ] PUE (pago en una exhibición) vs PPD (pago en parcialidades)

---

## E. UX en condiciones reales

### E1. Conexión inestable
- [ ] WiFi a 3G → ver loading states
- [ ] Pérdida de red durante un POST → debe encolar offline (no perder datos)
- [ ] Reconexión → sync automático

### E2. Batería + performance
- [ ] App en background 30 min → al volver, sesión sigue activa (token refresh)
- [ ] Modo ahorro de batería → app debe seguir funcionando
- [ ] Sync inicial con tenant grande (~5k clientes) → ver tiempo y memoria

### E3. Pantallas pequeñas / orientación
- [ ] Verificar layout en Android 5.5" típico
- [ ] No probar landscape — la app es portrait-only

---

## F. Específicos de esta sesión (cambios 26-abr)

### Lo que se arregló y debe funcionar:

| Fix | Cómo verificar |
|---|---|
| **Refactor es_admin** (`e2916ea`) | Login SA xjoshmenx funciona, JWT solo tiene `role` |
| **ErrorBoundary** (`7f1111d`) | Si hay crash, fallback amarillo "Algo salió mal" |
| **GPS UX denegado** (`5936ab6`) | Toast info al denegar permiso en clients/crear |
| **Visita.fotos_json** (`66d6daf`) | Visitas pulled del server muestran fotos |
| **Producto.codigoBarra** (`44f784b`) | Producto sync trae código de barras correcto |
| **Cupon race condition** (`44f784b`) | Solo aplicable si redimes cupones desde mobile |
| **Zod en clients/crear** (`a1588a4`) | Errores inline con mensajes específicos |

---

## G. NO probar todavía (bloqueado)

- ❌ **SQLCipher encryption** (SEC-M1) — clave generada pero adapter no cableado, pendiente próxima build
- ❌ **Cert pinning** (SEC-M2) — pendiente
- ❌ **Root detection** (SEC-M3) — pendiente
- ❌ **Biometric login** (SEC-M4) — pendiente
- ❌ **Crash reports authenticated** — sigue siendo anónimo hasta próxima APK

---

## Cómo reportar bugs encontrados

Para cada bug que encuentres:
1. Pantalla donde ocurrió
2. Pasos para reproducir (3-5 pasos)
3. Qué esperabas vs qué pasó
4. Screenshot si es visual
5. Logs `adb logcat -s ReactNativeJS:V` si es crash

Pásame eso y lo arreglo + push staging para nueva APK.

---

## Cuando termines QA

Si todo OK, generar build de **production**:
```bash
cd apps/mobile-app
npx eas build --platform android --profile production
```

Esa AAB la subes a Google Play Console.
