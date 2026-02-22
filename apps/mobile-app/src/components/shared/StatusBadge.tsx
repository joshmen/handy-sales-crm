import React from 'react';
import { Badge } from '@/components/ui';
import {
  ORDER_STATUS,
  ORDER_STATUS_COLORS,
  ROUTE_STATUS,
  ROUTE_STATUS_COLORS,
  VISIT_RESULT,
  VISIT_RESULT_COLORS,
} from '@/utils/constants';

interface StatusBadgeProps {
  type: 'order' | 'route' | 'visit';
  status: number;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  let label: string;
  let color: string;

  switch (type) {
    case 'order':
      label = ORDER_STATUS[status] || 'Desconocido';
      color = ORDER_STATUS_COLORS[status] || '#6b7280';
      break;
    case 'route':
      label = ROUTE_STATUS[status] || 'Desconocido';
      color = ROUTE_STATUS_COLORS[status] || '#6b7280';
      break;
    case 'visit':
      label = VISIT_RESULT[status] || 'Desconocido';
      color = VISIT_RESULT_COLORS[status] || '#6b7280';
      break;
  }

  return <Badge label={label} color={color} bgColor={`${color}15`} />;
}
