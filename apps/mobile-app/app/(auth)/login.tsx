import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLogin, useForceLogin } from '@/hooks';
import { Button, Input } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Mail, Lock, KeyRound } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { COLORS } from '@/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; totpCode?: string }>({});
  const [showDeviceBoundModal, setShowDeviceBoundModal] = useState(false);
  // TOTP step: cuando el backend retorna TOTP_REQUIRED, mostramos un input
  // para el código y reintentamos el login con totpCode. VULN-M03 fix.
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loginMutation = useLogin();
  const forceLoginMutation = useForceLogin();

  useEffect(() => {
    if (!loginMutation.isError) return;
    const err = loginMutation.error as any;
    if (err?.code === 'DEVICE_BOUND') {
      setShowDeviceBoundModal(true);
      return;
    }
    if (err?.code === 'TOTP_REQUIRED') {
      setTotpRequired(true);
      // Si el usuario ya había ingresado un código (segundo intento fallido),
      // limpiarlo y avisar.
      if (totpCode) {
        setErrors((e) => ({ ...e, totpCode: 'Código inválido' }));
        setTotpCode('');
      }
      return;
    }
    Toast.show({
      type: 'error',
      text1: 'No se pudo iniciar sesión',
      text2: err?.message || 'Intenta de nuevo',
      visibilityTime: 4000,
    });
  }, [loginMutation.isError, loginMutation.error, totpCode]);

  useEffect(() => {
    if (!forceLoginMutation.isError) return;
    const err = forceLoginMutation.error as any;
    if (err?.code === 'TOTP_REQUIRED') {
      setTotpRequired(true);
      if (totpCode) {
        setErrors((e) => ({ ...e, totpCode: 'Código inválido' }));
        setTotpCode('');
      }
      return;
    }
    Toast.show({
      type: 'error',
      text1: 'No se pudo iniciar sesión',
      text2: err?.message || 'Intenta de nuevo',
      visibilityTime: 4000,
    });
  }, [forceLoginMutation.isError, forceLoginMutation.error, totpCode]);

  const handleConfirmForceLogin = () => {
    setShowDeviceBoundModal(false);
    forceLoginMutation.mutate({
      email: email.trim(),
      password,
      totpCode: totpRequired ? totpCode.trim() : undefined,
    });
  };

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Correo inválido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (totpRequired) {
      // En el step TOTP solo validamos el código (email/password ya pasaron).
      const code = totpCode.trim();
      if (!code) {
        setErrors({ totpCode: 'Ingresa el código de tu app de autenticación' });
        return;
      }
      // Acepta TOTP de 6 dígitos o recovery code XXXX-XXXX (8 hex + dash).
      if (!/^\d{6}$/.test(code) && !/^[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}$/.test(code)) {
        setErrors({ totpCode: 'Formato inválido (6 dígitos o XXXX-XXXX)' });
        return;
      }
      loginMutation.mutate({ email: email.trim(), password, totpCode: code });
      return;
    }
    if (!validate()) return;
    loginMutation.mutate({ email: email.trim(), password });
  };

  const handleCancelTotp = () => {
    setTotpRequired(false);
    setTotpCode('');
    setErrors({});
  };

  return (
    <ImageBackground
      source={require('@/../assets/images/onboarding/login-bg.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
      blurRadius={1}
    >
      <View style={styles.bgOverlay} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        {/* Form Card (Pencil design: semi-transparent card over blurred bg) */}
        <View style={styles.formCard}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <HandyLogo size={56} />
            </View>
            <Text style={styles.title}>Handy Suites®</Text>
            <Text style={styles.subtitle}>
              Gestiona tus ventas desde cualquier lugar
            </Text>
          </View>
          <Text style={styles.formTitle}>{totpRequired ? 'Verificación 2FA' : 'Iniciar Sesión'}</Text>

          {!totpRequired && (
            <>
              <Input
                testID="email-input"
                label="Correo electrónico"
                placeholder="tu@empresa.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color="#94a3b8" />}
              />

              <Input
                testID="password-input"
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors((e) => ({ ...e, password: undefined }));
                }}
                error={errors.password}
                secureTextEntry
                leftIcon={<Lock size={18} color="#94a3b8" />}
              />

              {/* Forgot password link */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </>
          )}

          {totpRequired && (
            <>
              <Text style={styles.totpHint}>
                Ingresa el código de 6 dígitos de tu app de autenticación
                (Google Authenticator, Authy, etc.) o un código de recuperación.
              </Text>
              <Input
                testID="totp-input"
                label="Código de verificación"
                placeholder="123456"
                value={totpCode}
                onChangeText={(text) => {
                  setTotpCode(text);
                  if (errors.totpCode) setErrors((e) => ({ ...e, totpCode: undefined }));
                }}
                error={errors.totpCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={9}
                leftIcon={<KeyRound size={18} color="#94a3b8" />}
              />
              <TouchableOpacity onPress={handleCancelTotp} style={styles.forgotLink}>
                <Text style={styles.forgotText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          <Button
            testID="login-button"
            title={totpRequired ? 'Verificar' : 'Iniciar Sesión'}
            onPress={handleLogin}
            loading={loginMutation.isPending || forceLoginMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Handy Suites®
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showDeviceBoundModal}
        title="Sesión activa en otro dispositivo"
        message="Tu cuenta está activa en otro dispositivo. Por seguridad, solo se permite una sesión a la vez. ¿Desconectar el otro dispositivo y continuar aquí?"
        confirmText="Continuar aquí"
        cancelText="Cancelar"
        onConfirm={handleConfirmForceLogin}
        onCancel={() => setShowDeviceBoundModal(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000010',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.headerBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fffffffa',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  totpHint: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#ffffffcc',
    textShadowColor: '#00000060',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
