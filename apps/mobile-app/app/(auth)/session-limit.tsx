import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Smartphone, Tablet, Monitor, ChevronLeft, Check } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { COLORS } from '@/theme/colors';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores';
import type { MySession } from '@/api/auth';

/**
 * Audit 2026-05-18 — pantalla del flow Netflix/Spotify-style.
 *
 * Llegamos aquí desde login.tsx cuando el backend devolvió
 * SESSION_LIMIT_REACHED (user alcanzó el límite de sesiones concurrentes
 * de su plan). Muestra picker con las sesiones activas; user elige una
 * para revocarla y entrar al app via POST /api/mobile/auth/revoke-and-login.
 *
 * Si el user cancela, regresa a login sin tocar nada server-side.
 */
export default function SessionLimitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    totpCode?: string;
    activeSessions: string;
    maxSessions: string;
  }>();

  const sessions = useMemo<MySession[]>(() => {
    try {
      return JSON.parse(params.activeSessions || '[]');
    } catch {
      return [];
    }
  }, [params.activeSessions]);

  const maxSessions = parseInt(params.maxSessions || '1', 10);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const loginToStore = useAuthStore((s) => s.login);

  const revokeAndLoginMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return authApi.revokeAndLogin(
        params.email,
        params.password,
        sessionId,
        params.totpCode || undefined,
      );
    },
    onSuccess: async (data) => {
      await loginToStore(data.user, data.token, data.refreshToken);
      // Replace navigation: usuario no debe poder hacer "back" al picker.
      router.replace('/(tabs)' as any);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'No se pudo iniciar sesión',
        text2: err?.message || 'Intenta de nuevo',
        visibilityTime: 4000,
      });
    },
  });

  const handleSelect = (sessionId: number) => {
    setSelectedId(sessionId);
  };

  const handleConfirm = () => {
    if (selectedId == null) return;
    revokeAndLoginMutation.mutate(selectedId);
  };

  const handleCancel = () => {
    router.back();
  };

  const formatLastActivity = (iso: string): string => {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      if (diff < 60_000) return 'Hace unos segundos';
      if (diff < 3600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
      if (diff < 86400_000) return `Hace ${Math.floor(diff / 3600_000)} h`;
      const days = Math.floor(diff / 86400_000);
      return days === 1 ? 'Ayer' : `Hace ${days} días`;
    } catch {
      return '';
    }
  };

  const getIcon = (type: string, size = 22) => {
    const t = (type || '').toLowerCase();
    if (t === 'android' || t === 'ios') return <Smartphone size={size} color={COLORS.primary} />;
    if (t === 'tablet') return <Tablet size={size} color={COLORS.primary} />;
    return <Monitor size={size} color={COLORS.primary} />;
  };

  return (
    <ImageBackground
      source={require('@/../assets/images/onboarding/login-bg.png')}
      style={styles.bg}
      imageStyle={styles.bgImage}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleCancel} style={styles.backBtn} accessibilityLabel="Volver">
              <ChevronLeft size={22} color={COLORS.foreground} />
            </TouchableOpacity>
            <View style={styles.logoSlot}>
              <HandyLogo size={36} />
            </View>
            <View style={{ width: 22 }} />
          </View>

          <Text style={styles.title}>Límite de sesiones alcanzado</Text>
          <Text style={styles.subtitle}>
            Tu plan permite {maxSessions} {maxSessions === 1 ? 'sesión activa' : 'sesiones activas'}. Elige una para cerrarla y continuar aquí.
          </Text>

          <View style={styles.sessionsList}>
            {sessions.map((session) => {
              const isSelected = selectedId === session.id;
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
                  onPress={() => handleSelect(session.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.sessionIcon}>{getIcon(session.deviceType)}</View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {session.deviceName || 'Dispositivo'}
                    </Text>
                    <Text style={styles.sessionMeta} numberOfLines={1}>
                      {formatLastActivity(session.lastActivity)}
                      {session.ipCity ? ` · ${session.ipCity}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={16} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, (!selectedId || revokeAndLoginMutation.isPending) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedId || revokeAndLoginMutation.isPending}
            activeOpacity={0.85}
          >
            {revokeAndLoginMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmBtnText}>Desconectar y continuar aquí</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  bgImage: { opacity: 0.45 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  logoSlot: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.foreground, textAlign: 'center', marginTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 20 },
  sessionsList: { gap: 10, marginBottom: 16 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  sessionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  sessionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  sessionMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 13 },
});
