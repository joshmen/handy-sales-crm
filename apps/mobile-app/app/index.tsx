import { View } from 'react-native';

export default function Index() {
  // AuthGate in _layout.tsx handles routing (onboarding vs login vs tabs).
  // This file exists so Expo Router has a valid root route — required
  // in --no-dev mode where the URL scheme uses /--/ prefix.
  return <View />;
}
