import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react-native';
import { EmptyState } from '@/components/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';
import { notificationStore, type StoredNotification } from '@/services/notificationStore';
import { syncNotificationsFromBackend } from '@/services/notificationSync';
import Toast from 'react-native-toast-message';

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'Ahora';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Hace un momento';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hr${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Hace 1 semana';
  if (weeks < 5) return `Hace ${weeks} semanas`;

  // Para notificaciones de >5 semanas usamos Intl con locale del runtime
  // (la función es global, no hook — no podemos leer tenant TZ aquí; el
  // formato corto día+mes no es crítico para audit)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoDate));
}

// ---------------------------------------------------------------------------
// Build deep link from stored notification (mirrors pushNotifications.ts logic)
// ---------------------------------------------------------------------------
function getDeepLinkForStoredNotification(n: StoredNotification): string | null {
  const { type, entityId } = n;
  const safeEntityId = entityId && /^\d+$/.test(entityId) ? entityId : null;

  switch (type) {
    case 'order.new':       // Legacy — kept for backwards compat with older push payloads
    case 'order.confirmed':
    case 'order.processing': // Legacy — kept for backwards compat with older push payloads
    case 'order.en_route':
    case 'order.delivered':
    case 'order.cancelled':
    case 'order.assigned':
    case 'order.status_changed':
      return safeEntityId ? `/(tabs)/vender/${safeEntityId}` : '/(tabs)/vender';
    case 'cobro.new':
      return safeEntityId ? `/(tabs)/cobrar/detalle-cobro/${safeEntityId}` : '/(tabs)/cobrar';
    case 'stock.low':
      return safeEntityId ? `/(tabs)/vender/producto/${safeEntityId}` : '/(tabs)/vender';
    case 'goal.assigned':
    case 'goal.achieved':
      return '/(tabs)';
    case 'announcement':
      // Reportado admin@jeyma.com 2026-05-04: tap en notif de anuncio no
      // hacía nada. Antes esto retornaba null asumiendo "ya estás en este
      // screen", pero notificaciones es un screen distinto al de anuncios.
      return '/(tabs)/anuncios';
    case 'route.published':
    case 'route.assigned':
    case 'route.closed-by-admin':
    case 'visit.reminder':
      return '/(tabs)/ruta';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Swipeable item — swipe-to-left revela botón trash. Implementado con
// PanResponder + Animated (RN core) para no requerir react-native-gesture-handler
// (no instalado en el proyecto y agregar deps nativas requiere `eas build`,
// no OTA). Threshold: -80px para revelar; -160 auto-cierra y elimina con
// fade-out.
// ---------------------------------------------------------------------------
const SWIPE_THRESHOLD_REVEAL = -80;
const SWIPE_THRESHOLD_DELETE = -180;
const ACTION_WIDTH = 88;

interface SwipeableNotifItemProps {
  item: StoredNotification;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}

function SwipeableNotifItem({ item, onPress, onDelete, index }: SwipeableNotifItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Solo responder a movimientos horizontales claros — no robar el scroll vertical de la lista.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        // Solo permitir swipe a la izquierda (dx negativo) — clamp a 0 para derecha.
        const clamped = Math.min(0, Math.max(g.dx, -ACTION_WIDTH * 2.5));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD_DELETE) {
          // Swipe muy fuerte → animar fuera y eliminar.
          Animated.parallel([
            Animated.timing(translateX, { toValue: -500, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onDelete());
          return;
        }
        if (g.dx < SWIPE_THRESHOLD_REVEAL) {
          // Swipe moderado → mantener revelado.
          isOpen.current = true;
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        } else {
          // Insuficiente → cerrar.
          isOpen.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Si otro responder gana (e.g. scroll), cerrar.
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    })
  ).current;

  const handleDeleteTap = () => {
    // Animar fade-out + slide-out para feedback visual claro.
    Animated.parallel([
      Animated.timing(translateX, { toValue: -500, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDelete());
  };

  const handleItemPress = () => {
    if (isOpen.current) {
      // Si está revelado, primer tap cierra (no abre el deep link).
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      isOpen.current = false;
      return;
    }
    onPress();
  };

  return (
    <Reanimated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)} style={{ position: 'relative' }}>
      {/* Capa background con botón trash a la derecha. */}
      <View style={styles.swipeActions} pointerEvents="box-none">
        <TouchableOpacity
          onPress={handleDeleteTap}
          style={styles.deleteAction}
          accessibilityLabel="Eliminar notificación"
          accessibilityRole="button"
        >
          <Trash2 size={22} color="#fff" />
          <Text style={styles.deleteActionLabel}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      {/* Capa item — se desplaza horizontal con PanResponder. */}
      <Animated.View
        style={[{ transform: [{ translateX }], opacity }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.notifItem, !item.read && styles.notifUnread]}
          onPress={handleItemPress}
          activeOpacity={0.7}
          accessibilityLabel={`Notificación: ${item.title}${!item.read ? ' (sin leer)' : ''}`}
          accessibilityRole="button"
        >
          <View style={styles.notifRow}>
            {!item.read && <View style={styles.unreadDot} />}
            <View style={[styles.notifIcon, { backgroundColor: !item.read ? COLORS.primaryLight : '#f1f5f9' }]}>
              <Bell size={18} color={!item.read ? COLORS.primary : '#94a3b8'} />
            </View>
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.notifTime}>{formatRelativeTime(item.receivedAt)}</Text>
              </View>
              <Text style={styles.notifMessage} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Reanimated.View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function NotificacionesContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const items = await notificationStore.getAll();
      setNotifications(items);
    } catch {
      // Silently ignore storage errors
    }
  }, []);

  useEffect(() => {
    // Al abrir la tab: cargar local + sync backend en background. Si llega un
    // push live mientras hacíamos sync, se dedupea por nhId en el store.
    loadNotifications();
    // Suscribirse a cambios del store: cuando llega push live (vía
    // usePushNotifications) o sync incremental (SignalR ReceiveNotification),
    // el store notifica a todos los listeners y la pantalla se actualiza
    // sin necesidad de pull-to-refresh manual.
    const unsubscribe = notificationStore.subscribe(() => loadNotifications());
    syncNotificationsFromBackend().catch(() => { /* sync best-effort */ });
    return unsubscribe;
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Pull-to-refresh: traer lo último del backend antes de releer el store.
    await syncNotificationsFromBackend();
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handlePress = useCallback(async (item: StoredNotification) => {
    if (!item.read) {
      await notificationStore.markAsRead(item.id);
      // No setNotifications optimista — el subscribe ya recarga.
    }
    const deepLink = getDeepLinkForStoredNotification(item);
    if (deepLink) {
      router.push(deepLink as any);
    } else {
      // Fallback: tipo de notificación sin destino mapeado. Reportado
      // admin@jeyma.com 2026-05-04: tap silencioso confundía al user.
      // Texto neutral: el user puede pensar "error de navegación" si decimos
      // "no tiene detalle". Mejor "solo informativa" — no es error, es by design.
      Toast.show({
        type: 'info',
        text1: item.title || 'Notificación',
        text2: item.body || 'Notificación solo informativa',
        visibilityTime: 4000,
      });
    }
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    await notificationStore.removeById(id);
    // El subscribe se encarga de recargar la lista — no hace falta setNotifications.
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await notificationStore.markAllAsRead();
  }, []);

  const renderNotification = ({ item, index }: { item: StoredNotification; index: number }) => (
    <SwipeableNotifItem
      item={item}
      index={index}
      onPress={() => handlePress(item)}
      onDelete={() => handleDelete(item.id)}
    />
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn} activeOpacity={0.7} accessibilityLabel="Marcar todas como leídas" accessibilityRole="button">
            <CheckCheck size={16} color={COLORS.headerText} />
            <Text style={styles.markAllText}>Leer todo</Text>
          </TouchableOpacity>
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderNotification}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<BellOff size={40} color="#cbd5e1" />}
            title="No tienes notificaciones"
            message="Las notificaciones de pedidos, cobros y rutas aparecerán aquí."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText, flex: 1 },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.headerText,
    marginLeft: 4,
  },
  unreadBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.headerText },
  list: { paddingVertical: 8 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  notifItem: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notifUnread: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    left: -4,
    top: 16,
    zIndex: 1,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  notifTitleUnread: { fontWeight: '700', color: '#0f172a' },
  notifTime: { fontSize: 11, color: '#94a3b8' },
  notifMessage: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  // Swipe action background
  swipeActions: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    right: 16,
    width: ACTION_WIDTH,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  deleteAction: {
    flex: 1,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  deleteActionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default function NotificacionesScreen() {
  return (
    <ErrorBoundary componentName="Notificaciones">
      <NotificacionesContent />
    </ErrorBoundary>
  );
}
