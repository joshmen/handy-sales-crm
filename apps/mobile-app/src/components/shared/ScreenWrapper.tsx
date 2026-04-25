import React from 'react';
import {
  View,
  KeyboardAvoidingView,
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
    // behavior="padding" es seguro en ambas plataformas. behavior="height" en
    // Android causa layout thrashing notorio con TextInput multiline (issue
    // recurrente en Android RN). Si en el futuro alguien necesita 'height',
    // que lo justifique con un test específico — por ahora 'padding' funciona.
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
