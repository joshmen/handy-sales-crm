import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function VenderLayout() {
  return (
    <ErrorBoundary componentName="VenderStack">
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Pedidos', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="productos" options={{ headerShown: false }} />
      <Stack.Screen name="producto/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="crear/modo" options={{ title: 'Nuevo Pedido', headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="crear/index" options={{ title: 'Seleccionar Cliente', headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="crear/productos" options={{ title: 'Productos', headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="crear/revision" options={{ title: 'Revisar Pedido', headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="crear/exito" options={{ title: '', headerShown: false, animation: 'fade', gestureEnabled: false }} />
    </Stack>
    </ErrorBoundary>
  );
}
