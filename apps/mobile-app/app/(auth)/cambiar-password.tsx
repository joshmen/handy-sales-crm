import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, BackHandler, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores';
import { useLogout } from '@/hooks';
import { authApi } from '@/api/auth';
import { Button, Input, Card } from '@/components/ui';
import { ShieldCheck, KeyRound } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Pantalla de "Cambiar contraseña" forzada al primer login cuando el admin
 * creó al usuario con password temporal (caso vendedor de campo MX sin
 * email — `mustChangePassword=true`). El AuthGate (`app/_layout.tsx`)
 * redirige aquí antes de cualquier otra navegación si la flag está activa.
 *
 * Validaciones espejo del backend `MobileAuthEndpoints.MapPost("/change-password")`:
 * - Min 8 caracteres
 * - 1 minúscula + 1 mayúscula + 1 dígito
 * - Distinta a la actual
 *
 * UX:
 * - Hardware back en Android bloqueado para evitar bypass.
 * - Mensaje claro "por seguridad" para que el usuario entienda por qué se
 *   le obliga a cambiar.
 */
export default function CambiarPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);
  const logoutMutation = useLogout();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Bloquear back hardware en Android — el usuario no puede saltar este step.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(oldPassword, newPassword),
    onSuccess: async () => {
      // Sync local: ya no debe forzar la pantalla en re-renders.
      await setUser({ mustChangePassword: false });
      Toast.show({ type: 'success', text1: 'Contraseña actualizada' });
      router.replace('/(tabs)' as any);
    },
    onError: (e: Error) => {
      setError(e.message || 'No se pudo cambiar la contraseña');
    },
  });

  const validate = (): string | null => {
    if (!oldPassword) return 'Ingresa tu contraseña actual';
    if (newPassword.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
    if (!/[a-z]/.test(newPassword)) return 'Debe contener al menos una letra minúscula';
    if (!/[A-Z]/.test(newPassword)) return 'Debe contener al menos una letra mayúscula';
    if (!/\d/.test(newPassword)) return 'Debe contener al menos un número';
    if (newPassword === oldPassword) return 'La nueva contraseña debe ser distinta a la actual';
    if (newPassword !== confirmPassword) return 'La confirmación no coincide';
    return null;
  };

  const handleSubmit = () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.iconWrap}>
            <ShieldCheck size={32} color={COLORS.headerBg} />
          </View>
          <Text style={styles.title}>Cambia tu contraseña</Text>
          <Text style={styles.subtitle}>
            Tu administrador te creó una contraseña temporal. Por tu seguridad, debes cambiarla ahora antes de continuar.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card className="p-4">
            <Input
              label="Contraseña actual"
              placeholder="La que te dio tu administrador"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              testID="cambiar-pwd-old"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Nueva contraseña"
              placeholder="Mín. 8 caracteres, con mayúscula, minúscula y número"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              testID="cambiar-pwd-new"
            />
            <View style={{ height: 12 }} />
            <Input
              label="Confirmar nueva contraseña"
              placeholder="Repite la nueva contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              testID="cambiar-pwd-confirm"
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
            <Button
              title="Guardar nueva contraseña"
              onPress={handleSubmit}
              loading={mutation.isPending}
              fullWidth
              testID="cambiar-pwd-submit"
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.footer}>
          <KeyRound size={14} color={COLORS.textTertiary} />
          <Text style={styles.footerText}>
            Tu nueva contraseña sustituirá la temporal. Se cerrarán otras sesiones activas.
          </Text>
        </Animated.View>

        {/* Escape de seguridad: si el usuario olvidó la contraseña temporal,
            puede cerrar sesión y pedir a su admin que se la reasigne. Sin esto
            el BackHandler bloqueado lo dejaría atrapado. */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.escapeWrap}>
          <TouchableOpacity
            onPress={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            testID="cambiar-pwd-logout"
          >
            <Text style={styles.escapeText}>
              {logoutMutation.isPending ? 'Cerrando...' : 'Cerrar sesión'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    flex: 1,
  },
  escapeWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  escapeText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textDecorationLine: 'underline',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
