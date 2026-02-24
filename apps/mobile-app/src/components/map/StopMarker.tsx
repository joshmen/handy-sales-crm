import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Marker } from 'react-native-maps';
import { Check } from 'lucide-react-native';
import { getStopMarkerColor, STOP_ESTADO } from '@/utils/mapColors';

interface StopMarkerProps {
  orden: number;
  estado: number;
  latitude: number;
  longitude: number;
  onPress?: () => void;
  isActive?: boolean;
}

function StopMarkerInner({ orden, estado, latitude, longitude, onPress, isActive }: StopMarkerProps) {
  const color = getStopMarkerColor(estado);
  const size = isActive ? 36 : 28;
  const isCompleted = estado === STOP_ESTADO.COMPLETADA;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.wrapper, isActive && styles.activeWrapper]}>
        {isActive && (
          <View style={[styles.ring, { backgroundColor: color + '30' }]} />
        )}
        <View
          style={[
            styles.marker,
            { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          {isCompleted ? (
            <Check size={14} color="#fff" strokeWidth={3} />
          ) : (
            <Text style={[styles.text, isActive && styles.activeText]}>{orden}</Text>
          )}
        </View>
      </View>
    </Marker>
  );
}

export const StopMarker = React.memo(StopMarkerInner);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeWrapper: {
    width: 52,
    height: 52,
  },
  ring: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  activeText: {
    fontSize: 14,
  },
});
