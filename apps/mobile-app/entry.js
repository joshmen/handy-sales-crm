// Custom entry — suppress WDB JSI errors from Expo Go's native module.
// Must run before expo-router/entry loads any route modules.

// Override the global error handler to prevent fatal JSI errors from crashing the app
var origHandler = global.ErrorUtils ? global.ErrorUtils.getGlobalHandler() : null;
if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler(function handleError(error, isFatal) {
    // Check if this is the WDB JSI error from Expo Go's native module
    var msg = error && error.message ? error.message : '';
    if (msg.indexOf('initializeJSI') !== -1) {
      // Silently swallow — JSI bindings not needed with LokiJSAdapter
      console.warn('[WDB] JSI init suppressed — using LokiJSAdapter');
      return;
    }
    if (msg.indexOf('ErrorBoundary') !== -1 && msg.indexOf('undefined') !== -1) {
      // Suppress the cascade error from Expo Router
      console.warn('[ExpoRouter] ErrorBoundary cascade suppressed');
      return;
    }
    // Pass through all other errors
    if (origHandler) {
      origHandler(error, isFatal);
    }
  });
}

// Load expo-router entry
require('expo-router/entry');
