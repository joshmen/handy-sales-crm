import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { useOfflineClientById, useOfflineClients, useEstadoCuenta } from '@/hooks';
import { database } from '@/db/database';
import { createCobroOffline } from '@/db/actions';
import { capturePhoto, saveAttachmentRecord } from '@/services/evidenceManager';
import { performSync } from '@/sync/syncEngine';
import { Button, ConfirmModal } from '@/components/ui';
import { withErrorBoundary } from '@/components/shared/withErrorBoundary';
import { useTenantLocale } from '@/hooks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { round2 } from '@/utils/money';
import { METODO_PAGO, ModoCobro } from '@/types/cobro';
import type Cliente from '@/db/models/Cliente';
import type RutaDetalleModel from '@/db/models/RutaDetalle';
import {
  Banknote,
  User,
  Check,
  Camera,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { SbPayments } from '@/components/icons/DashboardIcons';
import { COLORS } from '@/theme/colors';

// Sprint 3 audit: METODO_ICONS removido (dead code: declarado nunca usado en
// este archivo, solo en historial.tsx que ahora usa src/constants/paymentIcons).

function RegistrarCobroScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { money: formatCurrency, number: formatNumber } = useTenantLocale();
  const user = useAuthStore(s => s.user);
  const params = useLocalSearchParams<{
    clienteId: string;
    clienteNombre: string;
    saldo: string;
    fromRuta?: string;
    paradaId?: string;
    pedidoId?: string;
  }>();

  const paramClienteId = params.clienteId || undefined;
  const paramClienteNombre = decodeURIComponent(params.clienteNombre || '');
  const paramSaldo = Number(params.saldo || 0);

  // PR 5 cobros 3 modos: state del selector + flag del plan (gate Anticipo).
  // Si el flow viene via deep link con pedidoId, fuerza PorPedido (el pedido
  // padre define el modo) — el selector queda hidden en ese caso.
  const { data: empresa } = useEmpresa();
  const permiteAnticipos = empresa?.permitirAnticiposEnCampo === true;
  const [modo, setModo] = useState<ModoCobro>(
    params.pedidoId ? ModoCobro.PorPedido : ModoCobro.PorPedido
  );

  // Client picker state (when no clienteId passed via params)
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: clientesSearchRaw } = useOfflineClients(debouncedSearch);

  // PR 5: cuando el modo es PorPedido o AbonoFifo, el cobro debe ir contra
  // saldo existente — filtramos clientes sin saldo. Anticipo permite cualquier
  // cliente. Si el debouncedSearch esta activo, el filtro se aplica DESPUES
  // del search (vendedor busca por nombre, ve solo los relevantes al modo).
  const clientesSearch = useMemo(() => {
    if (!clientesSearchRaw) return clientesSearchRaw;
    if (modo === ModoCobro.Anticipo) return clientesSearchRaw;
    return clientesSearchRaw.filter((c: any) => Number(c.saldo ?? 0) > 0);
  }, [clientesSearchRaw, modo]);

  // Resolve the effective client (from params OR from picker)
  const effectiveClienteId = paramClienteId || selectedClient?.id;
  const effectiveClienteNombre = paramClienteId ? paramClienteNombre : (selectedClient?.nombre || '');
  const effectiveSaldo = paramClienteId ? paramSaldo : 0;

  const { data: cliente } = useOfflineClientById(effectiveClienteId);

  // PR 5c: Pedido picker post-PorPedido. Cuando el vendedor elige modo
  // PorPedido + cliente con saldo, mostramos un segundo picker con los pedidos
  // abiertos (facturas con saldo > 0) extraidos del estado de cuenta del
  // servidor. Solo fetch cuando aplica (gate por modo + cliente server_id
  // disponible). Si el deep link ya trae params.pedidoId el picker se omite
  // (el modo viene forzado por el pedido padre).
  const enableEstadoCuenta =
    !params.pedidoId &&
    modo === ModoCobro.PorPedido &&
    !!cliente?.serverId &&
    (cliente?.serverId ?? 0) > 0;
  const { data: estadoCuenta, isLoading: estadoCuentaLoading } = useEstadoCuenta(
    enableEstadoCuenta ? (cliente?.serverId ?? 0) : 0
  );

  // Pedidos abiertos: facturas en el running ledger con saldo > 0. movimiento.id
  // corresponde directamente al pedidoId (per EstadoCuentaMovimientoDto: para
  // tipo='factura' el Id es el pedidoId, rango natural < 1M).
  const pedidosAbiertos = useMemo(() => {
    if (!estadoCuenta?.movimientos) return [] as { id: number; concepto: string; saldo: number; fecha: string }[];
    return estadoCuenta.movimientos
      .filter((m) => m.tipo === 'factura' && Number(m.saldo) > 0)
      .map((m) => ({
        id: m.id,
        concepto: m.concepto,
        saldo: Number(m.saldo),
        fecha: m.fecha,
      }));
  }, [estadoCuenta]);

  const [selectedPedido, setSelectedPedido] = useState<{
    id: number;
    concepto: string;
    saldo: number;
  } | null>(null);
  const [pedidoPickerOpen, setPedidoPickerOpen] = useState(false);

  // Reset pedido seleccionado al cambiar de modo o cliente (el pedido
  // seleccionado se vuelve incoherente si el contexto cambia).
  useEffect(() => {
    setSelectedPedido(null);
    setPedidoPickerOpen(false);
  }, [modo, effectiveClienteId]);

  const handleSelectPedido = (p: { id: number; concepto: string; saldo: number }) => {
    setSelectedPedido(p);
    setPedidoPickerOpen(false);
  };

  const handleClearPedido = () => {
    setSelectedPedido(null);
    setPedidoPickerOpen(false);
  };

  const [monto, setMonto] = useState('');
  const [montoError, setMontoError] = useState('');
  const [metodoPago, setMetodoPago] = useState(0);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirmCobro, setShowConfirmCobro] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToInput = (reactNode: any) => {
    reactNode?.measureLayout?.(
      scrollRef.current as any,
      (_x: number, y: number) => {
        scrollRef.current?.scrollTo({ y: y - 80, animated: true });
      },
      () => {}
    );
  };

  const handleSelectClient = (c: Cliente) => {
    setSelectedClient(c);
    setPickerOpen(false);
    setSearchText('');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setPickerOpen(false);
    setSearchText('');
  };

  // Redondear monto a 2 decimales antes de comparar con saldo: float drift
  // (e.g. 999.9999999 vs 1000.0) podría rechazar pagos válidos al usuario.
  const montoNum = round2(parseFloat(monto) || 0);
  const saldoRounded = round2(effectiveSaldo);
  const MAX_MONTO = 999999.99;
  // PR 5c: si esta en modo PorPedido y el cliente tiene pedidos abiertos, el
  // vendedor DEBE seleccionar un pedido especifico (asi el cobro arrastra
  // pedido_id != null al backend). Si no hay pedidos abiertos no podemos
  // exigirlo — la guidance UI redirige a Anticipo/AbonoFifo.
  const pedidoSelectionRequired =
    !params.pedidoId &&
    modo === ModoCobro.PorPedido &&
    !!effectiveClienteId &&
    pedidosAbiertos.length > 0;
  const pedidoSelectionOk = !pedidoSelectionRequired || !!selectedPedido;
  const isValid =
    montoNum > 0 &&
    montoNum <= MAX_MONTO &&
    !!effectiveClienteId &&
    pedidoSelectionOk;
  const isOverSaldo = saldoRounded > 0 && montoNum > saldoRounded;

  const handleConfirmar = () => {
    if (!isValid) {
      if (montoNum > MAX_MONTO) setMontoError(`Máximo ${formatNumber(MAX_MONTO)}`);
      return;
    }
    setShowConfirmCobro(true);
  };

  const executeConfirmarCobro = async () => {
    setShowConfirmCobro(false);
    setSending(true);
    try {
      // PR 5 cobros 3 modos: pasamos modo explicito al store local. El sync
      // mapper rawToCobroDto respeta raw.modo si esta presente, sino deriva
      // del pedidoId (retrocompat con cobros pre-PR5).
      // PR 5c: si el vendedor escogio pedido del picker (post-PorPedido), el
      // server_id del pedido se persiste como string numerica en pedido_id —
      // el mapper de sync lo trata como pedido_server_id valido (raw.pedido_id
      // matches /^\d+$/ → parseInt → DTO.pedidoId). Si viene via deep link
      // (params.pedidoId, que es un WDB localId) se respeta el flujo legacy.
      const pedidoIdForCobro = selectedPedido
        ? String(selectedPedido.id)
        : (params.pedidoId || null);
      const cobro = await createCobroOffline(
        effectiveClienteId || '',
        cliente?.serverId ?? null,
        user?.id ? Number(user.id) : 0,
        montoNum,
        metodoPago,
        referencia || undefined,
        notas || undefined,
        pedidoIdForCobro,
        modo
      );

      // Save receipt photo attachment
      if (receiptPhoto) {
        await saveAttachmentRecord({
          eventType: 'cobro',
          eventLocalId: cobro.id,
          tipo: 'receipt',
          localUri: receiptPhoto,
        });
      }

      // Mark parada as completed if cobro came from a route stop
      if (params.paradaId) {
        try {
          const stopRecord = await database.get<RutaDetalleModel>('ruta_detalles').find(params.paradaId);
          if (stopRecord) await stopRecord.depart();
        } catch (e) { /* ignore */ if (__DEV__) console.warn('[Registrar]', e); }
      }

      performSync().catch(() => {});
      router.replace({
        pathname: '/(tabs)/cobrar/recibo',
        params: {
          clienteNombre: encodeURIComponent(effectiveClienteNombre),
          monto: String(montoNum),
          metodoPago: String(metodoPago),
          referencia: encodeURIComponent(referencia || ''),
          notas: encodeURIComponent(notas || ''),
          fecha: new Date().toISOString(),
          fromRuta: params.fromRuta || '',
        },
      });

      // Reset form state after navigation to prevent stale data on back
      setMonto('');
      setMontoError('');
      setMetodoPago(0);
      setReferencia('');
      setNotas('');
      setReceiptPhoto(null);
      setSelectedClient(null);
      setSelectedPedido(null);
      setPedidoPickerOpen(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar el cobro' });
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Cobro</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Client name row below header */}
      {effectiveClienteNombre ? (
        <View style={styles.clientRow}>
          <View style={styles.clientInitial}>
            <Text style={styles.clientInitialText}>{effectiveClienteNombre.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientRowName} numberOfLines={1}>{effectiveClienteNombre}</Text>
            {effectiveSaldo > 0 && (
              <Text style={styles.clientRowSaldo}>Saldo pendiente: {formatCurrency(effectiveSaldo)}</Text>
            )}
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* PR 5 cobros 3 modos: selector visible solo si NO viene via deep
            link con pedidoId (en ese caso el modo es PorPedido forzado por el
            pedido padre — mostrar el selector seria confuso). Espejo del web
            con testID="cobro-modo-{0|1|2}" para Maestro flows. */}
        {!params.pedidoId ? (
          <View style={styles.modoSection}>
            <Text style={styles.modoSectionLabel}>Tipo de cobro</Text>
            <View style={styles.modoTabsRow}>
              <TouchableOpacity
                testID="cobro-modo-0"
                onPress={() => setModo(ModoCobro.PorPedido)}
                style={[styles.modoTab, modo === ModoCobro.PorPedido && styles.modoTabActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: modo === ModoCobro.PorPedido }}
                accessibilityLabel="Modo Pago de pedido"
              >
                <Text style={[styles.modoTabTitle, modo === ModoCobro.PorPedido && styles.modoTabTitleActive]}>
                  Pago de pedido
                </Text>
                <Text style={[styles.modoTabHint, modo === ModoCobro.PorPedido && styles.modoTabHintActive]} numberOfLines={2}>
                  Aplicar a una factura
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="cobro-modo-1"
                onPress={() => setModo(ModoCobro.AbonoFifo)}
                style={[styles.modoTab, modo === ModoCobro.AbonoFifo && styles.modoTabActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: modo === ModoCobro.AbonoFifo }}
                accessibilityLabel="Modo Abono a cuenta"
              >
                <Text style={[styles.modoTabTitle, modo === ModoCobro.AbonoFifo && styles.modoTabTitleActive]}>
                  Abono a cuenta
                </Text>
                <Text style={[styles.modoTabHint, modo === ModoCobro.AbonoFifo && styles.modoTabHintActive]} numberOfLines={2}>
                  FIFO automatico
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="cobro-modo-2"
                onPress={() => {
                  if (!permiteAnticipos) {
                    Toast.show({
                      type: 'info',
                      text1: 'Plan no incluye Anticipos',
                      text2: 'Pide a tu admin habilitar la funcion de anticipos en campo.',
                      visibilityTime: 3500,
                    });
                    return;
                  }
                  setModo(ModoCobro.Anticipo);
                }}
                style={[
                  styles.modoTab,
                  modo === ModoCobro.Anticipo && styles.modoTabActive,
                  !permiteAnticipos && styles.modoTabDisabled,
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: modo === ModoCobro.Anticipo, disabled: !permiteAnticipos }}
                accessibilityLabel="Modo Anticipo"
              >
                <Text style={[
                  styles.modoTabTitle,
                  modo === ModoCobro.Anticipo && styles.modoTabTitleActive,
                  !permiteAnticipos && styles.modoTabTitleDisabled,
                ]}>
                  Anticipo
                </Text>
                <Text style={[
                  styles.modoTabHint,
                  modo === ModoCobro.Anticipo && styles.modoTabHintActive,
                  !permiteAnticipos && styles.modoTabHintDisabled,
                ]} numberOfLines={2}>
                  Saldo a favor
                </Text>
              </TouchableOpacity>
            </View>
            {modo === ModoCobro.Anticipo ? (
              <View style={styles.modoAnticipoWarning}>
                <Text style={styles.modoAnticipoWarningText}>
                  Este cobro generara saldo a favor del cliente, aplicable a futuros pedidos. Confirma el monto antes de continuar.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Client Section (picker — only when no client pre-selected) */}
        {paramClienteId ? null : selectedClient && !pickerOpen ? (
          /* Client selected from picker — show card with change button */
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <User size={20} color="#6b7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{selectedClient.nombre}</Text>
              {selectedClient.telefono ? (
                <Text style={styles.clientMeta}>{selectedClient.telefono}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleClearClient} style={styles.changeClientBtn} accessibilityLabel="Cambiar cliente" accessibilityRole="button">
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        ) : pickerOpen ? (
          /* Picker expanded — search + list */
          <View style={styles.pickerSection}>
            <Text style={styles.sectionLabel}>Seleccionar Cliente</Text>
            <View style={styles.searchRow}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente por nombre..."
                placeholderTextColor="#94a3b8"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
                accessibilityLabel="Buscar cliente"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')} accessibilityLabel="Limpiar búsqueda" accessibilityRole="button">
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.clientList}>
              {(clientesSearch || []).slice(0, 10).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.clientOption}
                  onPress={() => handleSelectClient(c)}
                  activeOpacity={0.7}
                >
                  <View style={styles.clientOptionAvatar}>
                    <User size={16} color="#64748b" />
                  </View>
                  <View style={styles.clientOptionContent}>
                    <Text style={styles.clientOptionName} numberOfLines={1}>{c.nombre}</Text>
                    {c.telefono ? (
                      <Text style={styles.clientOptionMeta}>{c.telefono}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={14} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
              {clientesSearch && clientesSearch.length === 0 && (
                <Text style={styles.noResults}>
                  {searchText.length > 0 ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </Text>
              )}
            </View>
          </View>
        ) : (
          /* No client selected, picker closed — show trigger button */
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
            accessibilityLabel="Seleccionar cliente"
            accessibilityRole="button"
          >
            <View style={styles.pickerTriggerIcon}>
              <User size={18} color="#94a3b8" />
            </View>
            <Text style={styles.pickerTriggerText}>Seleccionar cliente</Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </TouchableOpacity>
        )}

        {/* PR 5c: Pedido Picker post-PorPedido. Solo cuando:
            - No es deep link con params.pedidoId.
            - modo === PorPedido (no aplica a AbonoFifo/Anticipo).
            - Cliente ya elegido (efectivo + cliente.serverId resuelto).
            - Cliente picker no esta abierto (evita doble layout activo).
            testID="cobro-pedido-picker-{trigger|item-N|empty}" para Maestro. */}
        {!params.pedidoId &&
          modo === ModoCobro.PorPedido &&
          !!effectiveClienteId &&
          !pickerOpen &&
          (selectedClient || paramClienteId) ? (
          estadoCuentaLoading ? (
            <View style={styles.pedidoLoadingCard}>
              <Text style={styles.pedidoLoadingText}>Cargando pedidos del cliente...</Text>
            </View>
          ) : pedidosAbiertos.length === 0 ? (
            /* Cliente sin pedidos con saldo > 0 → guidance. */
            <View testID="cobro-pedido-picker-empty" style={styles.pedidoEmptyCard}>
              <Text style={styles.pedidoEmptyTitle}>Cliente sin pedidos pendientes</Text>
              <Text style={styles.pedidoEmptyText}>
                Cambia a Anticipo si quieres registrar saldo a favor, o selecciona otro cliente con saldo pendiente.
              </Text>
            </View>
          ) : selectedPedido && !pedidoPickerOpen ? (
            /* Pedido elegido → card con saldo + boton cambiar. */
            <View testID="cobro-pedido-selected" style={styles.pedidoSelectedCard}>
              <View style={styles.pedidoSelectedIcon}>
                <Banknote size={18} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pedidoSelectedConcepto} numberOfLines={1}>
                  {selectedPedido.concepto}
                </Text>
                <Text style={styles.pedidoSelectedSaldo}>
                  Saldo pendiente: {formatCurrency(selectedPedido.saldo)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearPedido}
                style={styles.changeClientBtn}
                accessibilityLabel="Cambiar pedido"
                accessibilityRole="button"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : pedidoPickerOpen ? (
            /* Picker abierto → lista de pedidos abiertos. */
            <View style={styles.pickerSection}>
              <Text style={styles.sectionLabel}>Seleccionar Pedido</Text>
              <View style={styles.clientList}>
                {pedidosAbiertos.slice(0, 10).map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    testID={`cobro-pedido-picker-item-${idx}`}
                    style={styles.clientOption}
                    onPress={() => handleSelectPedido(p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clientOptionAvatar}>
                      <Banknote size={16} color="#64748b" />
                    </View>
                    <View style={styles.clientOptionContent}>
                      <Text style={styles.clientOptionName} numberOfLines={1}>{p.concepto}</Text>
                      <Text style={styles.clientOptionMeta}>
                        Saldo: {formatCurrency(p.saldo)}
                      </Text>
                    </View>
                    <ChevronRight size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* Trigger inicial → boton para abrir picker. */
            <TouchableOpacity
              testID="cobro-pedido-picker-trigger"
              style={styles.pickerTrigger}
              onPress={() => setPedidoPickerOpen(true)}
              activeOpacity={0.7}
              accessibilityLabel="Seleccionar pedido"
              accessibilityRole="button"
            >
              <View style={styles.pickerTriggerIcon}>
                <Banknote size={18} color="#94a3b8" />
              </View>
              <Text style={styles.pickerTriggerText}>Seleccionar pedido</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
          )
        ) : null}

        {/* Monto */}
        <View style={styles.montoSection}>
          <Text style={styles.montoLabel}>Monto a Cobrar</Text>
          <View style={styles.montoInputRow}>
            <Text style={styles.montoPrefix}>$</Text>
            <TextInput
              style={styles.montoInput}
              placeholder="0.00"
              placeholderTextColor="#cbd5e1"
              keyboardType="decimal-pad"
              value={monto}
              accessibilityLabel="Monto a cobrar"
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.match(/^\d*\.?\d{0,2}$/)) {
                  setMonto(cleaned);
                  setMontoError('');
                }
              }}
            />
          </View>
          {montoError ? (
            <Text style={styles.montoError}>{montoError}</Text>
          ) : isOverSaldo ? (
            <Text style={[styles.montoError, { color: '#ea580c' }]}>Monto excede el saldo pendiente ({formatCurrency(effectiveSaldo)})</Text>
          ) : null}
        </View>

        {/* Bug #4-mobile (audit 2026-05-07): selector método de pago
            removido. Cobranza siempre Efectivo. `metodoPago` queda en
            state inicializado a 0 (línea ~85) — el flujo POST sigue
            enviándolo al backend correctamente.
            Mostramos solo un info badge para confirmar al vendedor que
            es cobro en efectivo. */}
        <View style={styles.efectivoInfoCard}>
          <Banknote size={20} color="#16a34a" />
          <Text style={styles.efectivoInfoText}>Pago en efectivo</Text>
        </View>

        {/* Bug #4-mobile: campo Referencia oculto cuando solo
            efectivo. Si owner pide volver a multi-método, restaurar
            ambos bloques desde git history. */}

        {/* Notas */}
        <Text style={styles.sectionLabel}>Notas (opcional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Observaciones adicionales"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={notas}
          onChangeText={setNotas}
          textAlignVertical="top"
          onFocus={(e) => scrollToInput(e.target)}
          accessibilityLabel="Notas"
        />

        {/* Receipt Photo */}
        <Text style={styles.sectionLabel}>Comprobante (opcional)</Text>
        {receiptPhoto ? (
          <View style={styles.receiptPreview}>
            <Image source={{ uri: receiptPhoto }} style={styles.receiptImage} />
            <TouchableOpacity
              style={styles.receiptRemove}
              onPress={() => setReceiptPhoto(null)}
              accessibilityLabel="Eliminar comprobante"
              accessibilityRole="button"
            >
              <X size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.receiptBtn}
            onPress={async () => {
              const uri = await capturePhoto();
              if (uri) setReceiptPhoto(uri);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Tomar foto del comprobante"
            accessibilityRole="button"
          >
            <Camera size={24} color={COLORS.button} />
            <Text style={styles.receiptBtnText}>Tomar foto del comprobante</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          title={`Confirmar Cobro · ${formatCurrency(montoNum)}`}
          onPress={handleConfirmar}
          disabled={!isValid}
          loading={sending}
          fullWidth
        />
      </View>
      <ConfirmModal
        visible={showConfirmCobro}
        title={
          // PR 5 cobros 3 modos: prioriza el modo explicito si el vendedor lo
          // eligio en el selector. PorPedido siempre muestra "Confirmar Cobro"
          // (es el caso normal). Fallback al derive-by-saldo solo aplica al
          // flujo deep link con params.pedidoId — ahi el selector no se muestra
          // y el cobro se asume PorPedido pero con coherencia explicita.
          modo === ModoCobro.Anticipo
            ? 'Cobro como saldo a favor'
            : modo === ModoCobro.AbonoFifo
              ? 'Abono a cuenta'
              : modo === ModoCobro.PorPedido
                ? 'Confirmar Cobro'
                : (!params.pedidoId && (effectiveSaldo === 0 || montoNum > saldoRounded))
                  ? 'Cobro como saldo a favor'
                  : 'Confirmar Cobro'
        }
        message={
          modo === ModoCobro.Anticipo
            ? `Este cobro de ${formatCurrency(montoNum)} quedara como saldo a favor del cliente, aplicable a futuros pedidos. ¿Confirmar?`
            : modo === ModoCobro.AbonoFifo
              ? `El monto de ${formatCurrency(montoNum)} se distribuira automaticamente FIFO contra los pedidos abiertos del cliente. ¿Confirmar?`
              : modo === ModoCobro.PorPedido
                ? `¿Registrar cobro de ${formatCurrency(montoNum)} para ${effectiveClienteNombre}?`
                : (!params.pedidoId && effectiveSaldo === 0)
                  ? `Este cliente no tiene saldo pendiente. El cobro de ${formatCurrency(montoNum)} quedara como saldo a favor (anticipo) aplicable a futuros pedidos. ¿Confirmar?`
                  : (!params.pedidoId && montoNum > saldoRounded && saldoRounded > 0)
                    ? `Se cobrara ${formatCurrency(montoNum)}: ${formatCurrency(saldoRounded)} aplica a saldo pendiente, ${formatCurrency(montoNum - saldoRounded)} queda como saldo a favor. ¿Confirmar?`
                    : `¿Registrar cobro de ${formatCurrency(montoNum)} para ${effectiveClienteNombre}?`
        }
        confirmText="Confirmar"
        onConfirm={executeConfirmarCobro}
        onCancel={() => setShowConfirmCobro(false)}
        icon={<SbPayments size={48} />}
      />
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clientInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitialText: { fontSize: 16, fontWeight: '700', color: COLORS.headerText },
  clientRowName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  clientRowSaldo: { fontSize: 12, color: COLORS.salesGreen, fontWeight: '500', marginTop: 2 },
  content: { paddingBottom: 100 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  clientMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  saldoText: { fontSize: 13, color: '#ef4444', fontWeight: '500', marginTop: 2 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  pickerTriggerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTriggerText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#94a3b8' },
  montoSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  montoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 12 },
  montoInputRow: { flexDirection: 'row', alignItems: 'center' },
  montoPrefix: { fontSize: 32, fontWeight: '300', color: '#94a3b8', marginRight: 4 },
  montoInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 120,
    textAlign: 'center',
  },
  montoError: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  // Bug #4-mobile: estilos de selector método de pago (metodosGrid,
  // metodoCard, etc.) ya no se usan — UI removida. Mantengo solo
  // efectivoInfoCard para el badge informativo "Pago en efectivo".
  efectivoInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  // PR 5 cobros 3 modos: selector tabs (espejo del web cobro-modo-{0|1|2}).
  modoSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  modoSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  modoTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modoTab: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  modoTabActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  modoTabDisabled: {
    opacity: 0.4,
  },
  modoTabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  modoTabTitleActive: {
    color: '#166534',
  },
  modoTabTitleDisabled: {
    color: '#94a3b8',
  },
  modoTabHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  modoTabHintActive: {
    color: '#15803d',
  },
  modoTabHintDisabled: {
    color: '#cbd5e1',
  },
  modoAnticipoWarning: {
    marginTop: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    padding: 10,
  },
  modoAnticipoWarningText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  efectivoInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: { minHeight: 80 },
  receiptPreview: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  receiptRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  receiptBtnText: { fontSize: 14, fontWeight: '500', color: COLORS.button },
  pickerSection: { marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  clientList: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  clientOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clientOptionContent: { flex: 1 },
  clientOptionName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  clientOptionMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  noResults: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
    color: '#94a3b8',
  },
  changeClientBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  // PR 5c: pedido picker post-PorPedido styles.
  pedidoLoadingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pedidoLoadingText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  pedidoEmptyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  pedidoEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  pedidoEmptyText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  pedidoSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pedidoSelectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedidoSelectedConcepto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  pedidoSelectedSaldo: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
    fontWeight: '500',
  },
});

export default withErrorBoundary(RegistrarCobroScreen, 'RegistrarCobroScreen');
