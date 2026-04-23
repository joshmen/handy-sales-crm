import { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { CheckCircle } from 'lucide-react-native';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import { useOfflineOrderById, useOfflineOrderDetalles, useClientNameMap } from '@/hooks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuthStore } from '@/stores';
import { usePrinterStore } from '@/stores/printerStore';
import { printOrderTicket, isNativeAvailable } from '@/services/printerService';

export default function PedidoExitoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { numero, id, tipo, fromRuta } = useLocalSearchParams<{ numero: string; id: string; tipo?: string; fromRuta?: string }>();
  const [printing, setPrinting] = useState(false);

  // Data for printing
  const { data: order } = useOfflineOrderById(id);
  const { data: detalles } = useOfflineOrderDetalles(id || '');
  const clientNames = useClientNameMap();
  const user = useAuthStore(s => s.user);
  const { data: empresa } = useEmpresa();
  const { connectedDevice } = usePrinterStore();
  const printerAvailable = isNativeAvailable() && !!connectedDevice;

  const handlePrint = async () => {
    if (!order || !detalles) return;
    setPrinting(true);
    try {
      const success = await printOrderTicket({
        companyName: empresa?.razonSocial || user?.tenantName || 'Handy Suites',
        empresa: empresa ? {
          rfc: empresa.rfc,
          direccion: empresa.direccion,
          ciudad: empresa.ciudad,
          estado: empresa.estado,
          codigoPostal: empresa.codigoPostal,
          telefono: empresa.telefono,
        } : undefined,
        logoUri: empresa?.logoUrl || undefined,
        clienteNombre: clientNames.get(order.clienteId) || 'Cliente',
        numeroPedido: order.numeroPedido || `#${numero}`,
        fecha: order.fechaPedido?.toISOString() || new Date().toISOString(),
        items: detalles.map(d => ({
          nombre: d.productoNombre,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        })),
        subtotal: order.subtotal,
        impuesto: order.impuesto,
        descuento: order.descuento,
        total: order.total,
        vendedorName: user?.name || 'Vendedor',
        tipoVenta: 'Preventa',
      });
      if (!success) Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo imprimir. Verifica la conexión con la impresora.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error al imprimir el ticket.' });
    } finally {
      setPrinting(false);
    }
  };

  const isDirecta = tipo === 'directa';
  const isFromRuta = fromRuta === '1';
  const title = isDirecta ? 'Venta Completada' : 'Pedido Registrado';
  const subtitle = isDirecta
    ? 'Venta cobrada y entregada exitosamente'
    : 'Tu pedido ha sido registrado exitosamente';
  const iconColor = isDirecta ? '#16a34a' : '#16a34a';
  const badgeBg = isDirecta ? '#dcfce7' : '#dcfce7';
  const badgeBorder = isDirecta ? '#dcfce7' : '#dcfce7';
  const badgeLabelColor = isDirecta ? '#16a34a' : '#16a34a';
  const badgeNumberColor = isDirecta ? '#15803d' : '#15803d';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Animated.View entering={BounceIn.delay(200).duration(600)} style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <CheckCircle size={56} color={iconColor} />
        </View>
      </Animated.View>

      {/* Company info */}
      {empresa && (
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.companyInfo}>
          {empresa.logoUrl && (
            <Image source={{ uri: empresa.logoUrl }} style={styles.companyLogo} resizeMode="contain" />
          )}
          <Text style={styles.companyName}>{empresa.razonSocial || user?.tenantName}</Text>
          {empresa.rfc && <Text style={styles.companyDetail}>RFC: {empresa.rfc}</Text>}
          {empresa.direccion && <Text style={styles.companyDetail}>{empresa.direccion}</Text>}
          {empresa.telefono && <Text style={styles.companyDetail}>Tel: {empresa.telefono}</Text>}
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(600).duration(400)}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>

      {numero && (
        <Animated.View entering={FadeInDown.delay(700).duration(400)} style={[styles.orderBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Text style={[styles.orderBadgeLabel, { color: badgeLabelColor }]}>
            {isDirecta ? 'Referencia' : 'Número de Pedido'}
          </Text>
          <Text style={[styles.orderBadgeNumber, { color: badgeNumberColor }]}>Pedido #{numero?.slice(0, 5)}</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.actions}>
        {printerAvailable && id && (
          <Button
            title="Imprimir Ticket"
            onPress={handlePrint}
            loading={printing}
            fullWidth
          />
        )}
        {isFromRuta ? (
          <>
            <Button
              title="Volver a Ruta"
              onPress={() => router.replace('/(tabs)/ruta' as any)}
              fullWidth
            />
            {id && (
              <Button
                title="Ver Pedido"
                onPress={() => router.replace(`/(tabs)/vender/${id}` as any)}
                variant="secondary"
                fullWidth
              />
            )}
          </>
        ) : (
          <>
            {id && (
              <Button
                title="Ver Pedido"
                onPress={() => router.replace(`/(tabs)/vender/${id}` as any)}
                variant={printerAvailable ? 'secondary' : 'primary'}
                fullWidth
              />
            )}
            <Button
              title="Nuevo Pedido"
              onPress={() => { router.dismissAll(); router.push('/(tabs)/vender/crear/modo' as any); }}
              variant="secondary"
              fullWidth
            />
            <Button
              title="Ir al Inicio"
              onPress={() => router.replace('/(tabs)' as any)}
              variant="ghost"
              fullWidth
            />
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  companyInfo: { alignItems: 'center', marginBottom: 16 },
  companyLogo: { width: 56, height: 56, borderRadius: 12, marginBottom: 8 },
  companyName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  companyDetail: { fontSize: 12, color: '#64748b' },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: { marginBottom: 24 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  orderBadge: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
  },
  orderBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  orderBadgeNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
});
