import { View, Text, ScrollView, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useClientDetail } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  User,
} from 'lucide-react-native';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: client, isLoading } = useClientDetail(Number(id));

  if (isLoading || !client) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Cargando cliente..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {client.nombre?.[0]?.toUpperCase() || 'C'}
          </Text>
        </View>
        <Text style={styles.clientName}>{client.nombre}</Text>
        {client.categoriaNombre && (
          <Text style={styles.categoryText}>{client.categoriaNombre}</Text>
        )}
        <View style={styles.badgeRow}>
          <Badge
            label={client.activo ? 'Activo' : 'Inactivo'}
            color={client.activo ? '#16a34a' : '#94a3b8'}
            bgColor={client.activo ? '#f0fdf4' : '#f1f5f9'}
            size="md"
          />
        </View>
      </View>

      {/* Contact Info Card */}
      <Card className="mb-4">
        <Text style={styles.cardTitle}>Información de Contacto</Text>
        <View style={styles.infoList}>
          {client.rfc && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#fef3c7' }]}>
                <FileText size={14} color="#d97706" />
              </View>
              <View>
                <Text style={styles.infoLabel}>RFC</Text>
                <Text style={styles.infoValue}>{client.rfc}</Text>
              </View>
            </View>
          )}
          {client.telefono && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#dcfce7' }]}>
                <Phone size={14} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{client.telefono}</Text>
              </View>
            </View>
          )}
          {client.correo && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#dbeafe' }]}>
                <Mail size={14} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Correo</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{client.correo}</Text>
              </View>
            </View>
          )}
          {client.direccion && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#fce7f3' }]}>
                <MapPin size={14} color="#db2777" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{client.direccion}</Text>
              </View>
            </View>
          )}
          {client.zonaNombre && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#ede9fe' }]}>
                <Building2 size={14} color="#7c3aed" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Zona</Text>
                <Text style={styles.infoValue}>{client.zonaNombre}</Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        {client.telefono && (
          <Button
            title="Llamar"
            onPress={() => Linking.openURL(`tel:${client.telefono}`)}
            variant="primary"
            fullWidth
            icon={<Phone size={18} color="#ffffff" />}
          />
        )}
        {client.correo && (
          <Button
            title="Enviar Correo"
            onPress={() => Linking.openURL(`mailto:${client.correo}`)}
            variant="outline"
            fullWidth
            icon={<Mail size={18} color="#2563eb" />}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  badgeRow: {
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
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
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
