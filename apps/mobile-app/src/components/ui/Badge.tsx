import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color = '#374151',
  bgColor = '#f3f4f6',
  size = 'sm',
}: BadgeProps) {
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      className={`rounded-full ${paddingClass}`}
      style={{ backgroundColor: bgColor }}
    >
      <Text className={`font-medium ${textClass}`} style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
