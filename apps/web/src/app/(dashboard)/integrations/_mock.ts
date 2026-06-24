// _mock.ts — Datos de PRESENTACIÓN para el rediseño de Integraciones.
// PENDIENTE BACKEND: el backend actual (services/api/integrations.ts) solo expone
// catálogo + activar/desactivar, sin salud, última sync, credenciales, webhooks ni
// API keys. Aquí vive el catálogo de presentación + los detalles mock para poder
// rediseñar la vista. Cuando exista el backend real, reemplazar estas estructuras
// por las respuestas reales (los componentes ya consumen estas formas).

export type IntegrationHealth = 'operativa' | 'error' | null;

export interface MockIntegration {
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  /** Clave de ícono Lucide (ver ICONOS en page.tsx). */
  icon: string;
  /** PAC del SAT (muestra badge "PAC"). */
  pac?: boolean;
  /** Integración del core (tab "Oficiales"). */
  official: boolean;
  /** Disponible en el marketplace de terceros (tab "Marketplace"). */
  marketplace: boolean;
  connected: boolean;
  health: IntegrationHealth;
  /** Etiqueta relativa de última sincronización, ej. "hace 5 min". */
  lastSync?: string;
  /** Datos de conexión (bloque "Conexión" del detalle). */
  cuenta?: string;
  entorno?: string;
}

export const MOCK_INTEGRATIONS: MockIntegration[] = [
  {
    slug: 'finkok',
    nombre: 'Finkok',
    categoria: 'Facturación',
    descripcion: 'Timbrado y cancelación de CFDI 4.0 ante el SAT.',
    icon: 'receipt',
    pac: true,
    official: true,
    marketplace: false,
    connected: true,
    health: 'operativa',
    lastSync: 'hace 5 min',
    cuenta: 'EKU9003173C9',
    entorno: 'Producción',
  },
  {
    slug: 'mapbox',
    nombre: 'Mapbox',
    categoria: 'Mapas y rutas',
    descripcion: 'Mapas, geocodificación y optimización de rutas de reparto.',
    icon: 'map',
    official: true,
    marketplace: false,
    connected: true,
    health: 'operativa',
    lastSync: 'hace 2 h',
    cuenta: 'handy-sales-prod',
    entorno: 'Producción',
  },
  {
    slug: 'stripe',
    nombre: 'Stripe',
    categoria: 'Pagos',
    descripcion: 'Cobra pagos en línea y concilia tu cuenta automáticamente.',
    icon: 'card',
    official: true,
    marketplace: false,
    connected: true,
    health: 'error',
    lastSync: 'hace 1 día',
    cuenta: 'acct_1Q8••••',
    entorno: 'Producción',
  },
  {
    slug: 'whatsapp',
    nombre: 'WhatsApp Business',
    categoria: 'Mensajería',
    descripcion: 'Envía confirmaciones de pedido y recordatorios de cobro por WhatsApp.',
    icon: 'message',
    official: true,
    marketplace: false,
    connected: false,
    health: null,
  },
  {
    slug: 'contpaqi',
    nombre: 'CONTPAQi',
    categoria: 'Contabilidad',
    descripcion: 'Exporta pólizas y comprobantes a tu sistema contable CONTPAQi.',
    icon: 'book',
    official: false,
    marketplace: true,
    connected: false,
    health: null,
  },
  {
    slug: 'mailchimp',
    nombre: 'Mailchimp',
    categoria: 'Marketing',
    descripcion: 'Sincroniza clientes y lanza campañas de correo.',
    icon: 'mail',
    official: false,
    marketplace: true,
    connected: false,
    health: null,
  },
  {
    slug: 'zapier',
    nombre: 'Zapier',
    categoria: 'Automatización',
    descripcion: 'Conecta Handy Sales con miles de apps vía Zapier.',
    icon: 'zap',
    official: false,
    marketplace: true,
    connected: false,
    health: null,
  },
];

export function getMockIntegration(slug: string): MockIntegration | undefined {
  return MOCK_INTEGRATIONS.find((i) => i.slug === slug);
}

// ── Detalle por integración ─────────────────────────────────────────────
export interface DetailMetric {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}
export interface CredentialField {
  key: string;
  label: string;
  /** secreto → input type=password con botón de revelar. */
  secret?: boolean;
  placeholder?: string;
  value?: string;
}
export interface ActivityEvent {
  id: string;
  tone: 'success' | 'danger' | 'info' | 'warning';
  title: string;
  detail?: string;
  /** Etiqueta de tiempo relativa. */
  when: string;
}
export interface IntegrationDetailMock {
  metrics: DetailMetric[];
  credentials: CredentialField[];
  activity: ActivityEvent[];
}

const DEFAULT_DETAIL: IntegrationDetailMock = {
  metrics: [
    { label: 'Llamadas (30 días)', value: '1,284' },
    { label: 'Tasa de éxito', value: '99.2%', tone: 'success' },
    { label: 'Errores (30 días)', value: '3', tone: 'warning' },
  ],
  credentials: [
    { key: 'apiKey', label: 'API Key', secret: true, placeholder: 'sk_live_…', value: 'sk_live_4f0a9c2b7e' },
    { key: 'apiSecret', label: 'API Secret', secret: true, placeholder: '••••••••' },
  ],
  activity: [
    { id: 'a1', tone: 'success', title: 'Conexión verificada', when: 'hace 5 min' },
    { id: 'a2', tone: 'info', title: 'Sincronización completada', detail: '128 registros', when: 'hace 2 h' },
    { id: 'a3', tone: 'warning', title: 'Reintento automático', detail: 'Tiempo de espera agotado', when: 'ayer' },
  ],
};

const DETAILS: Record<string, IntegrationDetailMock> = {
  finkok: {
    metrics: [
      { label: 'Timbres usados', value: '842' },
      { label: 'Timbres restantes', value: '1,158', tone: 'primary' },
      { label: 'Tasa de éxito', value: '99.6%', tone: 'success' },
    ],
    credentials: [
      { key: 'usuario', label: 'Usuario PAC', placeholder: 'usuario@empresa.com', value: 'facturacion@jeyma.com' },
      { key: 'password', label: 'Contraseña PAC', secret: true, placeholder: '••••••••', value: 'finkok-secret-key' },
      { key: 'rfc', label: 'RFC emisor', placeholder: 'XAXX010101000', value: 'EKU9003173C9' },
    ],
    activity: [
      { id: 'f1', tone: 'success', title: 'CFDI timbrado', detail: 'Folio A-1042', when: 'hace 5 min' },
      { id: 'f2', tone: 'success', title: 'CFDI timbrado', detail: 'Folio A-1041', when: 'hace 22 min' },
      { id: 'f3', tone: 'info', title: 'Cancelación aceptada', detail: 'UUID 3f2a…', when: 'hace 3 h' },
      { id: 'f4', tone: 'danger', title: 'Timbrado rechazado', detail: 'CFDI40167 ValorUnitario', when: 'ayer' },
    ],
  },
  stripe: {
    metrics: [
      { label: 'Cobros (30 días)', value: '$48,200' },
      { label: 'Tasa de éxito', value: '92.1%', tone: 'warning' },
      { label: 'Reintentos', value: '11', tone: 'danger' },
    ],
    credentials: [
      { key: 'publishable', label: 'Publishable key', placeholder: 'pk_live_…', value: 'pk_live_51Q8aZ' },
      { key: 'secret', label: 'Secret key', secret: true, placeholder: 'sk_live_…', value: 'sk_live_51Q8aZ_secret' },
      { key: 'webhookSecret', label: 'Webhook signing secret', secret: true, placeholder: 'whsec_…' },
    ],
    activity: [
      { id: 's1', tone: 'danger', title: 'Webhook con error 500', detail: 'payment_intent.failed', when: 'hace 1 día' },
      { id: 's2', tone: 'success', title: 'Pago confirmado', detail: '$1,240', when: 'hace 1 día' },
      { id: 's3', tone: 'info', title: 'Conciliación automática', detail: '32 cargos', when: 'hace 2 días' },
    ],
  },
};

export function getIntegrationDetail(slug: string): IntegrationDetailMock {
  return DETAILS[slug] ?? DEFAULT_DETAIL;
}

// ── API Keys / Webhooks / Entregas (vista de desarrollador) ─────────────
export interface ApiKeyMock {
  id: string;
  label: string;
  scope: string;
  /** Clave completa (se enmascara en UI salvo revelar). */
  key: string;
  created: string;
  lastUsed: string;
}
export interface WebhookMock {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastStatus: 'ok' | 'failed' | 'retrying';
  lastCode: number;
}
export interface DeliveryMock {
  id: string;
  event: string;
  code: number;
  latencyMs: number;
  when: string;
}

export const MOCK_API_KEYS: ApiKeyMock[] = [
  { id: 'k1', label: 'Producción', scope: 'read·write', key: 'hs_live_4f0a9c2b7e3d', created: '12 mar 2026', lastUsed: 'hace 8 min' },
  { id: 'k2', label: 'Solo lectura (reportes)', scope: 'read', key: 'hs_live_91bd72ee04aa', created: '02 feb 2026', lastUsed: 'hace 3 días' },
];

export const MOCK_WEBHOOKS: WebhookMock[] = [
  { id: 'w1', url: 'https://erp.jeyma.com/hooks/handy', events: ['order.created', 'invoice.stamped'], active: true, lastStatus: 'ok', lastCode: 200 },
  { id: 'w2', url: 'https://hooks.zapier.com/hooks/catch/8821/abc', events: ['payment.received'], active: true, lastStatus: 'retrying', lastCode: 500 },
  { id: 'w3', url: 'https://staging.jeyma.com/hooks/handy', events: ['order.created', 'order.cancelled'], active: false, lastStatus: 'failed', lastCode: 503 },
];

export const MOCK_DELIVERIES: DeliveryMock[] = [
  { id: 'd1', event: 'invoice.stamped', code: 200, latencyMs: 142, when: 'hace 8 min' },
  { id: 'd2', event: 'order.created', code: 200, latencyMs: 98, when: 'hace 21 min' },
  { id: 'd3', event: 'payment.received', code: 500, latencyMs: 5021, when: 'hace 34 min' },
  { id: 'd4', event: 'order.created', code: 200, latencyMs: 110, when: 'hace 1 h' },
  { id: 'd5', event: 'payment.received', code: 503, latencyMs: 30001, when: 'hace 2 h' },
];

export const WEBHOOK_EVENTS = [
  'order.created',
  'order.cancelled',
  'invoice.stamped',
  'invoice.cancelled',
  'payment.received',
  'client.created',
];
