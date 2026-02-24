import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
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
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Step 1: Logo pops in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 120, useNativeDriver: true }),
      ]),
      // Step 2: Text slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(textTranslateY, { toValue: 0, damping: 12, stiffness: 100, useNativeDriver: true }),
      ]),
      // Step 3: Subtitle
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Step 4: Hold
      Animated.delay(800),
      // Step 5: Fade out
      Animated.timing(containerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <LogoIcon size={LOGO_SIZE} />
        </Animated.View>

        <Animated.View style={[styles.textWrap, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          <Text style={styles.brandHandy}>Handy</Text>
          <Text style={styles.brandSuites}> Suites</Text>
          <Text style={styles.brandReg}>®</Text>
        </Animated.View>

        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>Tu equipo de ventas, conectado</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.versionWrap, { opacity: subtitleOpacity }]}>
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
