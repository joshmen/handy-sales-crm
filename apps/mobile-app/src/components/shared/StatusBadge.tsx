import React from 'react';
import { Badge } from '@/components/ui';
import {
  ROUTE_STATUS,
  ROUTE_STATUS_COLORS,
  VISIT_RESULT,
  VISIT_RESULT_COLORS,
} from '@/utils/constants';
import { ORDER_STATUS_COLORS } from '@/constants/colors';

interface StatusBadgeProps {
  type: 'order' | 'route' | 'visit';
  status: number;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  let label: string;
  let color: string;

  switch (type) {
    case 'order': {
      const orderColor = ORDER_STATUS_COLORS[status] ?? ORDER_STATUS_COLORS[0];
      label = orderColor.label;
      color = orderColor.text;
      return <Badge label={label} color={color} bgColor={orderColor.bg} />;
    }
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
