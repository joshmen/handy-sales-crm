import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { COLORS } from '@/theme/colors';

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
