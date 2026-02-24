import { Stack } from 'expo-router';

export default function CobrarLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cobranza' }} />
      <Stack.Screen name="estado-cuenta/[clienteId]" options={{ title: 'Estado de Cuenta' }} />
      <Stack.Screen name="registrar" options={{ title: 'Registrar Cobro' }} />
      <Stack.Screen name="historial" options={{ title: 'Historial de Cobros' }} />
      <Stack.Screen name="recibo" options={{ title: 'Recibo', headerBackVisible: false }} />
    </Stack>
  );
}
