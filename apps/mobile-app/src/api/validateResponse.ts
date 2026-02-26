import { type ZodType } from 'zod';
import { crashReporter } from '@/services/crashReporter';

/**
 * Validates an API response against a Zod schema.
 * On failure: logs a warning (dev) + sends a crash report, but returns unvalidated data
 * so the user is never blocked by a schema mismatch.
 */
export function validateResponse<T>(
  schema: ZodType<T>,
  data: unknown,
  endpoint: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (__DEV__) {
      console.warn(`[API Validation] ${endpoint}:`, result.error.issues);
    }
    crashReporter.reportCrash(
      new Error(
        `API validation failed: ${endpoint} - ${result.error.issues[0]?.message}`
      ),
      'api-validation',
      'WARNING'
    );
    // Don't block the user — return unvalidated data cast to expected type
    return data as T;
  }
  return result.data;
}
