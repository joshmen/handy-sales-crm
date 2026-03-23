import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, Route } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';

export type MapMode = 'clients' | 'route';

interface MapModeToggleProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  hasRoute: boolean;
}

function MapModeToggleInner({ mode, onModeChange, hasRoute }: MapModeToggleProps) {
  if (!hasRoute) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, mode === 'clients' && styles.btnActive]}
        onPress={() => onModeChange('clients')}
        activeOpacity={0.8}
      >
        <Users size={14} color={mode === 'clients' ? '#fff' : '#64748b'} />
        <Text style={[styles.btnText, mode === 'clients' && styles.btnTextActive]}>Clientes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, mode === 'route' && styles.btnActive]}
        onPress={() => onModeChange('route')}
        activeOpacity={0.8}
      >
        <Route size={14} color={mode === 'route' ? '#fff' : '#64748b'} />
        <Text style={[styles.btnText, mode === 'route' && styles.btnTextActive]}>Ruta</Text>
      </TouchableOpacity>
    </View>
  );
}

export const MapModeToggle = React.memo(MapModeToggleInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  btnActive: {
    backgroundColor: COLORS.primary,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  btnTextActive: {
    color: '#ffffff',
  },
});
