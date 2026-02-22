import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { ArrowLeft, KeyRound } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper bg="#ffffff" padTop>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <KeyRound size={40} color="#2563eb" />
        </View>
        <Text style={styles.title}>Recuperar Contraseña</Text>
        <Text style={styles.description}>
          Esta funcionalidad estará disponible próximamente.
          Contacta al administrador para restablecer tu contraseña.
        </Text>
        <Button
          title="Volver al Login"
          onPress={() => router.back()}
          variant="outline"
          fullWidth
          icon={<ArrowLeft size={18} color="#2563eb" />}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
