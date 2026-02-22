import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Clientes' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle Cliente' }} />
      <Stack.Screen name="crear" options={{ title: 'Nuevo Cliente' }} />
    </Stack>
  );
}
