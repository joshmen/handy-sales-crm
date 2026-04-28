import { View, Text, ScrollView, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineClientById } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: client, isLoading } = useOfflineClientById(id!);

  if (isLoading || !client) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Cargando cliente..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{client.nombre}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

      {/* Overlapping avatar + profile info */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {client.nombre?.[0]?.toUpperCase() || 'C'}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.nombre}</Text>
          {/* Category name not available in offline mode */}
          <View style={styles.badgeRow}>
            <Badge
              label={client.activo ? 'Activo' : 'Inactivo'}
              color={client.activo ? '#16a34a' : '#94a3b8'}
              bgColor={client.activo ? '#dcfce7' : '#f1f5f9'}
              size="md"
            />
          </View>
        </View>
      </Animated.View>

      {/* Contact Info Card */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <Card className="mb-4">
        <Text style={styles.cardTitle}>Información de Contacto</Text>
        <View style={styles.infoList}>
          {client.rfc && (
            <View style={styles.infoRow}>
              <FileText size={14} color="#6b7280" />
              <View>
                <Text style={styles.infoLabel}>RFC</Text>
                <Text style={styles.infoValue}>{client.rfc}</Text>
              </View>
            </View>
          )}
          {client.telefono && (
            <View style={styles.infoRow}>
              <Phone size={14} color="#6b7280" />
              <View>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{client.telefono}</Text>
              </View>
            </View>
          )}
          {client.email && (
            <View style={styles.infoRow}>
              <Mail size={14} color="#6b7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Correo</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{client.email}</Text>
              </View>
            </View>
          )}
          {client.direccion && (
            <View style={styles.infoRow}>
              <MapPin size={14} color="#6b7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{client.direccion}</Text>
              </View>
            </View>
          )}
          {/* Zone name not available in offline mode */}
        </View>
      </Card>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
      <View style={styles.actions}>
        <Button
          title="Editar Cliente"
          onPress={() => router.push(`/(tabs)/clients/crear?editId=${client.id}` as any)}
          variant="primary"
          fullWidth
        />
        {client.telefono && (
          <Button
            title="Llamar"
            onPress={() => Linking.openURL(`tel:${client.telefono}`)}
            variant="outline"
            fullWidth
          />
        )}
        {client.email && (
          <Button
            title="Enviar Correo"
            onPress={() => Linking.openURL(`mailto:${client.email}`)}
            variant="outline"
            fullWidth
          />
        )}
      </View>
      </Animated.View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBack: { width: 32, alignItems: 'center' as const },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.headerText,
    textAlign: 'center' as const,
    flex: 1,
  },
  headerBg: {
    backgroundColor: COLORS.headerBg,
    height: 60,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.headerText,
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  infoList: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    marginTop: 1,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
