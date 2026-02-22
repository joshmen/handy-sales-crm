import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

const VARIANT_STYLES = {
  primary: { bg: '#2563eb', text: '#ffffff' },
  secondary: { bg: '#f1f5f9', text: '#334155' },
  danger: { bg: '#ef4444', text: '#ffffff' },
  ghost: { bg: 'transparent', text: '#2563eb' },
  outline: { bg: 'transparent', text: '#2563eb' },
};

const SIZE_CONFIG = {
  sm: { height: 36, paddingH: 14, fontSize: 13, iconGap: 6, radius: 10 },
  md: { height: 48, paddingH: 20, fontSize: 15, iconGap: 8, radius: 12 },
  lg: { height: 54, paddingH: 24, fontSize: 16, iconGap: 10, radius: 14 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANT_STYLES[variant];
  const s = SIZE_CONFIG[size];

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          height: s.height,
          paddingHorizontal: s.paddingH,
          borderRadius: s.radius,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        variant === 'outline' && { borderWidth: 1.5, borderColor: '#2563eb' },
        variant === 'primary' && styles.primaryShadow,
        variant === 'danger' && styles.dangerShadow,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={v.text}
          size="small"
          style={{ marginRight: s.iconGap }}
        />
      ) : icon ? (
        <View style={{ marginRight: s.iconGap }}>{icon}</View>
      ) : null}
      <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  primaryShadow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerShadow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
