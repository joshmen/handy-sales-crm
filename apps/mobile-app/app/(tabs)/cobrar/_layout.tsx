import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Ancla del back: al entrar a un detalle (deep link o cross-tab) deja `index`
// debajo en el stack, asi el back vuelve a la lista en vez de salir o ir al Hoy.
export const unstable_settings = {
  initialRouteName: 'index',
};

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
