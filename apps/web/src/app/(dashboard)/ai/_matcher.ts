// _matcher.ts — Respuestas LOCALES por keywords para el Asistente (modo híbrido).
// Se usan SOLO cuando el tenant NO tiene plan con IA (free/básico). Si hay plan,
// la página llama al backend real (queryAi). PENDIENTE BACKEND: estas respuestas
// son de presentación; los botones de acción navegan a secciones reales.

export interface MatchListItem {
  name: string;
  value: string;
  sub?: string;
}
export interface MatchNavAction {
  label: string;
  href: string;
  /** Clave de ícono (ver ACTION_NAV_ICONS en page.tsx). */
  icon?: string;
}
export interface MatchResult {
  content: string;
  /** Lista opcional (ej. ranking de vendedores / clientes). */
  list?: MatchListItem[];
  /** Botones que navegan a secciones reales. */
  actions?: MatchNavAction[];
}

/** Tarjetas de insights proactivos (clic → lanza la pregunta). */
export interface AiInsight {
  id: string;
  tone: 'primary' | 'warning' | 'danger';
  icon: 'users' | 'trending' | 'package';
  title: string;
  desc: string;
  question: string;
}

export const AI_INSIGHTS: AiInsight[] = [
  {
    id: 'risk',
    tone: 'danger',
    icon: 'users',
    title: 'Clientes en riesgo',
    desc: '3 clientes sin compra en 30 días',
    question: '¿Qué clientes están en riesgo de abandono?',
  },
  {
    id: 'pace',
    tone: 'primary',
    icon: 'trending',
    title: 'Ritmo de ventas',
    desc: 'Vas 8% arriba vs el mes pasado',
    question: '¿Cómo va el ritmo de ventas este mes?',
  },
  {
    id: 'stock',
    tone: 'warning',
    icon: 'package',
    title: 'Productos bajo mínimo',
    desc: '5 productos por reordenar',
    question: '¿Qué productos están por debajo del mínimo?',
  },
];

const has = (p: string, re: RegExp) => re.test(p);

export function matchLocal(prompt: string): MatchResult {
  const p = prompt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // sin acentos para el matcher

  if (has(p, /cobran|vencid|cartera|deud|adeud/)) {
    return {
      content:
        'Tienes $10,640 en cartera vencida concentrados en 2 clientes. Te conviene priorizar el contacto con los de mayor antigüedad.',
      list: [
        { name: 'LA MERA BUENA', value: '$3,281', sub: '+90 días' },
        { name: 'Ferretería Industrial', value: '$2,980', sub: '61-90 días' },
        { name: 'Mini Súper Rosa', value: '$1,240', sub: '31-60 días' },
      ],
      actions: [{ label: 'Ver cobranza', href: '/cobranza', icon: 'wallet' }],
    };
  }

  if (has(p, /inventario|stock|minimo|reorden|existencia/)) {
    return {
      content: 'Hay 5 productos por debajo del mínimo. Estos son los más críticos por rotación:',
      list: [
        { name: 'Agua Bonafont 1L', value: '90 u', sub: 'mín. 150' },
        { name: 'Coca-Cola 600ml', value: '120 u', sub: 'mín. 120' },
        { name: 'Leche Lala 1L', value: '96 u', sub: 'mín. 80' },
      ],
      actions: [{ label: 'Ver inventario', href: '/inventory', icon: 'package' }],
    };
  }

  if (has(p, /vendedor|equipo|ranking|comisi|desempen|cumplimiento/)) {
    return {
      content: 'Así va el equipo este mes por ventas:',
      list: [
        { name: 'Carlos Mendoza', value: '$248,000', sub: '103% meta' },
        { name: 'Andrea López', value: '$212,000', sub: '96% meta' },
        { name: 'Roberto Silva', value: '$198,400', sub: '104% meta' },
        { name: 'Patricia Núñez', value: '$121,800', sub: '87% meta' },
      ],
      actions: [{ label: 'Ver equipo', href: '/team', icon: 'users' }],
    };
  }

  if (has(p, /riesgo|abandon|inactiv|sin compra|perdid/)) {
    return {
      content: '3 clientes no han comprado en más de 30 días. Vale la pena agendar una visita o un recordatorio.',
      list: [
        { name: 'Abarrotes Don Pepe', value: '38 días', sub: 'última compra 16 may' },
        { name: 'Tienda La Esquina', value: '45 días', sub: 'última compra 9 may' },
        { name: 'Depósito El Rancho', value: '52 días', sub: 'última compra 2 may' },
      ],
      actions: [
        { label: 'Ver clientes', href: '/clients', icon: 'users' },
        { label: 'Ver visitas', href: '/visits', icon: 'route' },
      ],
    };
  }

  if (has(p, /venta|ritmo|ingreso|facturaci|mes/)) {
    return {
      content:
        'Llevas $842,600 en ventas este mes, 8% arriba del mes anterior. El ticket promedio subió a $2,045 y la cobranza va al 91%.',
      actions: [{ label: 'Ver reportes', href: '/reports', icon: 'chart' }],
    };
  }

  if (has(p, /pedido|orden/)) {
    return {
      content: 'Hoy van 18 pedidos por $36,200. Tienes 4 pendientes de confirmar y 2 listos para enviar.',
      actions: [{ label: 'Ver pedidos', href: '/orders', icon: 'cart' }],
    };
  }

  return {
    content:
      'Puedo ayudarte con ventas, cobranza, inventario, clientes en riesgo y desempeño del equipo. Prueba con "¿Cómo va el ritmo de ventas?" o usa una de las tarjetas de arriba.',
    actions: [
      { label: 'Ver reportes', href: '/reports', icon: 'chart' },
      { label: 'Ver clientes', href: '/clients', icon: 'users' },
    ],
  };
}
