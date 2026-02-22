import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, secureTextEntry, style, ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = secureTextEntry !== undefined;

    const borderColor = error ? '#ef4444' : '#e2e8f0';
    const bgColor = error ? '#fef2f2' : '#f8fafc';

    return (
      <View style={styles.container}>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            { borderColor, backgroundColor: bgColor },
          ]}
        >
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            {...rest}
            style={[styles.input, style]}
            placeholderTextColor="#94a3b8"
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize="none"
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={20} color="#94a3b8" />
              ) : (
                <Eye size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    paddingVertical: 0,
  },
  eyeButton: {
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },
});
