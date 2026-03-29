import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
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

// Pencil design: slides 1-2 have photo ~66% top + white card bottom
// Slide 3 is full dark with gradient overlay + bullet points
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.66;

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
    title: 'Administra\ntu día',
    subtitle:
      'Ruta optimizada, visitas con check-in, reportes de rendimiento y sincronización offline.',
    variant: 'dark',
    image: SLIDE3_IMAGE,
    bullets: [
      'Funciona sin internet',
      'Reduce cartera vencida hasta 40%',
      'Facturacion SAT en 3 clics',
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
        <View style={[styles.slideWrap, { width: SCREEN_WIDTH }]}>
          {/* Dark background with image + gradient */}
          <View style={styles.darkBg}>
            <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient
              colors={['#0f172a00', '#0f172a40', '#0f172abb', '#0f172af0', '#0f172a']}
              locations={[0, 0.3, 0.55, 0.75, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

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
        </View>
      );
    }

    // Light variant — photo placeholder top + white card bottom
    return (
      <View style={[styles.slideWrap, { width: SCREEN_WIDTH }]}>
        {/* Photo area */}
        <View style={styles.imageArea}>
          <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.imageOverlay} />

          {/* Skip chip overlaying the image */}
          <View style={[styles.skipChipWrap, { top: insets.top + 12 }]}>
            <Pressable
              testID="skip-onboarding"
              style={styles.skipChip}
              onPress={handleComplete}
            >
              <Text style={styles.skipChipText}>Omitir</Text>
            </Pressable>
          </View>
        </View>

        {/* White content card */}
        <View style={[styles.cardArea, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.cardInner}>
            <Text style={styles.lightTitle}>{item.title}</Text>
            <Text style={styles.lightSubtitle}>{item.subtitle}</Text>
            <Dots activeIndex={index} variant="light" />
            <Pressable
              testID="onboarding-action"
              style={styles.button}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>Siguiente</Text>
              <ArrowRight size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentVariant === 'dark' ? 'light' : 'dark'} />
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
  imageArea: {
    height: IMAGE_HEIGHT,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 20,
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
