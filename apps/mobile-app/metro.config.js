const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Monorepo root (two levels up from apps/mobile-app/)
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Tell Metro to watch the entire monorepo for hoisted packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both app's own node_modules and hoisted root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Sprint correctivo 2026-06-06: bloquear carpetas volatiles que crashean al
// watcher si se borran mid-bundle (Playwright test-results, .next cache, etc).
config.resolver.blockList = [
  /apps[\\/]+web[\\/]+test-results[\\/].*/,
  /apps[\\/]+web[\\/]+playwright-report[\\/].*/,
  /apps[\\/]+web[\\/]+\.next[\\/].*/,
  /\.git[\\/].*/,
];

// Audit 2026-05-20 — Stub css-tree y mdn-data SOLO con env var explícito.
//
// HOTFIX incident 2026-05-20: este stub se aplicaba a TODOS los bundles
// (incluyendo EAS Update production), causando crash en startup en
// vendedores que descargaron el bundle nuevo ("error de conexión" porque
// react-native-svg fallaba al cargar css-tree stubbeado). Rollback
// inmediato a group 5b819849 + ahora detrás de env var explícito.
//
// USO en dev local cuando Expo Go dev parser Hermes falla con mdn-data:
//   STUB_CSS_TREE=1 npx expo start --go
// EAS Update / EAS Build NUNCA setean esta var → siempre incluyen
// css-tree y mdn-data como deps reales en el bundle production.
if (process.env.STUB_CSS_TREE === '1') {
  const emptyStub = path.resolve(__dirname, 'metro-stubs/empty-module.js');
  const previousResolver = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'css-tree' || moduleName === 'mdn-data' ||
        moduleName.startsWith('css-tree/') || moduleName.startsWith('mdn-data/')) {
      return { type: 'sourceFile', filePath: emptyStub };
    }
    if (previousResolver) return previousResolver(context, moduleName, platform);
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withNativeWind(config, { input: './global.css' });
