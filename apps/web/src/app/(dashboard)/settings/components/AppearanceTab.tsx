'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Sun, Moon, Save, Check, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/stores/useUIStore';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslations } from 'next-intl';
import { HorarioLaboralSection } from './HorarioLaboralSection';
import { ModoVentaDefaultSection } from './ModoVentaDefaultSection';

// Value keys for dropdowns — labels resolved via i18n in component
const TIMEZONE_KEYS = [
  'America/Mexico_City', 'America/Monterrey', 'America/Chihuahua', 'America/Mazatlan',
  'America/Hermosillo', 'America/Tijuana', 'America/Cancun',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'America/Guatemala', 'America/Costa_Rica', 'America/Panama', 'America/Tegucigalpa',
  'America/Managua', 'America/El_Salvador',
  'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires', 'America/Caracas', 'America/Guayaquil',
  'America/Asuncion', 'America/Montevideo', 'America/La_Paz',
  'America/Havana', 'America/Santo_Domingo', 'America/Puerto_Rico',
];
const LANGUAGE_KEYS = ['es', 'en', 'pt'];
const COUNTRY_KEYS = [
  'MX', 'US', 'CA', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA',
  'CO', 'VE', 'EC', 'PE', 'BR', 'CL', 'AR', 'UY', 'PY', 'BO',
  'CU', 'DO', 'PR',
];
const CURRENCY_KEYS = [
  'MXN', 'USD', 'CAD', 'BRL', 'ARS', 'COP', 'CLP', 'PEN',
  'UYU', 'PYG', 'BOB', 'VES', 'GTQ', 'CRC', 'PAB', 'DOP', 'HNL', 'NIO',
];

// Convert timezone value to i18n key (America/Mexico_City → America_Mexico_City)
const tzKey = (tz: string) => tz.replace(/\//g, '_');

export const AppearanceTab: React.FC = () => {
  const t = useTranslations('settings.appearance');

  // Build i18n-resolved dropdown options
  const LANGUAGES = LANGUAGE_KEYS.map(k => ({ value: k, label: t(`languages.${k}`) }));
  const AMERICAS_TIMEZONES = TIMEZONE_KEYS.map(k => ({ value: k, label: t(`timezones.${tzKey(k)}`) }));
  const COUNTRIES = COUNTRY_KEYS.map(k => ({ value: k, label: t(`countries.${k}`) }));
  const CURRENCIES = CURRENCY_KEYS.map(k => ({ value: k, label: t(`currencies.${k}`) }));
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { settings, updateSettings, isUpdating } = useCompany();
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [currency, setCurrency] = useState('MXN');
  const [country, setCountry] = useState('MX');
  const [saved, setSaved] = useState(false);

  // Initialize from CompanyContext settings (DB-backed)
  useEffect(() => {
    if (settings) {
      if (settings.timezone) setTimezone(settings.timezone);
      if (settings.language) setLanguage(settings.language);
      if (settings.currency) setCurrency(settings.currency);
      if (settings.country) setCountry(settings.country);
      // Theme is already managed by Zustand — sync from DB on first load only
      if (settings.theme && !localStorage.getItem('handy-suites-theme')) {
        setTheme(settings.theme === 'dark' ? 'dark' : 'light');
      }
    }
  }, [settings, setTheme]);

  const handleSave = async () => {
    const currentTheme = isDarkMode ? 'dark' : 'light';
    const success = await updateSettings({ timezone, language, currency, country, theme: currentTheme });
    if (success) {
      // Also write to localStorage for instant hydration on next page load
      localStorage.setItem('handysuites-timezone', timezone);
      localStorage.setItem('handysuites-language', language);
      // Set cookie for server-side locale detection (next-intl reads this on SSR)
      document.cookie = `NEXT_LOCALE=${language};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Reload to apply locale change across all server-rendered content
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('theme')}</Label>
            <div className="flex gap-4">
              <button
                aria-pressed={!isDarkMode}
                aria-label={t('lightThemeLabel')}
                onClick={() => setTheme('light')}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  !isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Sun className="h-5 w-5" aria-hidden="true" />
                <span>{t('lightTheme')}</span>
              </button>
              <button
                aria-pressed={isDarkMode}
                aria-label={t('darkThemeLabel')}
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Moon className="h-5 w-5" aria-hidden="true" />
                <span>{t('darkTheme')}</span>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="language">{t('language')}</Label>
            <SearchableSelect
              options={LANGUAGES}
              value={language}
              onChange={(val) => setLanguage(String(val ?? 'es'))}
              placeholder={t('selectLanguage')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('timezone')}</Label>
            <SearchableSelect
              options={AMERICAS_TIMEZONES}
              value={timezone}
              onChange={(val) => setTimezone(String(val ?? 'America/Mexico_City'))}
              placeholder={t('selectTimezone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">{t('currency')}</Label>
            <SearchableSelect
              options={CURRENCIES}
              value={currency}
              onChange={(val) => setCurrency(String(val ?? 'MXN'))}
              placeholder={t('selectCurrency')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('country')}</Label>
            <SearchableSelect
              options={COUNTRIES}
              value={country}
              onChange={(val) => setCountry(String(val ?? 'MX'))}
              placeholder={t('selectCountry')}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              {t('countryDescription')}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? t('saving') : saved ? t('saved') : t('saveConfig')}
          </Button>
        </div>
      </CardContent>
    </Card>
    <HorarioLaboralSection />
    <ModoVentaDefaultSection />
    </div>
  );
};
