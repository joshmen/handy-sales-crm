import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function EquipoLayout() {
  return (
    <ErrorBoundary componentName="EquipoStack">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Mi Equipo', headerShown: false }} />
        <Stack.Screen name="mapa" options={{ title: 'Mapa del Equipo' }} />
        <Stack.Screen name="vendedor/[id]" options={{ title: 'Detalle Vendedor' }} />
      </Stack>
    </ErrorBoundary>
  );
}
