import { Stack } from 'expo-router';

export default function VenderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Pedidos' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle Pedido' }} />
      <Stack.Screen name="productos" options={{ title: 'Productos' }} />
      <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
      <Stack.Screen name="crear/index" options={{ title: 'Nuevo Pedido' }} />
      <Stack.Screen name="crear/productos" options={{ title: 'Agregar Productos' }} />
      <Stack.Screen name="crear/revision" options={{ title: 'Revisar Pedido' }} />
      <Stack.Screen name="crear/exito" options={{ title: '', headerShown: false }} />
    </Stack>
  );
}
