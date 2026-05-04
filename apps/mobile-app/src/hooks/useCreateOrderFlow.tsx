import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, Truck, ChevronRight } from 'lucide-react-native';
import { useOrderDraftStore } from '@/stores';
import { useEmpresa } from '@/hooks/useEmpresa';
import { BottomSheet } from '@/components/ui';
import { COLORS } from '@/theme/colors';

/**
 * Flujo de "crear pedido" reutilizable desde tres entry points:
 * - FAB en tab Vender
 * - Quick action "Nuevo Pedido" en tab Hoy (VendedorDashboard)
 * - Botón "Vender" en panel de cliente del tab Mapa (con cliente preseleccionado)
 *
 * Comportamiento:
 * - Si `empresa.modoVentaDefault === 'Preguntar'`: abre BottomSheet con
 *   "Preventa" / "Venta Directa". Al seleccionar, navega.
 * - Si `'Preventa'` o `'VentaDirecta'`: salta el sheet y navega directo
 *   con el tipo pre-seleccionado (consistente con la config admin que
 *   acelera el flujo).
 * - Si se pasa `clienteId` + `clienteNombre` (caso Mapa), se pasan como
 *   query params al `/vender/crear`. Esa pantalla auto-selecciona el
 *   cliente y salta a productos (lógica YA existente en crear/index.tsx).
 *
 * El hook devuelve:
 * - `openCreateOrder(opts?)` — invocar desde el button onPress
 * - `SheetComponent` — JSX del BottomSheet, renderizar dentro del árbol
 *   del componente que invoca el hook
 *
 * Reportado por vendedor1@jeyma.com 2026-05-04: quick action de Hoy y
 * botón Vender de Mapa saltaban el sheet y/o no preseleccionaban cliente.
 */
export type CreateOrderOpts = { clienteId?: string; clienteNombre?: string };

export function useCreateOrderFlow() {
  const router = useRouter();
  const { setTipoVenta, reset: resetDraft } = useOrderDraftStore();
  const { data: empresa } = useEmpresa();
  const modoDefault = empresa?.modoVentaDefault ?? 'Preguntar';

  const [showSheet, setShowSheet] = useState(false);
  const [pendingCliente, setPendingCliente] = useState<CreateOrderOpts | undefined>(undefined);

  const navigateToCrear = useCallback(
    (tipo: 0 | 1, cliente?: CreateOrderOpts) => {
      resetDraft();
      setTipoVenta(tipo);
      if (cliente?.clienteId) {
        router.push({
          pathname: '/(tabs)/vender/crear',
          params: {
            clienteId: cliente.clienteId,
            clienteNombre: encodeURIComponent(cliente.clienteNombre ?? ''),
          },
        } as any);
      } else {
        router.push('/(tabs)/vender/crear' as any);
      }
    },
    [resetDraft, setTipoVenta, router]
  );

  const openCreateOrder = useCallback(
    (opts?: CreateOrderOpts) => {
      if (modoDefault === 'Preventa') {
        navigateToCrear(0, opts);
        return;
      }
      if (modoDefault === 'VentaDirecta') {
        navigateToCrear(1, opts);
        return;
      }
      setPendingCliente(opts);
      setShowSheet(true);
    },
    [modoDefault, navigateToCrear]
  );

  const handleSelect = useCallback(
    (tipo: 0 | 1) => {
      setShowSheet(false);
      navigateToCrear(tipo, pendingCliente);
      setPendingCliente(undefined);
    },
    [navigateToCrear, pendingCliente]
  );

  const sheetTitle = pendingCliente?.clienteNombre
    ? `Vender a ${pendingCliente.clienteNombre}`
    : '¿Qué tipo de pedido?';

  const SheetComponent = (
    <BottomSheet
      visible={showSheet}
      title={sheetTitle}
      subtitle="Selecciona el tipo de venta"
      onClose={() => {
        setShowSheet(false);
        setPendingCliente(undefined);
      }}
    >
      <View style={styles.options}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSelect(0)}
          activeOpacity={0.85}
          accessibilityLabel="Preventa"
          accessibilityRole="button"
        >
          <ClipboardList size={24} color="#6b7280" />
          <View style={styles.info}>
            <Text style={styles.title}>Preventa</Text>
            <Text style={styles.desc}>Registrar pedido para entrega posterior</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSelect(1)}
          activeOpacity={0.85}
          accessibilityLabel="Venta Directa"
          accessibilityRole="button"
        >
          <Truck size={24} color="#6b7280" />
          <View style={styles.info}>
            <Text style={styles.title}>Venta Directa</Text>
            <Text style={styles.desc}>Vender, cobrar y entregar ahora</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );

  return { openCreateOrder, SheetComponent };
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
