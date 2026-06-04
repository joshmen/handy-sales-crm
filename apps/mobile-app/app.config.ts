import { ExpoConfig, ConfigContext } from "expo/config";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Fix 2026-06-03 (post-incidente Rodrigo): app.json es la fuente de verdad para
// `version` y `android.versionCode`. Esto evita que EAS construya APKs con
// version 1.0.0 / versionCode 1 hardcoded — root cause del incidente donde el
// downgrade install requirió uninstall y se perdieron 32 pedidos en SQLite local.
//
// Patrón Expo: el `config` que llega via ConfigContext ya contiene el merge de
// app.json. Hacemos `...config` para heredar version automáticamente y solo
// declaramos los campos que QUEREMOS sobrescribir o agregar (Google Maps API
// key dinámico, plugins extras, etc).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Handy Suites",
  slug: "handy-suites",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "handysuites",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.handysuites.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_INFOPLIST || "./GoogleService-Info.plist",
    config: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  androidStatusBar: {
    backgroundColor: '#ffffff',
    barStyle: 'dark-content',
    translucent: false,
  },
  android: {
    // Heredar versionCode + permissions + adaptiveIcon de app.json (sin esto,
    // el spread los sobrescribiría con undefined y EAS construiría con
    // versionCode 1 por default).
    ...config.android,
    package: "com.handysuites.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "./plugins/withBluetoothPermissions",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#2563eb",
        sounds: [],
        defaultChannel: "default",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          packagingOptions: {
            pickFirst: ["**/libc++_shared.so"],
          },
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "e6259b5a-35d9-4b87-b700-5520b113fa68",
    },
  },
  owner: "xjoshmenx",
});
