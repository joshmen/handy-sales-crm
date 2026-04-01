import { useState } from 'react';
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
import { useLogin } from '@/hooks';
import { Button, Input } from '@/components/ui';
import { Mail, Lock, AlertCircle } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { COLORS } from '@/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loginMutation = useLogin();

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
    if (!validate()) return;
    loginMutation.mutate({ email: email.trim(), password });
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
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

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

          {/* API Error */}
          {loginMutation.isError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.errorText}>
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : 'Credenciales incorrectas'}
              </Text>
            </View>
          )}

          <Button
            testID="login-button"
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loginMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Handy Suites® — Gestión de ventas en ruta
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
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
