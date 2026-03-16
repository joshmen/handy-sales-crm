import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SbDashboard, SbMap, SbOrders, SbPayments, SbMenu, SbTeam } from '@/components/icons/DashboardIcons';
import { useAutoSync } from '@/hooks/useAutoSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePendingCount } from '@/hooks';
import { useAuthStore } from '@/stores';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  useAutoSync();
  usePushNotifications();
  const { data: pendingCount = 0 } = usePendingCount();
  const role = useAuthStore(s => s.user?.role);
  const isSupervisor = role === 'SUPERVISOR';

  return (
    <ErrorBoundary componentName="TabsRoot">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
        tabBarStyle: {
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 6),
          paddingTop: 6,
          height: (Platform.OS === 'ios' ? 60 : 60) + Math.max(insets.bottom, 0),
          backgroundColor: '#ffffff',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ size }) => <SbDashboard size={size} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ size }) => <SbMap size={size} />,
        }}
      />
      <Tabs.Screen
        name="vender"
        options={{
          title: 'Vender',
          tabBarIcon: ({ size }) => <SbOrders size={size} />,
        }}
      />
      <Tabs.Screen
        name="cobrar"
        options={{
          title: 'Cobrar',
          tabBarIcon: ({ size }) => <SbPayments size={size} />,
        }}
      />
      <Tabs.Screen
        name="equipo"
        options={{
          title: 'Equipo',
          href: isSupervisor ? undefined : null,
          tabBarIcon: ({ size }) => <SbTeam size={size} />,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarIcon: ({ size }) => <SbMenu size={size} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: pendingCount > 0 ? { backgroundColor: '#f59e0b', fontSize: 10 } : undefined,
        }}
      />
      {/* Hidden tabs — accessible via navigation from Más */}
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen name="ruta" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="configuracion" options={{ href: null }} />
      <Tabs.Screen name="impresora" options={{ href: null }} />
      <Tabs.Screen name="sync" options={{ href: null }} />
    </Tabs>
    </ErrorBoundary>
  );
}
