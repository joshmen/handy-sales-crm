/**
 * Scrolls to and focuses the first form field with a validation error.
 * Call this directly in the onInvalid callback of handleSubmit.
 */
export function scrollToFirstError(fieldErrors: Record<string, unknown>) {
  const keys = Object.keys(fieldErrors);

  for (const key of keys) {
    // Try: name attr, data-field, id
    const el = document.querySelector<HTMLElement>(
      `[name="${key}"], [data-field="${key}"], #${CSS.escape(key)}`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const focusable = el.matches('input, select, textarea')
          ? el : el.querySelector<HTMLElement>('input, select, textarea, button');
        (focusable || el).focus();
      }, 300);
      return;
    }
  }

  // Fallback: find first visible element with red border class
  const redEl = document.querySelector<HTMLElement>(
    '.border-red-500, .border-red-400, [class*="border-red"]'
  );
  if (redEl) {
    redEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => redEl.focus(), 300);
    return;
  }

  // Last resort: find first error message text and scroll to its parent
  const errorText = document.querySelector<HTMLElement>(
    '.text-red-500, [class*="text-red"]'
  );
  if (errorText) {
    const parent = errorText.closest('.flex.flex-col') || errorText.parentElement;
    (parent || errorText).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
