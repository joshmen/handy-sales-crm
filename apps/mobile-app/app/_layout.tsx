import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
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
import { ConfirmModal } from '@/components/ui';
import { usePermissionDialogStore } from '@/stores/permissionDialogStore';
import { useRealtime } from '@/hooks';

function GlobalPermissionDialog() {
  const { visible, title, message, confirmText, cancelText, handleConfirm, handleCancel } = usePermissionDialogStore();
  return <ConfirmModal visible={visible} title={title} message={message} confirmText={confirmText} cancelText={cancelText} onConfirm={handleConfirm} onCancel={handleCancel} />;
}

// Mantiene la conexión SignalR mientras hay sesión + cablea eventos a invalidaciones React Query.
function RealtimeBridge() {
  useRealtime();
  return null;
}
// SyncLoadingScreen merged into AnimatedSplash (syncMode prop)

const ONBOARDING_KEY = 'onboarding_complete';

SplashScreen.preventAutoHideAsync();

const INITIAL_SYNC_KEY = 'initial_sync_complete';

function AuthGate({ onReady }: { onReady: (firstSync?: boolean) => void }) {
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
    // INITIAL_SYNC_KEY no longer needed — sync runs every login
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

    // Always sync on login — splash shows progress
    onReady(isAuthenticated);

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      if (!onboardingDone) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && !inTabsGroup) {
      // Navigate to tabs — splash overlay handles sync if needed
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, onboardingDone,segments]);

  // Handle cold-start deep links (e.g., from killed notification tap)
  useEffect(() => {
    if (!isAuthenticated) return;
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const path = url.replace(/^handysuites:\/\//, '/');
      if (path.startsWith('/(tabs)/')) router.push(path as any);
    });
  }, [isAuthenticated]);

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
  const [needsInitialSync, setNeedsInitialSync] = useState(false);

  const handleAppReady = useCallback((firstSync?: boolean) => {
    if (!appReady) {
      setAppReady(true);
      if (firstSync) setNeedsInitialSync(true);
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    setNeedsInitialSync(false);
  }, []);

  const handleSyncComplete = useCallback(async () => {
    // Sync completed — data is ready for offline use
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseProvider database={database}>
          <QueryProvider>
            <StatusBar style={showSplash ? 'light' : 'dark'} />
            <AuthGate onReady={handleAppReady} />
            <RealtimeBridge />
            {showSplash && appReady && (
              <AnimatedSplash
                onFinish={handleSplashFinish}
                syncMode={needsInitialSync}
                onSyncComplete={handleSyncComplete}
              />
            )}
            <Toast />
            <GlobalPermissionDialog />
          </QueryProvider>
        </DatabaseProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
