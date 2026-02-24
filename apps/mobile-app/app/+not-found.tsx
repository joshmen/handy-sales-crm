import { View } from 'react-native';

// Catch-all for unmatched routes. In --no-dev mode, Expo Go
// uses /--/ as path prefix which creates an unmatched route.
// Renders empty — AuthGate in _layout.tsx handles navigation.
export default function NotFound() {
  return <View />;
}
