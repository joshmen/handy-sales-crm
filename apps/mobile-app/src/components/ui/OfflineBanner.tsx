import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const BANNER_HEIGHT = 30;
const TAB_BAR_HEIGHT = 60;

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(BANNER_HEIGHT)).current;

  useEffect(() => {
    if (!isConnected) {
      setWasOffline(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      setShowReconnected(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: BANNER_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setShowReconnected(false);
          setWasOffline(false);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, wasOffline, slideAnim]);

  if (isConnected && !showReconnected) return null;

  const isOffline = !isConnected;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.reconnectedBanner,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {isOffline ? (
        <WifiOff size={13} color="#ffffff" />
      ) : (
        <Wifi size={13} color="#ffffff" />
      )}
      <Text style={styles.text}>
        {isOffline
          ? 'Sin conexion, cambios se guardan local'
          : 'Conexion restaurada'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 999,
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineBanner: {
    backgroundColor: '#dc2626',
  },
  reconnectedBanner: {
    backgroundColor: '#16a34a',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
