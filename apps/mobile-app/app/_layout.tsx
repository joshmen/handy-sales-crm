import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, LogBox, BackHandler, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { crashReporter } from '@/services/crashReporter';

LogBox.ignoreLogs([
  "Cannot read property 'initializeJSI'",
  'Require cycle:',
]);

// Global error handler — captura errores fuera del árbol React
// ErrorUtils may be undefined in some Expo Go / Hermes environments
const _ErrorUtils = (globalThis as any).ErrorUtils;
if (_ErrorUtils?.getGlobalHandler) {
  const previousHandler = _ErrorUtils.getGlobalHandler();
  _ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    crashReporter.reportCrash(error, 'global', isFatal ? 'CRASH' : 'ERROR');
    previousHandler?.(error, isFatal);
  });
}

import { QueryProvider } from '@/providers/QueryProvider';
import { useAuthStore } from '@/stores';
import { AnimatedSplash } from '@/components/shared/AnimatedSplash';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { secureStorage } from '@/utils/storage';
import { COLORS } from '@/utils/constants';
import { database } from '@/db/database';
import Toast from 'react-native-toast-message';

const ONBOARDING_KEY = 'onboarding_complete';

SplashScreen.preventAutoHideAsync();

function AuthGate({ onReady }: { onReady: () => void }) {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
    secureStorage.get(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    }).catch(() => {
      setOnboardingDone(true);
    });
  }, []);

  // Back handler — confirm exit on home screen
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const isHome = segments[0] === '(tabs)' && !segments[1];
    if (!isHome) return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Salir de HandySales',
        '¿Deseas salir de la aplicación?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí, salir', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true; // Prevent default back
    });
    return () => handler.remove();
  }, [segments]);

  useEffect(() => {
    if (isLoading || onboardingDone === null) return;

    onReady();

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && !inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, onboardingDone, segments]);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  const handleAppReady = useCallback(() => {
    if (!appReady) {
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseProvider database={database}>
          <QueryProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <AuthGate onReady={handleAppReady} />
            {showSplash && appReady && (
              <AnimatedSplash onFinish={handleSplashFinish} />
            )}
            <Toast />
          </QueryProvider>
        </DatabaseProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
