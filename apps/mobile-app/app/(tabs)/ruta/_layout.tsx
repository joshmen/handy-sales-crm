import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function RutaLayout() {

  return (
    <ErrorBoundary componentName="RutaStack">
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="parada/[detalleId]" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="visita-activa" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="resumen" options={{ headerShown: false, gestureEnabled: false }} />
      {/* v23 (2026-05-29): Gastos del vendedor — viven en Ruta porque son intrínsecos a la ruta del día */}
      <Stack.Screen name="gastos/index" options={{ headerShown: false }} />
      <Stack.Screen name="gastos/nuevo" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="gastos/[gastoId]" options={{ headerShown: false }} />
    </Stack>
    </ErrorBoundary>
  );
}
