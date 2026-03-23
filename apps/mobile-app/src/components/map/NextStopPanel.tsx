import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Navigation, MapPin, ArrowRight } from 'lucide-react-native';
import { formatDistance } from '@/services/geoCheckin';
import { COLORS } from '@/theme/colors';

interface NextStopPanelProps {
  orden: number;
  clienteNombre: string;
  clienteDireccion: string | null;
  latitude: number;
  longitude: number;
  distance: number | null;
  bottomInset: number;
  onCheckIn: () => void;
}

function NextStopPanelInner({
  orden,
  clienteNombre,
  clienteDireccion,
  latitude,
  longitude,
  distance,
  bottomInset,
  onCheckIn,
}: NextStopPanelProps) {
  const handleNavigate = () => {
    const label = encodeURIComponent(clienteNombre);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Parada #{orden}</Text>
        </View>
        {distance != null && (
          <Text style={styles.distance}>~{formatDistance(distance)}</Text>
        )}
      </View>

      <Text style={styles.name}>{clienteNombre}</Text>
      {clienteDireccion && (
        <Text style={styles.address} numberOfLines={1}>{clienteDireccion}</Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
          onPress={handleNavigate}
          activeOpacity={0.85}
        >
          <Navigation size={16} color="#fff" />
          <Text style={styles.actionText}>Navegar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={onCheckIn}
          activeOpacity={0.85}
        >
          <MapPin size={16} color="#fff" />
          <Text style={styles.actionText}>Llegué</Text>
          <ArrowRight size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const NextStopPanel = React.memo(NextStopPanelInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  distance: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  address: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
