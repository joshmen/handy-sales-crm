import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function FacturasLayout() {
  return (
    <ErrorBoundary componentName="FacturasStack">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="[id]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="preview/[id]" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}
