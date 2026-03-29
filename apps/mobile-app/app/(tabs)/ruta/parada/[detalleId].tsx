import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Linking, StyleSheet, TouchableOpacity, Modal, TextInput, Dimensions, Keyboard, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  useOfflineRutaHoy,
  useOfflineRutaDetalles,
  useOfflineClientById,
  useOfflineOrderById,
  useOfflineOrderDetalles,
} from '@/hooks';
import { useUserLocation } from '@/hooks/useLocation';
import { formatDistance, haversineDistance } from '@/services/geoCheckin';
import { useOrderDraftStore } from '@/stores';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import RutaDetalle from '@/db/models/RutaDetalle';
import Ruta from '@/db/models/Ruta';
import { getGeofenceColor } from '@/utils/mapColors';
import { Card, Button, LoadingSpinner, ConfirmModal } from '@/components/ui';
import { Badge } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { formatTime, formatCurrency } from '@/utils/format';
import {
  MapPin,
  Clock,
  ChevronLeft,
  Package,
  CircleAlert,
  Phone,
  Navigation,
} from 'lucide-react-native';
import { SbRoute, SbWarning } from '@/components/icons/DashboardIcons';
import { GpsMapModal } from '@/components/shared/GpsMapModal';

const STOP_STATUS_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#f59e0b', 2: '#22c55e', 3: '#ef4444',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};

export default function ParadaDetailScreen() {
  const insets = useSafeAreaInsets();
  const { detalleId } = useLocalSearchParams<{ detalleId: string }>();
  const router = useRouter();
  const { location } = useUserLocation();

  const [showError, setShowError] = useState<string | null>(null);
  const [showConfirmEntrega, setShowConfirmEntrega] = useState(false);
  const [showNoEntrega, setShowNoEntrega] = useState(false);
  const [noEntregaReason, setNoEntregaReason] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [showNoVisito, setShowNoVisito] = useState(false);
  const [noVisitoReason, setNoVisitoReason] = useState('');
  const [showGpsModal, setShowGpsModal] = useState(false);

  // Keyboard offset for modals — moves card up when keyboard appears
  const keyboardOffset = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      RNAnimated.timing(keyboardOffset, { toValue: -(e.endCoordinates.height / 2.5), duration: 200, useNativeDriver: true }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      RNAnimated.timing(keyboardOffset, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Get route + stop from WDB
  const { data: rutas, isLoading: rutaLoading } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;
  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const stop = detalles?.find((d) => d.id === detalleId) ?? null;

  // Get client from WDB
  const { data: client } = useOfflineClientById(stop?.clienteId ?? '');

  // Get order data for delivery stops
  const isDeliveryStop = !!stop?.pedidoId;
  const { data: pedido } = useOfflineOrderById(isDeliveryStop ? stop?.pedidoId ?? undefined : undefined);
  const { data: orderDetalles } = useOfflineOrderDetalles(stop?.pedidoId ?? '');

  const clientLat = client?.latitud ?? null;
  const clientLng = client?.longitud ?? null;

  // Compute distance when location and client coords available (memoized)
  const userDistance = useMemo(() => {
    if (!location || !clientLat || !clientLng) return null;
    return Math.round(haversineDistance(location, { latitude: clientLat, longitude: clientLng }));
  }, [location?.latitude, location?.longitude, clientLat, clientLng]);
  const distanceColor = useMemo(() => userDistance != null ? getGeofenceColor(userDistance) : '#94a3b8', [userDistance]);

  const handleNavegar = useCallback(() => {
    if (clientLat && clientLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clientLat},${clientLng}`;
      Linking.openURL(url);
    }
  }, [clientLat, clientLng]);

  // Auto-start route if still Planificada (offline-first, sync will push later)
  useEffect(() => {
    if (!route) return;
    database.get<Ruta>('rutas').find(route.id).then((freshRoute) => {
      if (freshRoute.estado === 0) freshRoute.startRoute().catch(() => {});
    }).catch(() => {});
  }, [route?.id]);

  // Auto GPS check-in on mount for Pendiente stops
  useEffect(() => {
    if (!stop || !location || stop.estado !== 0) return;
    stop.arrive(location.latitude, location.longitude).catch(() => {});
  }, [stop?.id, location]);

  const handleLlamar = useCallback(() => {
    if (client?.telefono) {
      Linking.openURL(`tel:${client.telefono}`);
    }
  }, [client]);

  // Auto-complete route when all stops are attended (visited or skipped)
  const checkAutoCompleteRoute = useCallback(async () => {
    if (!route || route.estado === 2) return;
    const allStops = await database.get<RutaDetalle>('ruta_detalles')
      .query(Q.where('ruta_id', route.id), Q.sortBy('orden', Q.asc)).fetch();
    const allAttended = allStops.length > 0 && allStops.every((s) => s.estado === 2 || s.estado === 3);
    if (allAttended) {
      // Calculate km from GPS coords of visited stops
      const hd = haversineDistance;
      const visited = allStops.filter((s) => s.latitudLlegada != null && s.longitudLlegada != null);
      let totalMeters = 0;
      for (let i = 1; i < visited.length; i++) {
        totalMeters += hd(
          { latitude: visited[i - 1].latitudLlegada!, longitude: visited[i - 1].longitudLlegada! },
          { latitude: visited[i].latitudLlegada!, longitude: visited[i].longitudLlegada! },
        );
      }
      const km = Math.round((totalMeters / 1000) * 10) / 10;
      const freshRoute = await database.get<Ruta>('rutas').find(route.id);
      await freshRoute.completeRoute(km);
    }
  }, [route?.id, route?.estado]);

  const executeNoVisito = useCallback(async () => {
    setShowNoVisito(false);
    const reason = noVisitoReason || 'No se visitó';
    try {
      const freshStop = await database.get<RutaDetalle>('ruta_detalles').find(detalleId);
      await freshStop.skip(reason);
      await checkAutoCompleteRoute();
      setNoVisitoReason('');
      router.back();
    } catch {
      setShowError('No se pudo marcar la parada.');
    }
  }, [detalleId, noVisitoReason, router, checkAutoCompleteRoute]);

  const executeConfirmarEntrega = useCallback(async () => {
    setShowConfirmEntrega(false);
    setDelivering(true);
    try {
      // 1. Update local (WDB sync will push to server automatically)
      if (stop) await stop.depart();
      await checkAutoCompleteRoute();

      // 2. Navigate to receipt screen with order data
      router.replace({
        pathname: '/(tabs)/cobrar/recibo',
        params: {
          clienteNombre: encodeURIComponent(client?.nombre || 'Cliente'),
          monto: String(pedido?.total ?? 0),
          metodoPago: '0',
          referencia: '',
          notas: encodeURIComponent(`Entrega pedido ${pedido?.numeroPedido ?? ''}`),
          fecha: new Date().toISOString(),
          fromVentaDirecta: '1',
          fromEntrega: '1',
          pedidoId: pedido?.id ?? '',
        },
      } as any);
    } catch {
      setShowError('No se pudo confirmar la entrega. Intenta de nuevo.');
    } finally {
      setDelivering(false);
    }
  }, [pedido, stop, router, checkAutoCompleteRoute]);

  const executeNoEntrega = useCallback(async () => {
    setShowNoEntrega(false);
    const reason = noEntregaReason || 'No se entregó';
    setDelivering(true);
    try {
      const freshStop = await database.get<RutaDetalle>('ruta_detalles').find(detalleId);
      await freshStop.skip(reason);
      await checkAutoCompleteRoute();
      setNoEntregaReason('');
      router.back();
    } catch {
      setShowError('No se pudo omitir la parada.');
    } finally {
      setDelivering(false);
    }
  }, [detalleId, noEntregaReason, router, checkAutoCompleteRoute]);

  if (rutaLoading || !route) {
    return <View style={styles.container}><LoadingSpinner message="Cargando..." /></View>;
  }

  if (!stop) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Parada no encontrada</Text>
        </View>
      </View>
    );
  }

  const isPendiente = stop.estado === 0;
  const isEnProgreso = stop.estado === 1;
  const statusColor = STOP_STATUS_COLORS[stop.estado] || '#6b7280';

  return (
    <View style={styles.container}>
    {/* Blue Header */}
    <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ChevronLeft size={22} color={COLORS.headerText} />
      </TouchableOpacity>
      <Text style={styles.blueHeaderTitle}>Parada #{stop.orden}</Text>
      <Badge
        label={STOP_STATUS_NAMES[stop.estado] || 'Desconocido'}
        color={statusColor}
        bgColor={`${statusColor}25`}
        size="md"
      />
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* GPS Missing Banner */}
      {!clientLat && !clientLng && location && (
        <Animated.View entering={FadeInDown.duration(400)}>
        <TouchableOpacity
          style={styles.gpsBanner}
          activeOpacity={0.7}
          onPress={() => {
            if (!location) return;
            setShowGpsModal(true);
          }}
        >
          <MapPin size={16} color="#ef4444" />
          <Text style={styles.gpsBannerText}>Este cliente no tiene ubicacion GPS</Text>
          <Text style={styles.gpsBannerAction}>Agregar</Text>
        </TouchableOpacity>
        </Animated.View>
      )}

      {/* Mini Map */}
      {clientLat && clientLng && (
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            initialRegion={{
              latitude: clientLat,
              longitude: clientLng,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation
          >
            <Marker coordinate={{ latitude: clientLat, longitude: clientLng }} pinColor="COLORS.primary" />
            <Circle
              center={{ latitude: clientLat, longitude: clientLng }}
              radius={200}
              fillColor="rgba(37,99,235,0.08)"
              strokeColor="rgba(37,99,235,0.25)"
              strokeWidth={1}
            />
          </MapView>
          {userDistance != null && (
            <View style={[styles.distanceBadge, { backgroundColor: distanceColor + '15', borderColor: distanceColor + '40' }]}>
              <MapPin size={12} color={distanceColor} />
              <Text style={[styles.distanceText, { color: distanceColor }]}>
                A {formatDistance(userDistance)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Status Banner */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
          <Badge
            label={STOP_STATUS_NAMES[stop.estado] || 'Desconocido'}
            color={statusColor}
            bgColor={`${statusColor}25`}
            size="md"
          />
          <Text style={[styles.statusOrder, { color: statusColor }]}>
            Parada #{stop.orden}
          </Text>
        </View>
      </Animated.View>

      {/* Client Info */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <Card className="mx-4 mb-3">
        <Text style={styles.cardLabel}>Cliente</Text>
        <Text style={styles.clientName}>{client?.nombre ?? 'Cargando...'}</Text>

        {client?.direccion && (
          <View style={styles.infoRow}>
            <MapPin size={14} color="#94a3b8" />
            <Text style={styles.infoText}>{client.direccion}</Text>
          </View>
        )}

        {stop.horaLlegada && (
          <View style={styles.infoRow}>
            <Clock size={14} color="#94a3b8" />
            <Text style={styles.infoText}>Llegada: {formatTime(stop.horaLlegada)}</Text>
          </View>
        )}
      </Card>
      </Animated.View>

      {/* Llamar + Navegar buttons */}
      {(client?.telefono || (clientLat && clientLng)) && (
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <View style={styles.actionRow}>
          {client?.telefono && (
            <TouchableOpacity
              style={[styles.outlineButtonGray, { flex: 1 }]}
              onPress={handleLlamar}
              activeOpacity={0.7}
            >
              <Phone size={16} color="#64748b" />
              <Text style={styles.outlineButtonGrayText}>Llamar</Text>
            </TouchableOpacity>
          )}
          {clientLat && clientLng && (
            <TouchableOpacity
              style={[styles.outlineButtonGray, { flex: 1 }]}
              onPress={handleNavegar}
              activeOpacity={0.7}
            >
              <Navigation size={16} color="#64748b" />
              <Text style={styles.outlineButtonGrayText}>Navegar</Text>
            </TouchableOpacity>
          )}
        </View>
        </Animated.View>
      )}

      {/* === DELIVERY STOP: Order details + delivery buttons === */}
      {isDeliveryStop && (isPendiente || isEnProgreso) && (
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <Card className="mx-4 mb-3">
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIconCircle}>
              <Package size={18} color="#1565C0" />
            </View>
            <Text style={styles.orderHeaderTitle}>
              PEDIDO #{pedido?.numeroPedido ?? '---'}
            </Text>
          </View>

          {/* Product List */}
          {orderDetalles && orderDetalles.length > 0 ? (
            <View style={styles.productList}>
              {orderDetalles.map((item) => (
                <View key={item.id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productoNombre}
                    </Text>
                    <Text style={styles.productQty}>
                      {item.cantidad} × {formatCurrency(item.precioUnitario)}
                    </Text>
                  </View>
                  <Text style={styles.productSubtotal}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyProducts}>Cargando productos...</Text>
          )}

          {/* Total */}
          <View style={styles.orderTotalRow}>
            <Text style={styles.orderTotalLabel}>Total</Text>
            <Text style={styles.orderTotalValue}>
              {formatCurrency(pedido?.total ?? 0)}
            </Text>
          </View>
        </Card>
        </Animated.View>
      )}

      {/* Delivery Action Buttons */}
      {isDeliveryStop && (isPendiente || isEnProgreso) && (
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <View style={styles.quickActions}>
          {/* Primary: Confirmar Entrega */}
          <Button
            title="Confirmar Entrega"
            onPress={() => setShowConfirmEntrega(true)}
            loading={delivering}
            fullWidth
            icon={<Package size={18} color="#ffffff" />}
          />
          {/* No se entregó */}
          <TouchableOpacity
            style={styles.outlineButtonRed}
            onPress={() => setShowNoEntrega(true)}
            activeOpacity={0.7}
          >
            <CircleAlert size={16} color="#E11D48" />
            <Text style={styles.outlineButtonRedText}>No se entregó</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      )}

      {/* === PREVENTA STOP: Original quick actions === */}
      {!isDeliveryStop && (isPendiente || isEnProgreso) && (
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <View style={styles.quickActions}>
          <Button
            title="Nuevo Pedido"
            onPress={() => {
              const store = useOrderDraftStore.getState();
              store.setCliente(stop.clienteId, client?.serverId ?? Number(stop.clienteId), client?.nombre || 'Cliente');
              store.setFromParada(detalleId);
              router.push(`/(tabs)/vender/crear/modo?fromParada=${detalleId}` as any);
            }}
            variant="secondary"
            fullWidth
          />
          <Button
            title="Registrar Cobro"
            onPress={() => router.push(`/(tabs)/cobrar/registrar?clienteId=${stop.clienteId}&clienteNombre=${encodeURIComponent(client?.nombre ?? '')}&saldo=0&fromRuta=1&paradaId=${detalleId}` as any)}
            variant="secondary"
            fullWidth
          />
          <Button
            title="No se visitó"
            onPress={() => setShowNoVisito(true)}
            variant="outline"
            fullWidth
          />
        </View>
        </Animated.View>
      )}

      {stop.notas && (
        <Card className="mx-4 mb-3">
          <Text style={styles.cardLabel}>Notas</Text>
          <Text style={styles.notesText}>{stop.notas}</Text>
        </Card>
      )}

      {/* No se visitó Modal (preventa) */}
      <Modal
        visible={showNoVisito}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowNoVisito(false); setNoVisitoReason(''); }}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <RNAnimated.View style={[styles.modalCard, { transform: [{ translateY: keyboardOffset }] }]}>
            <SbWarning size={48} />
            <Text style={styles.modalTitle}>No se visitó</Text>
            <Text style={styles.modalMessage}>Indica el motivo (minimo 10 caracteres):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Cliente cerrado, no habia quien recibiera..."
              placeholderTextColor="#94a3b8"
              value={noVisitoReason}
              onChangeText={setNoVisitoReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {noVisitoReason.length > 0 && noVisitoReason.length < 10 && (
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: -14, marginBottom: 10, alignSelf: 'flex-end' }}>
                {10 - noVisitoReason.length} caracteres mas
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNoVisito(false); setNoVisitoReason(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, noVisitoReason.length < 10 && { opacity: 0.4 }]}
                onPress={executeNoVisito}
                disabled={noVisitoReason.length < 10}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </View>
      </Modal>

      {/* Confirm Entrega Modal (delivery) */}
      <ConfirmModal
        visible={showConfirmEntrega}
        title="Confirmar Entrega"
        message={`¿Confirmas la entrega del pedido #${pedido?.numeroPedido ?? ''} a ${client?.nombre ?? 'este cliente'}?`}
        confirmText="Sí, entregar"
        onConfirm={executeConfirmarEntrega}
        onCancel={() => setShowConfirmEntrega(false)}
      />

      {/* No Entrega Modal — custom with TextInput */}
      <Modal
        visible={showNoEntrega}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowNoEntrega(false); setNoEntregaReason(''); }}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <RNAnimated.View style={[styles.modalCard, { transform: [{ translateY: keyboardOffset }] }]}>
            <SbWarning size={48} />
            <Text style={styles.modalTitle}>No se entregó</Text>
            <Text style={styles.modalMessage}>Indica el motivo (minimo 10 caracteres):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Cliente cerrado, no habia quien recibiera..."
              placeholderTextColor="#94a3b8"
              value={noEntregaReason}
              onChangeText={setNoEntregaReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {noEntregaReason.length > 0 && noEntregaReason.length < 10 && (
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: -14, marginBottom: 10, alignSelf: 'flex-end' }}>
                {10 - noEntregaReason.length} caracteres mas
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNoEntrega(false); setNoEntregaReason(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, noEntregaReason.length < 10 && { opacity: 0.4 }]}
                onPress={executeNoEntrega}
                disabled={noEntregaReason.length < 10}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </View>
      </Modal>

      {/* GPS Location Modal */}
      {location && (
        <GpsMapModal
          visible={showGpsModal}
          initialCoord={{ latitude: location.latitude, longitude: location.longitude }}
          clientName={client?.nombre}
          onConfirm={async (coord) => {
            if (!client) return;
            try {
              await client.updateFields({ latitud: coord.latitude, longitud: coord.longitude });
              setShowGpsModal(false);
              setShowError('Ubicacion de ' + (client.nombre ?? 'cliente') + ' guardada correctamente');
            } catch {
              setShowError('No se pudo guardar la ubicacion');
            }
          }}
          onCancel={() => setShowGpsModal(false)}
        />
      )}

      {/* Error/Aviso Modal */}
      <ConfirmModal
        visible={!!showError}
        title="Aviso"
        message={showError ?? ''}
        confirmText="Aceptar"
        onConfirm={() => setShowError(null)}
        onCancel={() => setShowError(null)}
        cancelText=""
        icon={<SbRoute size={48} />}
      />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  blueHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.headerText },
  content: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  gpsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
  },
  gpsBannerText: { flex: 1, fontSize: 12, color: '#991b1b', fontWeight: '500' },
  gpsBannerAction: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  miniMapContainer: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  miniMap: { height: 160, borderRadius: 16 },
  distanceBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  distanceText: { fontSize: 12, fontWeight: '700' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusOrder: { fontSize: 14, fontWeight: '700' },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoText: { fontSize: 13, color: '#64748b', flex: 1 },
  quickActions: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  // Delivery stop — order card
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565C0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productList: {
    gap: 10,
    marginBottom: 14,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  productQty: {
    fontSize: 12,
    color: '#94a3b8',
  },
  productSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  emptyProducts: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: '#e2e8f0',
  },
  orderTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },

  // Delivery action buttons
  outlineButtonRed: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E11D48',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  outlineButtonRedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E11D48',
  },

  outlineButtonGray: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  outlineButtonGrayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  // Custom modal for "No se entrego" with TextInput
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000050',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: Math.min(Dimensions.get('window').width - 64, 340),
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalInput: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
