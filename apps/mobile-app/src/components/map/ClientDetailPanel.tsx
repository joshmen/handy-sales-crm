import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { MapPin, Navigation, Phone, ShoppingBag, X } from 'lucide-react-native';
import { getClientMarkerColor } from '@/utils/mapColors';
import { formatDistance } from '@/services/geoCheckin';
import { COLORS } from '@/theme/colors';
import type { MapClient } from '@/hooks/useMapData';

interface ClientDetailPanelProps {
  client: MapClient;
  routeStopMap: Map<string, number>;
  todayVisitSet: Set<string>;
  distance: number | null;
  bottomInset: number;
  onClose: () => void;
  onViewDetail: () => void;
  onSell: () => void;
}

function ClientDetailPanelInner({
  client,
  routeStopMap,
  todayVisitSet,
  distance,
  bottomInset,
  onClose,
  onViewDetail,
  onSell,
}: ClientDetailPanelProps) {
  const markerColor = getClientMarkerColor(client.id, routeStopMap, todayVisitSet, client.activo);
  const isVisitedToday = todayVisitSet.has(client.id);

  const handleNavigate = () => {
    const label = encodeURIComponent(client.nombre);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${client.latitude},${client.longitude}`,
      android: `geo:0,0?q=${client.latitude},${client.longitude}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleCall = () => {
    if (client.telefono) Linking.openURL(`tel:${client.telefono}`);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <View style={styles.header}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <View style={[styles.colorDot, { backgroundColor: markerColor }]} />
            <Text style={styles.name}>{client.nombre}</Text>
            {isVisitedToday && (
              <View style={styles.visitedBadge}>
                <Text style={styles.visitedText}>Visitado</Text>
              </View>
            )}
          </View>
          {client.direccion ? (
            <Text style={styles.address} numberOfLines={1}>{client.direccion}</Text>
          ) : null}
          {distance != null && (
            <Text style={styles.distance}>
              A {formatDistance(distance)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={onViewDetail} activeOpacity={0.85}>
          <MapPin size={16} color="#fff" />
          <Text style={styles.actionText}>Ver detalle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={handleNavigate} activeOpacity={0.85}>
          <Navigation size={16} color="#fff" />
          <Text style={styles.actionText}>Navegar</Text>
        </TouchableOpacity>
        {client.telefono ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={handleCall} activeOpacity={0.85}>
            <Phone size={16} color="#fff" />
            <Text style={styles.actionText}>Llamar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#d97706' }]} onPress={onSell} activeOpacity={0.85}>
            <ShoppingBag size={16} color="#fff" />
            <Text style={styles.actionText}>Vender</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const ClientDetailPanel = React.memo(ClientDetailPanelInner);

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
  header: { flexDirection: 'row', marginBottom: 14 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a', flex: 1 },
  visitedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitedText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  address: { fontSize: 13, color: '#64748b', marginTop: 3 },
  distance: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
