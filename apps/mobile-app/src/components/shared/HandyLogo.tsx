import { View, Text } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Circle,
} from 'react-native-svg';

interface HandyLogoProps {
  size?: number;
  showText?: boolean;
}

/**
 * Handy Suites logo — 4 colored squares with icons
 * Matches apps/web/public/logo-icon.svg exactly
 */
export function HandyLogo({ size = 48, showText = false }: HandyLogoProps) {
  return (
    <View className="items-center">
      <Svg width={size} height={size} viewBox="-6 -8 86 86" fill="none">
        <Defs>
          <LinearGradient id="grad-rose" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FB7185" />
            <Stop offset="100%" stopColor="#E11D48" />
          </LinearGradient>
          <LinearGradient id="grad-indigo" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#818CF8" />
            <Stop offset="100%" stopColor="#4338CA" />
          </LinearGradient>
          <LinearGradient id="grad-green" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#34D399" />
            <Stop offset="100%" stopColor="#047857" />
          </LinearGradient>
          <LinearGradient id="grad-amber" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FCD34D" />
            <Stop offset="100%" stopColor="#B45309" />
          </LinearGradient>
        </Defs>

        {/* Rose - Users icon */}
        <G>
          <Rect x="0" y="26" width="30" height="30" rx={9} fill="url(#grad-rose)" />
          <G
            transform="translate(7.5, 33.5) scale(0.625)"
            stroke="white"
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <Path d="M16 3.128a4 4 0 0 1 0 7.744" />
            <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <Circle cx={9} cy={7} r={4} />
          </G>
        </G>

        {/* Indigo - Shopping bag icon */}
        <G>
          <Rect x="22" y="0" width="36" height="36" rx={11} fill="url(#grad-indigo)" />
          <G
            transform="translate(31, 9) scale(0.75)"
            stroke="white"
            strokeWidth={2.67}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M16 10a4 4 0 0 1-8 0" />
            <Path d="M3.103 6.034h17.794" />
            <Path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
          </G>
        </G>

        {/* Green - Map pin icon */}
        <G>
          <Rect x="46" y="28" width="28" height="28" rx={8} fill="url(#grad-green)" />
          <G
            transform="translate(53, 35) scale(0.583)"
            stroke="white"
            strokeWidth={3.43}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <Circle cx={12} cy={10} r={3} />
          </G>
        </G>

        {/* Amber - File text icon */}
        <G>
          <Rect x="16" y="46" width="26" height="26" rx={8} fill="url(#grad-amber)" />
          <G
            transform="translate(22.5, 52.5) scale(0.542)"
            stroke="white"
            strokeWidth={3.69}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
            <Path d="M14 2v5a1 1 0 0 0 1 1h5" />
            <Path d="M10 9H8" />
            <Path d="M16 13H8" />
            <Path d="M16 17H8" />
          </G>
        </G>
      </Svg>

      {showText && (
        <Text className="text-xl font-bold text-gray-900 mt-2">
          Handy Suites®
        </Text>
      )}
    </View>
  );
}
