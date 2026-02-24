import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { MAP_COLORS } from '@/utils/mapColors';

interface ClusterMarkerProps {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: { point_count: number };
  onPress?: () => void;
}

function ClusterMarkerInner({ id, geometry, properties, onPress }: ClusterMarkerProps) {
  const count = properties.point_count;
  const size = count < 10 ? 36 : count < 50 ? 42 : 48;

  return (
    <Marker
      key={`cluster-${id}`}
      coordinate={{
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
      }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.ring, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]}>
        <View style={[styles.marker, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.text}>{count}</Text>
        </View>
      </View>
    </Marker>
  );
}

export const ClusterMarker = React.memo(ClusterMarkerInner);

const styles = StyleSheet.create({
  ring: {
    backgroundColor: MAP_COLORS.CLUSTER + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    backgroundColor: MAP_COLORS.CLUSTER,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
