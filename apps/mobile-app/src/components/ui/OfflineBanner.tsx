import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (!isConnected) {
      setWasOffline(true);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      setShowReconnected(true);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowReconnected(false);
          setWasOffline(false);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, wasOffline, translateY]);

  if (isConnected && !showReconnected) return null;

  const isOffline = !isConnected;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.reconnectedBanner,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        {isOffline ? (
          <WifiOff size={16} color="#92400e" />
        ) : (
          <Wifi size={16} color="#065f46" />
        )}
        <Text style={[styles.text, isOffline ? styles.offlineText : styles.reconnectedText]}>
          {isOffline
            ? 'Sin conexión — Los cambios se guardan localmente'
            : 'Conexión restaurada — Sincronizando...'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
  },
  reconnectedBanner: {
    backgroundColor: '#D1FAE5',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  offlineText: {
    color: '#92400e',
  },
  reconnectedText: {
    color: '#065f46',
  },
});
