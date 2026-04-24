import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuthStore } from '@/stores';
import { useLogout } from '@/hooks';
import Toast from 'react-native-toast-message';
import { Badge, ConfirmModal } from '@/components/ui';
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
  Bell,
  Info,
  Megaphone,
  Target,
  TrendingUp,
  Package,
  FileText,
} from 'lucide-react-native';
import { SbClients, SbOrders, SbRoute } from '@/components/icons/DashboardIcons';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  VENDEDOR: 'Vendedor',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN: '#4338CA',
  SUPERVISOR: '#d97706',
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
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(true);
  };

  const role = user?.role;
  const canSeeFacturas = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERVISOR';

  const primaryItems: MenuItem[] = [
    {
      label: 'Clientes',
      icon: <SbClients size={20} />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/clients'),
    },
    {
      label: 'Pedidos',
      icon: <SbOrders size={20} />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/vender' as any),
    },
    {
      label: 'Productos',
      icon: <Package size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/vender/productos' as any),
    },
    {
      label: 'Inventario',
      icon: <Package size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/inventario' as any),
    },
    {
      label: 'Historial de Rutas',
      icon: <SbRoute size={20} />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/historial-rutas' as any),
    },
    ...(canSeeFacturas
      ? [{
          label: 'Facturas',
          icon: <FileText size={20} color="#6b7280" />,
          iconBg: COLORS.background,
          onPress: () => router.push('/(tabs)/facturas' as any),
        }]
      : []),
    {
      label: 'Anuncios',
      icon: <Megaphone size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/anuncios' as any),
    },
    {
      label: 'Ruta del Día',
      icon: <SbRoute size={20} />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/ruta' as any),
    },
    {
      label: 'Sincronización',
      icon: <RefreshCcw size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/sync' as any),
    },
  ];

  const secondaryItems: MenuItem[] = [
    {
      label: 'Mi Perfil',
      icon: <User size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      label: 'Configuración',
      icon: <Settings size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/configuracion' as any),
    },
    {
      label: 'Impresora',
      icon: <Printer size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/impresora' as any),
    },
    {
      label: 'Notificaciones',
      icon: <Bell size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/notificaciones' as any),
    },
    {
      label: 'Ayuda',
      icon: <HelpCircle size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/ayuda' as any),
    },
    {
      label: 'Acerca de',
      icon: <Info size={20} color="#6b7280" />,
      iconBg: COLORS.background,
      onPress: () => router.push('/(tabs)/acerca' as any),
    },
  ];

  const roleColor = ROLE_COLORS[user?.role || ''] || '#6b7280';

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.profileCard, { paddingTop: insets.top + 16 }]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
            <View style={styles.emailRow}>
              <Mail size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emailText}>{user?.email || ''}</Text>
            </View>
            <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <Badge
                label={ROLE_LABELS[user?.role || ''] || user?.role || 'Usuario'}
                color={COLORS.headerText}
                bgColor="rgba(255,255,255,0.15)"
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Primary Navigation */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Navegación</Text>
        {primaryItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
              {item.icon}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Secondary Navigation */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        {secondaryItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
              {item.icon}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </Animated.View>


      {/* Logout */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityLabel="Cerrar Sesión"
          accessibilityRole="button"
        >
          <LogOut size={20} color={COLORS.headerText} />
          <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <HandyLogo size={24} />
        <Text style={styles.footerBrand}>Handy Suites®</Text>
        <Text style={styles.footerVersion}>
          v{Application.nativeApplicationVersion || '1.0.0'}
        </Text>
      </View>
    </ScrollView>
    <ConfirmModal
      visible={showLogout}
      title="Cerrar Sesión"
      message="¿Estás seguro que deseas cerrar sesión?"
      confirmText="Cerrar Sesión"
      cancelText="Cancelar"
      destructive
      onConfirm={() => { setShowLogout(false); logoutMutation.mutate(); }}
      onCancel={() => setShowLogout(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  profileCard: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: COLORS.headerText },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  emailText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    justifyContent: 'center',
    backgroundColor: COLORS.destructive,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  logoutLabel: { fontSize: 15, fontWeight: '600', color: COLORS.headerText },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerBrand: { fontSize: 14, fontWeight: '600', color: COLORS.textTertiary, marginTop: 6 },
  footerVersion: { fontSize: 12, color: '#cbd5e1' },
});

export default function MasScreen() {
  return (
    <ErrorBoundary componentName="TabMas">
      <MasScreenContent />
    </ErrorBoundary>
  );
}
