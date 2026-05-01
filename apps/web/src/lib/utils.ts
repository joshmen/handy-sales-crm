import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

export function getInitials(name: string | undefined): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatTimeAgo(dateStr: string): string {
  let lang = 'es'
  try { const s = JSON.parse(localStorage.getItem('company_settings') || '{}'); lang = s.language || 'es'; } catch { /* */ }
  const en = lang === 'en'

  // Defensa: si el backend manda DateTime con Kind=Unspecified queda sin sufijo
  // 'Z' y `new Date(str)` lo interpreta como hora LOCAL → diff negativo →
  // chip atascado en "hace unos segundos". Forzamos UTC si no hay marker de TZ.
  const normalized = dateStr && !/[Zz]$|[+-]\d{2}:?\d{2}$/.test(dateStr)
    ? dateStr + 'Z'
    : dateStr;

  const now = new Date()
  const date = new Date(normalized)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return en ? 'just now' : 'hace unos segundos'
  if (diffMin < 2) return en ? '1 min ago' : 'hace 1 min'
  if (diffMin < 60) return en ? `${diffMin} min ago` : `hace ${diffMin} min`
  if (diffHr < 2) return en ? '1 hour ago' : 'hace 1 hora'
  if (diffHr < 24) return en ? `${diffHr} hours ago` : `hace ${diffHr} horas`
  if (diffDays < 2) return en ? '1 day ago' : 'hace 1 día'
  if (diffDays < 30) return en ? `${diffDays} days ago` : `hace ${diffDays} días`
  if (diffDays < 60) return en ? '1 month ago' : 'hace 1 mes'
  return en ? `${Math.floor(diffDays / 30)} months ago` : `hace ${Math.floor(diffDays / 30)} meses`
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido'
}

/**
 * Translate a backend API message using i18n.
 * Backend sends messages in Spanish; this maps them to the user's locale.
 * Pass the `t` function from `useTranslations('backendMessages')`.
 * If no translation is found, returns the original message.
 */
export function translateBackendMessage(
  message: string,
  t: (key: string) => string
): string {
  try {
    const translated = t(message);
    // next-intl returns the key itself if not found, so check
    return translated !== message ? translated : message;
  } catch {
    return message;
  }
}
