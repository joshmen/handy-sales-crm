import { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Megaphone, AlertTriangle, Info, Bell, X } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { api } from '@/api/client';
import { COLORS } from '@/theme/colors';
import { EmptyState } from '@/components/ui';

interface Announcement {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  prioridad: string;
  isDismissible: boolean;
  creadoEn: string;
  expiresAt: string | null;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Critical: { bg: '#fef2f2', text: '#991b1b', icon: '#dc2626' },
  High: { bg: '#fff7ed', text: '#9a3412', icon: '#ea580c' },
  Normal: { bg: '#eff6ff', text: '#1e40af', icon: '#2563eb' },
  Low: { bg: '#f0fdf4', text: '#166534', icon: '#16a34a' },
};

function PriorityIcon({ prioridad, size = 18 }: { prioridad: string; size?: number }) {
  const color = PRIORITY_COLORS[prioridad]?.icon || '#6b7280';
  if (prioridad === 'Critical' || prioridad === 'High') return <AlertTriangle size={size} color={color} />;
  if (prioridad === 'Normal') return <Info size={size} color={color} />;
  return <Bell size={size} color={color} />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export default function AnunciosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get<any>('/api/mobile/announcements');
      setAnnouncements(res.data?.data || []);
    } catch (e) { /* silent */ if (__DEV__) console.warn('[Anuncios]', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const handleDismiss = async (id: number) => {
    try {
      await api.post(`/api/mobile/announcements/${id}/dismiss`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e) { /* silent */ if (__DEV__) console.warn('[Anuncios]', e); }
  };

  const renderItem = ({ item }: { item: Announcement }) => {
    const colors = PRIORITY_COLORS[item.prioridad] || PRIORITY_COLORS.Normal;
    return (
      <View style={[styles.card, { borderLeftColor: colors.icon }]}>
        <View style={styles.cardHeader}>
          <PriorityIcon prioridad={item.prioridad} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
          {item.isDismissible && (
            <TouchableOpacity onPress={() => handleDismiss(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.cardMessage}>{item.mensaje}</Text>
        <Text style={styles.cardTime}>{timeAgo(item.creadoEn)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, alignItems: 'center' }}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anuncios</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon={<Megaphone size={48} color="#cbd5e1" />}
              title="Sin anuncios"
              message="No hay anuncios activos por el momento"
            />
          )
        }
      />
    </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.headerText, textAlign: 'center', flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardMessage: { fontSize: 13, color: '#475569', lineHeight: 19 },
  cardTime: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
});
