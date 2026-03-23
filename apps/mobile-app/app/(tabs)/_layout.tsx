import { Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Map, Users, ShoppingBag, CreditCard, MoreHorizontal } from 'lucide-react-native';
import { useAutoSync } from '@/hooks/useAutoSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadNotificationCount } from '@/hooks/useNotificationCount';
import { usePendingCount } from '@/hooks';
import { useAuthStore } from '@/stores';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { COLORS } from '@/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useAutoSync();
  usePushNotifications();
  const { data: pendingCount = 0 } = usePendingCount();
  const { count: unreadNotifCount } = useUnreadNotificationCount();
  const role = useAuthStore(s => s.user?.role);

  // Combine pending sync items + unread notifications for the Mas badge
  const masBadgeCount = pendingCount + unreadNotifCount;

  // Tab visibility per role:
  // Vendedor:   Hoy, Mapa, Vender, Cobrar, Mas
  // Supervisor: Hoy, Equipo, Vender, Cobrar, Mas
  // Admin:      Hoy, Equipo, Vender, Cobrar, Mas
  const isVendedor = role === 'VENDEDOR';
  const showEquipo = !isVendedor; // Supervisor, Admin, Super_Admin
  const showMapa = isVendedor;    // Only vendedor gets standalone Mapa tab

  return (
    <ErrorBoundary componentName="TabsRoot">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,       // #4338CA indigo
        tabBarInactiveTintColor: '#9ca3af',           // gray-400
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
        tabBarStyle: {
          borderTopColor: '#e5e7eb',                  // gray-200 top border
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 6),
          paddingTop: 6,
          height: (Platform.OS === 'ios' ? 60 : 60) + Math.max(insets.bottom, 0),
          backgroundColor: COLORS.card,               // white
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
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          href: showMapa ? undefined : null,
          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="equipo"
        options={{
          title: 'Equipo',
          href: showEquipo ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vender"
        options={{
          title: 'Vender',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cobrar"
        options={{
          title: 'Cobrar',
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            // Reset cobrar stack to index when tab is pressed (avoids stale recibo screen)
            e.preventDefault();
            router.replace('/(tabs)/cobrar' as any);
          },
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Mas',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
          tabBarBadge: masBadgeCount > 0 ? masBadgeCount : undefined,
          tabBarBadgeStyle: masBadgeCount > 0 ? { backgroundColor: COLORS.warning, fontSize: 10 } : undefined,
        }}
      />
      {/* Hidden tabs — accessible via navigation from Mas */}
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen name="ruta" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="configuracion" options={{ href: null }} />
      <Tabs.Screen name="impresora" options={{ href: null }} />
      <Tabs.Screen name="sync" options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="ayuda" options={{ href: null }} />
      <Tabs.Screen name="acerca" options={{ href: null }} />
    </Tabs>
    </ErrorBoundary>
  );
}
