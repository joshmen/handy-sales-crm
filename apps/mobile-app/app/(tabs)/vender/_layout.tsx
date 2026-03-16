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
      <Stack.Screen name="[id]" options={{ title: 'Detalle Pedido' }} />
      <Stack.Screen name="productos" options={{ title: 'Productos' }} />
      <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
      <Stack.Screen name="crear/modo" options={{ title: 'Nuevo Pedido' }} />
      <Stack.Screen name="crear/index" options={{ title: 'Nuevo Pedido' }} />
      <Stack.Screen name="crear/productos" options={{ title: 'Agregar Productos' }} />
      <Stack.Screen name="crear/revision" options={{ title: 'Revisar Pedido' }} />
      <Stack.Screen name="crear/exito" options={{ title: '', headerShown: false, animation: 'fade', gestureEnabled: false }} />
    </Stack>
    </ErrorBoundary>
  );
}
