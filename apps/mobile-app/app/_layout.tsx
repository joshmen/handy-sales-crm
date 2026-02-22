import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { useAuthStore } from '@/stores';
import { AnimatedSplash } from '@/components/shared/AnimatedSplash';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { secureStorage } from '@/utils/storage';
import { COLORS } from '@/utils/constants';

const ONBOARDING_KEY = 'onboarding_complete';

// Keep native splash visible until we're ready
SplashScreen.preventAutoHideAsync();

function AuthGate({ onReady }: { onReady: () => void }) {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
    // Check if onboarding was completed
    secureStorage.get(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    }).catch(() => {
      // SecureStore may fail on emulators — skip onboarding
      setOnboardingDone(true);
    });
  }, []);

  useEffect(() => {
    if (isLoading || onboardingDone === null) return;

    // Auth state resolved — tell root we're ready for animated splash
    onReady();

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Show onboarding on first launch, otherwise login
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, onboardingDone, segments]);

  if (isLoading || onboardingDone === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
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
      // Hide the native splash, our animated one takes over
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryProvider>
          <StatusBar style="dark" />
          <OfflineBanner />
          <AuthGate onReady={handleAppReady} />
          {showSplash && appReady && (
            <AnimatedSplash onFinish={handleSplashFinish} />
          )}
        </QueryProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
