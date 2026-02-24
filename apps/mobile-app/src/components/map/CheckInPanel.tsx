import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CheckCircle, AlertTriangle, X } from 'lucide-react-native';
import { formatDistance } from '@/services/geoCheckin';
import { getGeofenceColor } from '@/utils/mapColors';

interface CheckInPanelProps {
  clienteNombre: string;
  distance: number;
  withinGeofence: boolean;
  loading: boolean;
  bottomInset: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function CheckInPanelInner({
  clienteNombre,
  distance,
  withinGeofence,
  loading,
  bottomInset,
  onConfirm,
  onCancel,
}: CheckInPanelProps) {
  const color = getGeofenceColor(distance);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {withinGeofence ? (
            <CheckCircle size={22} color={color} />
          ) : (
            <AlertTriangle size={22} color={color} />
          )}
          <View>
            <Text style={[styles.title, { color }]}>
              {withinGeofence ? 'Dentro del rango' : 'Fuera del rango'}
            </Text>
            <Text style={styles.subtitle}>
              Estás a {formatDistance(distance)} de {clienteNombre}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {!withinGeofence && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Puedes hacer check-in, pero se registrará la distancia real
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          { backgroundColor: withinGeofence ? '#22c55e' : '#f59e0b' },
          loading && styles.confirmBtnDisabled,
        ]}
        onPress={onConfirm}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.confirmText}>
            {withinGeofence ? 'Iniciar Visita' : 'Iniciar de todas formas'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export const CheckInPanel = React.memo(CheckInPanelInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: { fontSize: 13, color: '#92400e' },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
