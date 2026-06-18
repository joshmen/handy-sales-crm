import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import { X, MapPin, Clock, Navigation } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { openInMaps } from '@/utils/maps';

interface UbicacionData {
  latitud: number;
  longitud: number;
  fecha: string;
  clienteNombre?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ubicacion: UbicacionData;
  vendedorNombre: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

/**
 * Modal que muestra en un mapa la última ubicación registrada de un vendedor
 * (un solo pin). El mapa in-app usa react-native-maps (igual que el Mapa del
 * Equipo): en Expo Go puede verse en blanco por falta de API key, pero el botón
 * "Abrir en Maps" abre la app de mapas nativa con el pin en cualquier build.
 */
export function VendedorUbicacionModal({ visible, onClose, ubicacion, vendedorNombre }: Props) {
  const insets = useSafeAreaInsets();

  const region: Region = {
    latitude: ubicacion.latitud,
    longitude: ubicacion.longitud,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };
  const label = ubicacion.clienteNombre ?? vendedorNombre;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar" accessibilityRole="button">
            <X size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Última ubicación</Text>
          <View style={{ width: 32 }} />
        </View>

        <MapView style={styles.map} initialRegion={region} showsPointsOfInterest>
          <Marker
            coordinate={{ latitude: ubicacion.latitud, longitude: ubicacion.longitud }}
            title={label}
            description={formatTimeAgo(ubicacion.fecha)}
            pinColor={COLORS.headerBg}
          />
        </MapView>

        <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.row}>
            <MapPin size={18} color={COLORS.headerBg} />
            <Text style={styles.client} numberOfLines={1}>{ubicacion.clienteNombre ?? vendedorNombre}</Text>
          </View>
          <View style={styles.row}>
            <Clock size={14} color={COLORS.textTertiary} />
            <Text style={styles.time}>
              {formatTimeAgo(ubicacion.fecha)} · {ubicacion.latitud.toFixed(5)}, {ubicacion.longitud.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => openInMaps(ubicacion.latitud, ubicacion.longitud, label)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir en Maps"
          >
            <Navigation size={16} color="#fff" />
            <Text style={styles.openBtnText}>Abrir en Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  map: { flex: 1 },
  bottomCard: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  client: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  time: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.headerBg,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  openBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
