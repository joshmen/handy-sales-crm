import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, Map, ShoppingBag, Wallet, Menu } from 'lucide-react-native';
import { useAutoSync } from '@/hooks/useAutoSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePendingCount } from '@/hooks';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  useAutoSync();
  usePushNotifications();
  const { data: pendingCount = 0 } = usePendingCount();

  return (
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
          tabBarIcon: ({ color, size }) => <CalendarClock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
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
  );
}
