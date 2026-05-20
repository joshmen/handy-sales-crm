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

// Audit 2026-05-20 — Stub css-tree y mdn-data en bundle dev.
//
// Causa: react-native-svg/css/css.js importa `css-tree` para "SVG style
// element inlining" (parsea <style> dentro de <svg>). Esa feature no la
// usamos — solo usamos <Svg> con props nativos. Pero el require eager
// jala el bundle de mdn-data (~10K líneas CSS data) que Hermes dev parser
// no logra parsear (errores cambiantes "'}' expected", "non-terminated
// string", etc. dentro del módulo de datos CSS).
//
// Producción (EAS Build con bytecode pre-compilado) NO se ve afectada
// porque Hermes solo parsea una vez al build, no en runtime.
//
// Stub: devolvemos un módulo vacío en lugar de css-tree/mdn-data. Si
// algún día usamos SVG con <style> embebido el código fallará en runtime
// (csstree.parse() = undefined) y será obvio. Sin esto, dev mode no carga.
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

module.exports = withNativeWind(config, { input: './global.css' });
