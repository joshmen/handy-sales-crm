import { Stack } from 'expo-router';

export default function RutaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ruta del Día' }} />
      <Stack.Screen name="parada/[detalleId]" options={{ title: 'Detalle Parada' }} />
      <Stack.Screen name="visita-activa" options={{ title: 'Visita en Curso', headerShown: false }} />
      <Stack.Screen name="resumen" options={{ title: 'Resumen del Día' }} />
    </Stack>
  );
}
