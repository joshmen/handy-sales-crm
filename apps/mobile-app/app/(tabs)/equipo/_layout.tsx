import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { COLORS } from '@/theme/colors';

// Ancla del back: al entrar a un detalle (deep link o cross-tab) deja `index`
// debajo en el stack, asi el back vuelve a la lista en vez de salir o ir al Hoy.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function EquipoLayout() {
  return (
    <ErrorBoundary componentName="EquipoStack">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: COLORS.headerText },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="mapa" options={{ headerShown: false }} />
        <Stack.Screen name="actividad" options={{ headerShown: false }} />
        <Stack.Screen name="vendedor/[id]" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}
