import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuthStore } from '@/stores';
import { useLogout } from '@/hooks';
import { Card, Button, Badge, ConfirmModal } from '@/components/ui';
import { Mail, Shield, Building2, Smartphone, ChevronLeft } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(true);
  };

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] || '#6b7280';

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Blue header background + back button */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
      </View>

      {/* Overlapping avatar + profile info */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={styles.emailRow}>
          <Mail size={13} color={COLORS.textTertiary} />
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
      </Animated.View>

      {/* Info Cards */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.infoSection}>
        <Card className="mb-3">
          <View style={styles.infoRow}>
            <Shield size={16} color="#6b7280" style={{ marginRight: 12 }} />
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
              <Building2 size={16} color="#6b7280" style={{ marginRight: 12 }} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Empresa</Text>
                <Text style={styles.infoValue}>{user.tenantName}</Text>
              </View>
            </View>
          </Card>
        )}

        <Card className="mb-3">
          <View style={styles.infoRow}>
            <Smartphone size={16} color="#6b7280" style={{ marginRight: 12 }} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Versión</Text>
              <Text style={styles.infoValue}>
                {Application.nativeApplicationVersion || '1.0.0'}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.logoutSection}>
        <Button
          title="Cerrar Sesión"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          loading={logoutMutation.isPending}
        />
      </Animated.View>

      {/* Branding */}
      <View style={styles.branding}>
        <HandyLogo size={24} />
        <Text style={styles.brandText}>Handy Suites®</Text>
        <Text style={styles.brandSubtext}>Gestión de ventas en ruta</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 32,
  },
  headerBg: {
    backgroundColor: COLORS.headerBg,
    height: 140,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4, alignSelf: 'flex-start' },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -50,
    paddingBottom: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.headerText,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.textTertiary,
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
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  brandSubtext: {
    fontSize: 12,
    color: '#cbd5e1',
  },
});
