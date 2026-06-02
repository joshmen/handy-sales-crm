import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const BANNER_HEIGHT = 30;
// El tab bar de (tabs)/_layout.tsx mide TAB_BAR_HEIGHT + insets.bottom.
// En RN `position: absolute + bottom: X` mide desde el borde de la pantalla,
// no desde el tab bar, asi que hay que sumar insets.bottom para sentarnos
// justo arriba del tab bar (sino quedariamos detras del home indicator iOS
// o de la gesture nav Android). Mismo fix aplicado en SessionExpiredBanner.
const TAB_BAR_HEIGHT = 60;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
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
        { bottom: TAB_BAR_HEIGHT + insets.bottom },
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
          ? 'Sin conexión, cambios se guardan local'
          : 'Conexión restaurada'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    // bottom se sobrescribe inline con TAB_BAR_HEIGHT + insets.bottom
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
