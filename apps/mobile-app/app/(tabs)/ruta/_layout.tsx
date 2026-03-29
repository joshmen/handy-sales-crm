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
    </Stack>
    </ErrorBoundary>
  );
}
