import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useClientsList } from '@/hooks';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { SearchBar } from '@/components/shared/SearchBar';
import { Badge } from '@/components/ui';
import { Phone, MapPin, ChevronRight, Users } from 'lucide-react-native';
import type { MobileCliente } from '@/types';

export default function ClientsListScreen() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useClientsList({ busqueda: search || undefined });

  const clients = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MobileCliente }) => (
      <Card
        className="mx-4 mb-3"
        onPress={() => router.push(`/(tabs)/clients/${item.id}`)}
      >
        <View style={styles.cardRow}>
          <View style={[
            styles.clientAvatar,
            { backgroundColor: item.activo ? '#eff6ff' : '#f1f5f9' },
          ]}>
            <Text style={[
              styles.clientAvatarText,
              { color: item.activo ? '#2563eb' : '#94a3b8' },
            ]}>
              {item.nombre?.[0]?.toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.nombre}
              </Text>
              <Badge
                label={item.activo ? 'Activo' : 'Inactivo'}
                color={item.activo ? '#16a34a' : '#94a3b8'}
                bgColor={item.activo ? '#f0fdf4' : '#f1f5f9'}
              />
            </View>
            <View style={styles.clientMeta}>
              {item.telefono && (
                <View style={styles.metaItem}>
                  <Phone size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{item.telefono}</Text>
                </View>
              )}
              {item.zonaNombre && (
                <View style={styles.metaItem}>
                  <MapPin size={12} color="#94a3b8" />
                  <Text style={styles.metaText}>{item.zonaNombre}</Text>
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

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.footerLoadingText}>Cargando más...</Text>
        </View>
      );
    }
    if (clients.length > 0 && !hasNextPage) {
      return (
        <Text style={styles.footerEnd}>
          Mostrando {clients.length} de {total} clientes
        </Text>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, clients.length, total]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Cargando clientes..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Buscar cliente..."
          onSearch={handleSearch}
        />
        {(total > 0 || clients.length > 0) && (
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {total > 0 ? total : clients.length}
              </Text>
            </View>
            <Text style={styles.countText}>
              cliente{(total || clients.length) !== 1 ? 's' : ''}
              {search ? ` encontrado${(total || clients.length) !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => refetch()}
            tintColor="#2563eb"
            colors={['#2563eb']}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={48} color="#cbd5e1" />}
            title="Sin clientes"
            message={
              search
                ? 'No se encontraron clientes con esa búsqueda'
                : 'No tienes clientes asignados'
            }
          />
        }
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  countBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  countText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
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
    color: '#94a3b8',
  },
  chevron: {
    marginLeft: 4,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  footerEnd: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});
