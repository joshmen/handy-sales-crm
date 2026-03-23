import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function CobrarLayout() {
  return (
    <ErrorBoundary componentName="CobrarStack">
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="estado-cuenta/[clienteId]" options={{ headerShown: false }} />
      <Stack.Screen name="registrar" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="historial" options={{ headerShown: false }} />
      <Stack.Screen name="detalle-cobro/[cobroId]" options={{ headerShown: false }} />
      <Stack.Screen name="recibo" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
    </Stack>
    </ErrorBoundary>
  );
}
