const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';

export async function reportError(error: Error | unknown, context?: Record<string, unknown>) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    await fetch(`${API_URL}/api/web-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: err.message,
        stack: err.stack?.slice(0, 5000),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
        ...context,
      }),
    });
  } catch {
    // Fire and forget — never throw from error reporter
  }
}
