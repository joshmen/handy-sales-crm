import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuthStore } from '@/stores';
import { useLogout } from '@/hooks';
import { Badge } from '@/components/ui';
import {
  Users,
  ShoppingCart,
  Route,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  RefreshCcw,
  Mail,
  Printer,
} from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN: '#2563eb',
  VENDEDOR: '#16a34a',
};

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
}

function MasScreenContent() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => logoutMutation.mutate(),
        },
      ]
    );
  };

  const primaryItems: MenuItem[] = [
    {
      label: 'Clientes',
      icon: <Users size={20} color="#7c3aed" />,
      iconBg: '#ede9fe',
      onPress: () => router.push('/(tabs)/clients'),
    },
    {
      label: 'Pedidos',
      icon: <ShoppingCart size={20} color="#d97706" />,
      iconBg: '#fef3c7',
      onPress: () => router.push('/(tabs)/vender' as any),
    },
    {
      label: 'Ruta del Día',
      icon: <Route size={20} color="#2563eb" />,
      iconBg: '#dbeafe',
      onPress: () => router.push('/(tabs)/ruta' as any),
    },
    {
      label: 'Sincronización',
      icon: <RefreshCcw size={20} color="#0891b2" />,
      iconBg: '#cffafe',
      onPress: () => router.push('/(tabs)/sync' as any),
    },
  ];

  const secondaryItems: MenuItem[] = [
    {
      label: 'Mi Perfil',
      icon: <User size={20} color="#6366f1" />,
      iconBg: '#e0e7ff',
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      label: 'Configuración',
      icon: <Settings size={20} color="#64748b" />,
      iconBg: '#f1f5f9',
      onPress: () => router.push('/(tabs)/configuracion' as any),
    },
    {
      label: 'Impresora',
      icon: <Printer size={20} color="#0891b2" />,
      iconBg: '#cffafe',
      onPress: () => router.push('/(tabs)/impresora' as any),
    },
    {
      label: 'Ayuda',
      icon: <HelpCircle size={20} color="#16a34a" />,
      iconBg: '#dcfce7',
      onPress: () => {},
    },
  ];

  const roleColor = ROLE_COLORS[user?.role || ''] || '#6b7280';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
            <View style={styles.emailRow}>
              <Mail size={12} color="#94a3b8" />
              <Text style={styles.emailText}>{user?.email || ''}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Badge
                label={ROLE_LABELS[user?.role || ''] || user?.role || 'Usuario'}
                color={roleColor}
                bgColor={`${roleColor}15`}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Primary Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navegación</Text>
        {primaryItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
              {item.icon}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Secondary Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        {secondaryItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
              {item.icon}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#fee2e2' }]}>
            <LogOut size={20} color="#ef4444" />
          </View>
          <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <HandyLogo size={24} />
        <Text style={styles.footerBrand}>Handy Suites®</Text>
        <Text style={styles.footerVersion}>
          v{Application.nativeApplicationVersion || '1.0.0'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  profileCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  emailText: { fontSize: 13, color: '#94a3b8' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#ef4444' },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerBrand: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginTop: 6 },
  footerVersion: { fontSize: 12, color: '#cbd5e1' },
});

export default function MasScreen() {
  return (
    <ErrorBoundary componentName="TabMas">
      <MasScreenContent />
    </ErrorBoundary>
  );
}
