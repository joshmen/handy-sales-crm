import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineClients } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { SearchBar } from '@/components/shared/SearchBar';
import { Badge } from '@/components/ui';
import { Phone, ChevronRight, ChevronLeft, Users, Plus } from 'lucide-react-native';
import { performSync } from '@/sync/syncEngine';
import type Cliente from '@/db/models/Cliente';
import { COLORS, STATUS_PALETTES } from '@/theme/colors';

export default function ClientsListScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const { data: clients, isLoading } = useOfflineClients(search || undefined);
  const total = clients?.length ?? 0;

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Cliente }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/clients/${item.id}`)}
      >
        <View style={styles.cardRow}>
          <View style={[
            styles.clientAvatar,
            { backgroundColor: item.activo ? COLORS.primaryLight : '#f1f5f9' },
          ]}>
            <Text style={[
              styles.clientAvatarText,
              { color: item.activo ? COLORS.primary : '#94a3b8' },
            ]}>
              {item.nombre?.[0]?.toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.nombre}
              </Text>
              <View style={styles.badgeRow}>
                {item.esProspecto && (
                  <Badge
                    label="Prospecto"
                    color={COLORS.warning}
                    bgColor={STATUS_PALETTES.pending.bg}
                  />
                )}
                <Badge
                  label={item.activo ? 'Activo' : 'Inactivo'}
                  color={item.activo ? COLORS.success : COLORS.textTertiary}
                  bgColor={item.activo ? STATUS_PALETTES.delivered.bg : COLORS.border}
                />
              </View>
            </View>
            <View style={styles.clientMeta}>
              {item.telefono && (
                <View style={styles.metaItem}>
                  <Phone size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{item.telefono}</Text>
                </View>
              )}
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" style={styles.chevron} />
        </View>
      </Card>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando clientes..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with safe area */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clientes</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Buscar cliente..."
          onSearch={handleSearch}
        />
        {total > 0 && (
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total}</Text>
            </View>
            <Text style={styles.countText}>
              cliente{total !== 1 ? 's' : ''}
              {search ? ` encontrado${total !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={clients ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={48} color="#cbd5e1" />}
            title="Sin clientes"
            message={
              search
                ? 'No se encontraron clientes con esa busqueda'
                : 'No tienes clientes asignados'
            }
            actionText={!search ? 'Agregar Cliente' : undefined}
            onAction={!search ? () => router.push('/(tabs)/clients/crear' as any) : undefined}
          />
        }
        ListFooterComponent={
          total > 0 ? (
            <Text style={styles.footerEnd}>
              Mostrando {total} cliente{total !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />

      {/* FAB Nuevo Cliente */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/(tabs)/clients/crear' as any)}
        activeOpacity={0.85}
      >
        <Plus size={24} color={COLORS.headerText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.headerBg,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.headerText,
    letterSpacing: 0.3,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.headerBg,
    zIndex: 10,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.headerText,
  },
  countText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  clientMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  chevron: {
    marginLeft: 4,
  },
  footerEnd: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
