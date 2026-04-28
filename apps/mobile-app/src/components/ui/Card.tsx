import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ children, onPress, className = '', variant = 'default', accessibilityLabel, testID }: CardProps) {
  const variantStyle = variant === 'elevated'
    ? styles.elevated
    : variant === 'outlined'
    ? styles.outlined
    : styles.default;

  if (onPress) {
    return (
      <TouchableOpacity
        className={`bg-white rounded-2xl p-4 ${className}`}
        style={variantStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`bg-white rounded-2xl p-4 ${className}`}
      style={variantStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  elevated: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: 'transparent',
    elevation: 0,
  },
});
