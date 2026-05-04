import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuthStore } from '@/stores';
import { useLogout, useUnreadNotificationCount, useUploadAvatar, useDeleteAvatar } from '@/hooks';
import { Card, Button, Badge, ConfirmModal, UserAvatar, BottomSheet } from '@/components/ui';
import { Mail, Shield, Building2, Smartphone, ChevronLeft, Bell, ChevronRight, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
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
  const { count: unreadNotifs } = useUnreadNotificationCount();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const [showLogout, setShowLogout] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  const handleLogout = () => {
    setShowLogout(true);
  };

  const isAvatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;
  const closeAvatarSheet = () => setShowAvatarSheet(false);

  const handleTakePhoto = () => {
    closeAvatarSheet();
    uploadAvatar.mutate('camera');
  };
  const handlePickGallery = () => {
    closeAvatarSheet();
    uploadAvatar.mutate('gallery');
  };
  const handleRemovePhoto = () => {
    closeAvatarSheet();
    deleteAvatar.mutate();
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
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
      </View>

      {/* Overlapping avatar + profile info — tap al avatar abre el sheet de
          cambio de foto. UserAvatar mismo es el componente compartido (mismo
          render que aparece en web). El sync hacia web ocurre vía Cloudinary
          + useProfile en web. */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowAvatarSheet(true)}
          disabled={isAvatarBusy}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil"
          testID="profile-avatar-tap"
        >
          <View style={styles.avatarLargeWrap}>
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size={80}
              badgeRingColor={COLORS.card}
              cacheKey={user.avatarUrl ? Date.now() : undefined}
              testID="profile-avatar-large"
            />
            {/* Camera affordance badge — señaliza que el avatar es tappable.
                Patrón espejo del WhatsApp/Telegram para edit profile photo. */}
            <View style={styles.avatarEditBadge} pointerEvents="none">
              <Camera size={12} color={COLORS.foreground} />
            </View>
            {isAvatarBusy && (
              <View style={styles.avatarLoadingOverlay} pointerEvents="none">
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>
        </TouchableOpacity>
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
        {/* Link directo a notificaciones — el owner pidió este atajo para que
            el vendedor entre rápido a "ver qué está sucediendo" sin tener que
            buscarlo en la tab Más. El badge espeja el count del header. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/notificaciones' as any)}
          testID="profile-notifications-link"
          accessibilityRole="button"
          accessibilityLabel={
            unreadNotifs > 0
              ? `Notificaciones, ${unreadNotifs} sin leer`
              : 'Notificaciones'
          }
        >
          <Card className="mb-3">
            <View style={styles.infoRow}>
              <View style={styles.notifIconWrap}>
                <Bell size={16} color="#f97316" />
                {unreadNotifs > 0 && (
                  <View style={styles.notifBadge} pointerEvents="none">
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Notificaciones</Text>
                <Text style={styles.infoValue}>
                  {unreadNotifs > 0 ? `${unreadNotifs} sin leer` : 'Estás al día'}
                </Text>
              </View>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </View>
          </Card>
        </TouchableOpacity>

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

    <BottomSheet
      visible={showAvatarSheet}
      title="Foto de perfil"
      subtitle="Elige cómo quieres cambiar tu foto"
      onClose={closeAvatarSheet}
    >
      <View style={styles.avatarSheetOptions}>
        <TouchableOpacity
          style={styles.avatarSheetCard}
          onPress={handleTakePhoto}
          activeOpacity={0.85}
          accessibilityLabel="Tomar foto"
          accessibilityRole="button"
          testID="avatar-sheet-camera"
        >
          <Camera size={22} color="#6b7280" />
          <View style={styles.avatarSheetInfo}>
            <Text style={styles.avatarSheetTitle}>Tomar foto</Text>
            <Text style={styles.avatarSheetDesc}>Usar la cámara para tomar una nueva foto</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarSheetCard}
          onPress={handlePickGallery}
          activeOpacity={0.85}
          accessibilityLabel="Elegir de galería"
          accessibilityRole="button"
          testID="avatar-sheet-gallery"
        >
          <ImageIcon size={22} color="#6b7280" />
          <View style={styles.avatarSheetInfo}>
            <Text style={styles.avatarSheetTitle}>Elegir de galería</Text>
            <Text style={styles.avatarSheetDesc}>Seleccionar una foto guardada en tu dispositivo</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {user.avatarUrl && (
          <TouchableOpacity
            style={[styles.avatarSheetCard, styles.avatarSheetCardDanger]}
            onPress={handleRemovePhoto}
            activeOpacity={0.85}
            accessibilityLabel="Quitar foto actual"
            accessibilityRole="button"
            testID="avatar-sheet-delete"
          >
            <Trash2 size={22} color="#dc2626" />
            <View style={styles.avatarSheetInfo}>
              <Text style={[styles.avatarSheetTitle, { color: '#dc2626' }]}>Quitar foto</Text>
              <Text style={styles.avatarSheetDesc}>Volver a las iniciales como avatar</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
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
  avatarLargeWrap: {
    marginBottom: 16,
    padding: 4,
    borderRadius: 48,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 48,
    // 0.55 alcanza el 3:1 de contraste WCAG 1.4.11 para el spinner blanco
    // sobre cualquier avatar/iniciales (validado por frontend-ui-ux-validator).
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSheetOptions: { gap: 12 },
  avatarSheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  avatarSheetCardDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  avatarSheetInfo: { flex: 1 },
  avatarSheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  avatarSheetDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  notifIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff7ed',
    // Android clips children absolutos por default → sin esto el badge
    // (top:-4 right:-4) se corta en Android.
    overflow: 'visible',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
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
