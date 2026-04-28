import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown, ChevronUp, Mail, Phone, MessageCircle } from 'lucide-react-native';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '¿Cómo levanto un pedido?',
    answer:
      'Ve a la pestaña "Vender", selecciona un cliente de tu cartera, agrega los productos al carrito y confirma el pedido. El pedido se guardará localmente y se sincronizará cuando tengas conexión.',
  },
  {
    question: '¿Cómo conecto mi impresora?',
    answer:
      'Ve a Más → Impresora. Activa el Bluetooth en tu dispositivo, busca tu impresora en la lista de dispositivos disponibles y selecciónala para conectarla. También puedes conectarte por WiFi ingresando la IP de la impresora.',
  },
  {
    question: '¿Cómo sincronizo mis datos?',
    answer:
      'Los datos se sincronizan automáticamente cuando tienes conexión a internet. Si necesitas forzar la sincronización, ve a Más → Sincronización y presiona el botón "Sincronizar ahora".',
  },
];

function FaqAccordion({ item, index }: { item: FaqItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(300)}>
      <TouchableOpacity
        style={[styles.faqItem, expanded && styles.faqItemExpanded]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityLabel={`FAQ: ${item.question}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          {expanded ? (
            <ChevronUp size={18} color="#94a3b8" />
          ) : (
            <ChevronDown size={18} color="#94a3b8" />
          )}
        </View>
        {expanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

function AyudaContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:soporte@handysuites.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+523312345678');
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
        <Text style={styles.pageTitle}>Ayuda</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
        {FAQ_ITEMS.map((item, index) => (
          <FaqAccordion key={item.question} item={item} index={index} />
        ))}
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacto</Text>

        <Animated.View entering={FadeInDown.delay(250).duration(300)}>
          <TouchableOpacity style={styles.contactItem} onPress={handleEmail} activeOpacity={0.7} accessibilityLabel="Enviar correo a soporte" accessibilityRole="button">
            <View style={[styles.contactIcon, { backgroundColor: COLORS.background }]}>
              <Mail size={18} color="#6b7280" />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Correo electrónico</Text>
              <Text style={styles.contactValue}>soporte@handysuites.com</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(330).duration(300)}>
          <TouchableOpacity style={styles.contactItem} onPress={handlePhone} activeOpacity={0.7} accessibilityLabel="Llamar a soporte" accessibilityRole="button">
            <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
              <Phone size={18} color="#16a34a" />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Teléfono</Text>
              <Text style={styles.contactValue}>(33) 1234-5678</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(410).duration(300)}>
          <View style={styles.contactNote}>
            <MessageCircle size={14} color="#94a3b8" />
            <Text style={styles.contactNoteText}>
              Horario de atención: Lun-Vie 9:00 - 18:00 hrs
            </Text>
          </View>
        </Animated.View>
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
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  faqItem: {
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
  faqItemExpanded: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#fafbff',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 12 },
  faqAnswer: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contactItem: {
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
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactContent: { flex: 1 },
  contactLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contactValue: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  contactNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  contactNoteText: { fontSize: 12, color: '#94a3b8' },
});

export default function AyudaScreen() {
  return (
    <ErrorBoundary componentName="Ayuda">
      <AyudaContent />
    </ErrorBoundary>
  );
}
