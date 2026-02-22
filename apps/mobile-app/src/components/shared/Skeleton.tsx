import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0',
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton with icon circle + 2 text lines */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="45%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** KPI-shaped skeleton: icon + big number + label */
export function SkeletonKPI() {
  return (
    <View style={styles.kpi}>
      <SkeletonBox width={36} height={36} borderRadius={10} />
      <SkeletonBox width={48} height={20} style={{ marginTop: 8 }} />
      <SkeletonBox width={56} height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

/** Row-shaped skeleton for list items */
export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <SkeletonBox width={44} height={44} borderRadius={12} />
      <View style={styles.listContent}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="80%" height={12} style={{ marginTop: 6 }} />
        <SkeletonBox width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={60} height={14} borderRadius={6} />
    </View>
  );
}

/** Banner-shaped skeleton */
export function SkeletonBanner() {
  return (
    <View style={styles.banner}>
      <SkeletonBox width="100%" height={80} borderRadius={16} />
    </View>
  );
}

/** Dashboard skeleton combining KPIs + banner + list items */
export function SkeletonDashboard() {
  return (
    <View style={styles.dashboard}>
      <View style={styles.kpiRow}>
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </View>
      <SkeletonBanner />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export { SkeletonBox };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  kpi: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  banner: {
    marginBottom: 16,
  },
  dashboard: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
