import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Circle,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.32;

interface AnimatedSplashProps {
  onFinish: () => void;
}

function LogoIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="-6 -8 86 86" fill="none">
      <Defs>
        <LinearGradient id="sp-rose" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FB7185" />
          <Stop offset="100%" stopColor="#E11D48" />
        </LinearGradient>
        <LinearGradient id="sp-indigo" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4338CA" />
        </LinearGradient>
        <LinearGradient id="sp-green" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
        <LinearGradient id="sp-amber" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#B45309" />
        </LinearGradient>
      </Defs>

      {/* Rose - Users */}
      <G>
        <Rect x="0" y="26" width="30" height="30" rx={9} fill="url(#sp-rose)" />
        <G transform="translate(7.5, 33.5) scale(0.625)" stroke="white" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <Path d="M16 3.128a4 4 0 0 1 0 7.744" />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <Circle cx={9} cy={7} r={4} />
        </G>
      </G>

      {/* Indigo - Shopping bag */}
      <G>
        <Rect x="22" y="0" width="36" height="36" rx={11} fill="url(#sp-indigo)" />
        <G transform="translate(31, 9) scale(0.75)" stroke="white" strokeWidth={2.67} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 10a4 4 0 0 1-8 0" />
          <Path d="M3.103 6.034h17.794" />
          <Path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
        </G>
      </G>

      {/* Green - Map pin */}
      <G>
        <Rect x="46" y="28" width="28" height="28" rx={8} fill="url(#sp-green)" />
        <G transform="translate(53, 35) scale(0.583)" stroke="white" strokeWidth={3.43} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <Circle cx={12} cy={10} r={3} />
        </G>
      </G>

      {/* Amber - File text */}
      <G>
        <Rect x="16" y="46" width="26" height="26" rx={8} fill="url(#sp-amber)" />
        <G transform="translate(22.5, 52.5) scale(0.542)" stroke="white" strokeWidth={3.69} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
          <Path d="M14 2v5a1 1 0 0 0 1 1h5" />
          <Path d="M10 9H8" />
          <Path d="M16 13H8" />
          <Path d="M16 17H8" />
        </G>
      </G>
    </Svg>
  );
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Step 1: Logo pops in with spring (0ms)
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSequence(
      withSpring(1.08, { damping: 8, stiffness: 120 }),
      withSpring(1, { damping: 12, stiffness: 100 }),
    );

    // Step 2: Subtle glow pulse behind logo (300ms)
    glowOpacity.value = withDelay(
      300,
      withSequence(
        withTiming(0.6, { duration: 500 }),
        withTiming(0.15, { duration: 600 }),
      ),
    );

    // Step 3: "Handy Suites" text slides up (500ms)
    textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 100 }));

    // Step 4: Subtitle fades in (800ms)
    subtitleOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));

    // Step 5: Fade out everything (2200ms)
    containerOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(handleFinish)();
      }),
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 0.6], [0.8, 1.3]) }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Content cluster */}
      <View style={styles.content}>
        {/* Glow behind logo */}
        <Animated.View style={[styles.glow, glowAnimatedStyle]} />

        {/* Logo icon */}
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <LogoIcon size={LOGO_SIZE} />
        </Animated.View>

        {/* Brand name */}
        <Animated.View style={[styles.textWrap, textAnimatedStyle]}>
          <Text style={styles.brandHandy}>Handy</Text>
          <Text style={styles.brandSuites}> Suites</Text>
          <Text style={styles.brandReg}>®</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleAnimatedStyle}>
          <Text style={styles.subtitle}>Tu equipo de ventas, conectado</Text>
        </Animated.View>
      </View>

      {/* Bottom version */}
      <Animated.View style={[styles.versionWrap, subtitleAnimatedStyle]}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: LOGO_SIZE * 1.8,
    height: LOGO_SIZE * 1.8,
    borderRadius: LOGO_SIZE,
    backgroundColor: '#2563eb',
    top: -(LOGO_SIZE * 0.4),
    alignSelf: 'center',
  },
  logoWrap: {
    marginBottom: 24,
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  brandHandy: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  brandSuites: {
    fontSize: 32,
    fontWeight: '300',
    color: '#9CA3AF',
    letterSpacing: -0.5,
  },
  brandReg: {
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  versionWrap: {
    position: 'absolute',
    bottom: 48,
  },
  versionText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
});
