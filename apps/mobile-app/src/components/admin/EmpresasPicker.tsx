import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Search, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { adminApi, type AdminTenant } from '@/api/admin';
import { enterTenant } from '@/services/impersonation';
import { ConfirmModal } from '@/components/ui';
import { COLORS } from '@/theme/colors';

/**
 * Pantalla "Empresas" del super admin móvil (Parte B). Lista los tenants y, al
 * elegir uno, entra en modo soporte READ_ONLY (impersonation). No muestra ningún
 * dashboard de tenant hasta elegir — espejo del comportamiento de la web.
 */
export function EmpresasPicker() {
  const insets = useSafeAreaInsets();
  const userName = useAuthStore(s => s.user?.name);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.listTenants();
      setTenants(data);
    } catch {
      setError('No se pudieron cargar las empresas. Verifica tu conexión.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? tenants.filter(t => t.nombre.toLowerCase().includes(query.trim().toLowerCase()))
    : tenants;

  const onConfirmEnter = async () => {
    if (!selected) return;
    const t = selected;
    setSelected(null);
    setEntering(true);
    try {
      await enterTenant({ id: t.id, nombre: t.nombre });
      // El routing (HoyScreenContent) re-renderiza al AdminDashboard del tenant
      // cuando impersonation deja de ser null. No navegamos manualmente.
    } catch {
      setError(`No se pudo entrar a ${t.nombre}.`);
      setEntering(false);
    }
  };

  const renderItem = ({ item }: { item: AdminTenant }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setSelected(item)}>
      <View style={styles.cardIcon}><Building2 size={20} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.cardMeta}>
          {item.plan ? `${item.plan} · ` : ''}{item.usuarios} usuario{item.usuarios === 1 ? '' : 's'}
          {item.activo ? '' : ' · Inactiva'}
        </Text>
      </View>
      <ChevronRight size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>Empresas</Text>
        <Text style={styles.sub}>{userName ? `${userName} · ` : ''}Elige una empresa para ver sus datos</Text>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar empresa..."
            placeholderTextColor={COLORS.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error && tenants.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Sin empresas que coincidan</Text></View>}
        />
      )}

      <ConfirmModal
        visible={!!selected}
        title={selected ? `¿Entrar a ${selected.nombre}?` : ''}
        message="Verás los datos de esta empresa en modo solo lectura (soporte). Tu acceso queda auditado."
        confirmText="Entrar"
        cancelText="Cancelar"
        onConfirm={onConfirmEnter}
        onCancel={() => setSelected(null)}
      />

      {entering && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.overlayText}>Entrando a la empresa...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 18 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.headerText },
  sub: { fontSize: 13, color: COLORS.headerText, opacity: 0.85, marginTop: 2, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, color: COLORS.headerText, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.foreground },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
