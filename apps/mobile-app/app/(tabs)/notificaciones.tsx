import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, BellOff, CheckCheck } from 'lucide-react-native';
import { EmptyState } from '@/components/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/theme/colors';
import { notificationStore, type StoredNotification } from '@/services/notificationStore';

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

  return new Date(isoDate).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
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
      return null; // Already on this screen
    case 'route.published':
    case 'visit.reminder':
      return '/(tabs)/ruta';
    default:
      return null;
  }
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
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handlePress = useCallback(async (item: StoredNotification) => {
    if (!item.read) {
      await notificationStore.markAsRead(item.id);
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
    const deepLink = getDeepLinkForStoredNotification(item);
    if (deepLink) {
      router.push(deepLink as any);
    }
  }, [router]);

  const handleMarkAllAsRead = useCallback(async () => {
    await notificationStore.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const renderNotification = ({ item, index }: { item: StoredNotification; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
      <TouchableOpacity
        style={[styles.notifItem, !item.read && styles.notifUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
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
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/mas' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn} activeOpacity={0.7}>
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
});

export default function NotificacionesScreen() {
  return (
    <ErrorBoundary componentName="Notificaciones">
      <NotificacionesContent />
    </ErrorBoundary>
  );
}
