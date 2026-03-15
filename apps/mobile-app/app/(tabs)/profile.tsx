import { View, Text, Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuthStore } from '@/stores';
import { useLogout } from '@/hooks';
import { Card, Button, Badge } from '@/components/ui';
import { Mail, LogOut, Info, Shield, Building2, Smartphone } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  VENDEDOR: 'Vendedor',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN: '#2563eb',
  SUPERVISOR: '#d97706',
  VENDEDOR: '#16a34a',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
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

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] || '#6b7280';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={styles.emailRow}>
          <Mail size={13} color="#94a3b8" />
          <Text style={styles.emailText}>{user.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Badge
            label={ROLE_LABELS[user.role] || user.role}
            color={roleColor}
            bgColor={`${roleColor}15`}
            size="md"
          />
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <Card className="mb-3">
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#ede9fe' }]}>
              <Shield size={16} color="#7c3aed" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>
                {ROLE_LABELS[user.role] || user.role}
              </Text>
            </View>
          </View>
        </Card>

        {user.tenantName && (
          <Card className="mb-3">
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#dbeafe' }]}>
                <Building2 size={16} color="#2563eb" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Empresa</Text>
                <Text style={styles.infoValue}>{user.tenantName}</Text>
              </View>
            </View>
          </Card>
        )}

        <Card className="mb-3">
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
              <Smartphone size={16} color="#16a34a" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Versión</Text>
              <Text style={styles.infoValue}>
                {Application.nativeApplicationVersion || '1.0.0'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <Button
          title="Cerrar Sesión"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          loading={logoutMutation.isPending}
          icon={<LogOut size={18} color="#ffffff" />}
        />
      </View>

      {/* Branding */}
      <View style={styles.branding}>
        <HandyLogo size={24} />
        <Text style={styles.brandText}>Handy Suites®</Text>
        <Text style={styles.brandSubtext}>Gestión de ventas en ruta</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  roleBadge: {
    marginTop: 12,
  },
  infoSection: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 1,
  },
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  branding: {
    alignItems: 'center',
    paddingBottom: 16,
    gap: 4,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 6,
  },
  brandSubtext: {
    fontSize: 12,
    color: '#cbd5e1',
  },
});
