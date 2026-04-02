import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageBackground,
  Dimensions,
  Pressable,
  StyleSheet,
  type ViewToken,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CheckCircle } from 'lucide-react-native';
import { secureStorage } from '@/utils/storage';
import { COLORS } from '@/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Pencil design images — exported from pencil-shared-mobil.pen
const SLIDE1_IMAGE = require('@/../assets/images/onboarding/slide1-hero.png');
const SLIDE2_IMAGE = require('@/../assets/images/onboarding/slide2-hero.png');
const SLIDE3_IMAGE = require('@/../assets/images/onboarding/slide3-bg.png');

interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  variant: 'light' | 'dark';
  image: any;
  bullets?: string[];
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    title: 'Vende en ruta',
    subtitle:
      'Levanta pedidos desde tu teléfono, consulta productos, precios y stock en tiempo real.',
    variant: 'light',
    image: SLIDE1_IMAGE,
  },
  {
    id: '2',
    title: 'Controla tu cartera',
    subtitle:
      'Registra cobros, da seguimiento a saldos pendientes y reduce tu cartera vencida.',
    variant: 'light',
    image: SLIDE2_IMAGE,
  },
  {
    id: '3',
    title: 'Administra tu día',
    subtitle:
      'Ruta optimizada, visitas con check-in, reportes de rendimiento y sincronización offline.',
    variant: 'dark',
    image: SLIDE3_IMAGE,
    bullets: [
      'Funciona sin internet',
      'Control de cobranza en tiempo real',
      'Reportes y metas de venta',
    ],
  },
];

const ONBOARDING_KEY = 'onboarding_complete';

function Dots({ activeIndex, variant }: { activeIndex: number; variant: 'light' | 'dark' }) {
  const isDark = variant === 'dark';
  return (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex
              ? [styles.dotActive, isDark && styles.dotActiveDark]
              : [styles.dotInactive, isDark && styles.dotInactiveDark],
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
        activeIndexRef.current = viewableItems[0].index;
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleComplete = async () => {
    try {
      await secureStorage.set(ONBOARDING_KEY, 'true');
    } catch {
      // SecureStore may fail on emulators without lock screen — continue anyway
    }
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    const current = activeIndexRef.current;
    if (current < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  const currentVariant = SLIDES[activeIndex]?.variant ?? 'light';

  const renderSlide = ({ item, index }: ListRenderItemInfo<SlideData>) => {
    if (item.variant === 'dark') {
      return (
        <ImageBackground source={item.image} style={[styles.slideWrap, { width: SCREEN_WIDTH }]} resizeMode="cover">
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.85)']}
            locations={[0.25, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Content overlay — anchored to bottom */}
          <View style={[styles.darkContent, { paddingBottom: insets.bottom + 70 }]}>
            <Text style={styles.darkTitle}>{item.title}</Text>
            <Text style={styles.darkSubtitle}>{item.subtitle}</Text>

            {/* Bullet points */}
            {item.bullets && (
              <View style={styles.bulletsWrap}>
                {item.bullets.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <CheckCircle size={18} color={COLORS.salesGreen} />
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            <Dots activeIndex={index} variant="dark" />

            <Pressable
              testID="onboarding-action"
              style={styles.button}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>Comenzar</Text>
            </Pressable>
          </View>
        </ImageBackground>
      );
    }

    // Light variant — same pattern as dark: ImageBackground + gradient + text at bottom
    return (
      <ImageBackground source={item.image} style={[styles.slideWrap, { width: SCREEN_WIDTH }]} resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.85)']}
          locations={[0.25, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Skip chip — top right */}
        <View style={[styles.skipChipWrap, { top: insets.top + 12 }]}>
          <Pressable
            testID="skip-onboarding"
            style={styles.skipChip}
            onPress={handleComplete}
          >
            <Text style={styles.skipChipText}>Omitir</Text>
          </Pressable>
        </View>

        {/* Content — anchored to bottom */}
        <View style={[styles.darkContent, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={styles.darkTitle}>{item.title}</Text>
          <Text style={styles.darkSubtitle}>{item.subtitle}</Text>
          <Dots activeIndex={index} variant="dark" />
          <Pressable
            testID="onboarding-action"
            style={styles.button}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>Siguiente</Text>
            <ArrowRight size={18} color="#ffffff" />
          </Pressable>
        </View>
      </ImageBackground>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // ─── Slide wrapper ───
  slideWrap: {
    height: SCREEN_HEIGHT,
  },

  // ─── Light variant (slides 1-2) ───
  imageOverlay: {
    backgroundColor: '#0f172a1a',
  },

  // Skip chip — overlays the photo, top-right
  skipChipWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  skipChip: {
    backgroundColor: '#00000040',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  skipChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffffee',
  },

  cardArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
  },

  lightTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  lightSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ─── Dark variant (slide 3) ───
  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
  },
  darkContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  darkTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 29,
  },
  darkSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#ffffffb3',
    textAlign: 'center',
  },

  // Bullets
  bulletsWrap: {
    gap: 10,
    width: '100%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontSize: 14,
    color: '#ffffffcc',
  },

  // ─── Shared: Dots ───
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#1e293b',
  },
  dotInactive: {
    backgroundColor: '#d4d4d8',
  },
  dotActiveDark: {
    backgroundColor: '#ffffff',
  },
  dotInactiveDark: {
    backgroundColor: '#ffffff50',
  },

  // ─── Shared: Button ───
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
