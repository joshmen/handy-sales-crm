import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import { ChevronLeft, ChevronRight, FileText, Shield, Code } from 'lucide-react-native';
import { HandyLogo } from '@/components/shared/HandyLogo';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

const LINKS = [
  {
    label: 'Términos de Servicio',
    icon: <FileText size={18} color="#6b7280" />,
    url: 'https://handysuites.com/terminos',
  },
  {
    label: 'Política de Privacidad',
    icon: <Shield size={18} color="#6b7280" />,
    url: 'https://handysuites.com/privacidad',
  },
  {
    label: 'Licencias Open Source',
    icon: <Code size={18} color="#6b7280" />,
    url: 'https://handysuites.com/licencias',
  },
];

function AcercaContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Acerca de</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* App Info */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.appInfo}>
        <HandyLogo size={64} />
        <Text style={styles.appName}>Handy Suites®</Text>
        <Text style={styles.appVersion}>
          Versión {Application.nativeApplicationVersion || '1.0.0'} ({Application.nativeBuildVersion || '1'})
        </Text>
        <Text style={styles.appDesc}>
          Gestión de ventas en ruta para pequeñas y medianas empresas
        </Text>
      </Animated.View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        {LINKS.map((link, index) => (
          <Animated.View key={link.label} entering={FadeInDown.delay(100 + index * 80).duration(300)}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenLink(link.url)}
              activeOpacity={0.7}
            >
              <View style={styles.linkIcon}>
                {link.icon}
              </View>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} Handy Suites
        </Text>
        <Text style={styles.footerSubtext}>Hecho con orgullo en México</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
  },
  appVersion: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  appDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 280,
  },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  linkItem: {
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
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  footerSubtext: { fontSize: 12, color: '#cbd5e1' },
});

export default function AcercaScreen() {
  return (
    <ErrorBoundary componentName="AcercaDe">
      <AcercaContent />
    </ErrorBoundary>
  );
}
