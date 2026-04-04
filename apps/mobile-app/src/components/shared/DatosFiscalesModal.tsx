import { useState, useMemo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, Switch, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { X, Search, Check, FileText } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { REGIMEN_FISCAL, USO_CFDI } from '@/constants/sat';

interface DatosFiscalesModalProps {
  visible: boolean;
  onConfirm: (data: FiscalData) => void;
  onCancel: () => void;
  loading?: boolean;
  // Pre-fill from client data
  initialRfc?: string;
  initialNombre?: string;
  initialRegimen?: string;
  initialUsoCfdi?: string;
  initialCp?: string;
}

export interface FiscalData {
  rfcReceptor: string;
  nombreReceptor: string;
  regimenFiscalReceptor: string;
  usoCfdiReceptor: string;
  cpReceptor: string;
  guardarEnCliente: boolean;
}

function SatPicker({ label, items, value, onSelect }: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = items.find(i => i.value === value);
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(true)} accessibilityLabel={label}>
        <Text style={[styles.pickerText, !selected && { color: '#94a3b8' }]} numberOfLines={1}>
          {selected?.label || `Seleccionar ${label.toLowerCase()}...`}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={i => i.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.optionActive]}
                  onPress={() => { onSelect(item.value); setOpen(false); setSearch(''); }}
                >
                  <Text style={[styles.optionText, item.value === value && { color: COLORS.primary, fontWeight: '700' }]}>{item.label}</Text>
                  {item.value === value && <Check size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function DatosFiscalesModal({ visible, onConfirm, onCancel, loading, initialRfc, initialNombre, initialRegimen, initialUsoCfdi, initialCp }: DatosFiscalesModalProps) {
  const [rfc, setRfc] = useState(initialRfc || '');
  const [nombre, setNombre] = useState(initialNombre || '');
  const [regimen, setRegimen] = useState(initialRegimen || '');
  const [usoCfdi, setUsoCfdi] = useState(initialUsoCfdi || 'G03');
  const [cp, setCp] = useState(initialCp || '');
  const [guardar, setGuardar] = useState(true);

  const isValid = rfc.length >= 12 && nombre.length > 0 && regimen.length > 0 && usoCfdi.length > 0 && cp.length === 5;

  const handleConfirm = () => {
    if (!isValid || loading) return;
    onConfirm({
      rfcReceptor: rfc.toUpperCase(),
      nombreReceptor: nombre,
      regimenFiscalReceptor: regimen,
      usoCfdiReceptor: usoCfdi,
      cpReceptor: cp,
      guardarEnCliente: guardar,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: '85%' }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText size={20} color={COLORS.primary} />
              <Text style={styles.sheetTitle}>Datos Fiscales</Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>RFC *</Text>
            <TextInput
              style={styles.input}
              value={rfc}
              onChangeText={setRfc}
              placeholder="XAXX010101000"
              autoCapitalize="characters"
              maxLength={13}
              accessibilityLabel="RFC del receptor"
            />

            <Text style={styles.label}>Razón Social *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre o razón social"
              accessibilityLabel="Razón social del receptor"
            />

            <Text style={styles.label}>Régimen Fiscal *</Text>
            <SatPicker label="Régimen Fiscal" items={REGIMEN_FISCAL} value={regimen} onSelect={setRegimen} />

            <Text style={styles.label}>Uso CFDI *</Text>
            <SatPicker label="Uso CFDI" items={USO_CFDI} value={usoCfdi} onSelect={setUsoCfdi} />

            <Text style={styles.label}>Código Postal *</Text>
            <TextInput
              style={styles.input}
              value={cp}
              onChangeText={setCp}
              placeholder="44100"
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Código postal fiscal"
            />

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Guardar datos en el cliente</Text>
              <Switch value={guardar} onValueChange={setGuardar} />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!isValid || loading) && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={!isValid || loading}
              activeOpacity={0.8}
              accessibilityLabel="Facturar"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Facturar</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  picker: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  pickerText: { fontSize: 14, color: '#1e293b' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  confirmBtn: { backgroundColor: COLORS.button, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Picker modal
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, marginHorizontal: 16, marginBottom: 8, gap: 6 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: '#1e293b' },
  option: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionActive: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 13, color: '#334155', flex: 1, marginRight: 8 },
});
