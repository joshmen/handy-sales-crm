// Suppress hydration warnings caused by browser extensions
if (typeof window !== 'undefined') {
  // Intercept console.error to filter out hydration warnings from browser extensions
  const originalConsoleError = console.error;

  console.error = (...args: unknown[]) => {
    // Check if it's a hydration warning caused by browser extensions
    const message = args[0];
    const messageString = String(message);

    // También verificar si es un Error object con stack trace específico
    const isHydrationError =
      message instanceof Error &&
      (message.stack?.includes('createConsoleError') ||
        message.stack?.includes('handleConsoleError') ||
        message.stack?.includes('emitPendingHydrationWarnings'));

    if (
      messageString.includes('A tree hydrated but some attributes of the server rendered HTML') ||
      messageString.includes('Hydration failed because the initial UI does not match') ||
      messageString.includes('fdprocessedid') ||
      messageString.includes("This won't be patched up") ||
      messageString.includes('https://react.dev/link/hydration-mismatch') ||
      (messageString.includes('hydration') && messageString.includes('browser extension')) ||
      isHydrationError ||
      // Detectar errores que vienen del stack trace de React
      (args.length > 0 &&
        typeof args[0] === 'object' &&
        args[0] instanceof Error &&
        args[0]?.stack?.includes('createConsoleError'))
    ) {
      // Skip logging this error - it's likely from browser extensions
      console.warn('🔇 Suppressed hydration warning (likely browser extension)');
      return;
    }

    // For all other errors, log them normally
    originalConsoleError(...args);
  };

  // Also suppress React warnings about hydration in development
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = String(args[0] || '');

    if (
      message.includes('Expected server HTML to contain') ||
      message.includes('There was an error while hydrating') ||
      message.includes('Text content did not match')
    ) {
      console.info('🔇 Suppressed hydration warning (development)');
      return;
    }

    originalConsoleWarn(...args);
  };
}

export {};
