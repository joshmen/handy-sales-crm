import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  bg?: string;
  withKeyboard?: boolean;
  padTop?: boolean;
  padBottom?: boolean;
}

export function ScreenWrapper({
  children,
  bg = '#f9fafb',
  withKeyboard = false,
  padTop = false,
  padBottom = true,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = padTop ? Math.max(insets.top, 8) : 0;
  const paddingBottom = padBottom ? Math.max(insets.bottom, 8) : 0;

  const content = (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        paddingTop,
        paddingBottom,
      }}
    >
      {children}
    </View>
  );

  if (withKeyboard) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
