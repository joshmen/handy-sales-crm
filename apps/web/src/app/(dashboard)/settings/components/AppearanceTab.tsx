'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Sun, Moon, Save, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/stores/useUIStore';
import { useCompany } from '@/contexts/CompanyContext';

const AMERICAS_TIMEZONES = [
  // Mexico
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
  { value: 'America/Chihuahua', label: 'Chihuahua (GMT-6)' },
  { value: 'America/Mazatlan', label: 'Mazatlán (GMT-7)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
  { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
  { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
  // USA & Canada
  { value: 'America/New_York', label: 'Eastern — New York (GMT-5)' },
  { value: 'America/Chicago', label: 'Central — Chicago (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain — Denver (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific — Los Angeles (GMT-8)' },
  { value: 'America/Anchorage', label: 'Alaska (GMT-9)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (GMT-10)' },
  { value: 'America/Toronto', label: 'Toronto (GMT-5)' },
  { value: 'America/Vancouver', label: 'Vancouver (GMT-8)' },
  // Central America
  { value: 'America/Guatemala', label: 'Guatemala (GMT-6)' },
  { value: 'America/Costa_Rica', label: 'Costa Rica (GMT-6)' },
  { value: 'America/Panama', label: 'Panamá (GMT-5)' },
  { value: 'America/Tegucigalpa', label: 'Honduras (GMT-6)' },
  { value: 'America/Managua', label: 'Nicaragua (GMT-6)' },
  { value: 'America/El_Salvador', label: 'El Salvador (GMT-6)' },
  // South America
  { value: 'America/Bogota', label: 'Bogotá, Colombia (GMT-5)' },
  { value: 'America/Lima', label: 'Lima, Perú (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago, Chile (GMT-4)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo, Brasil (GMT-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires, Argentina (GMT-3)' },
  { value: 'America/Caracas', label: 'Caracas, Venezuela (GMT-4)' },
  { value: 'America/Guayaquil', label: 'Guayaquil, Ecuador (GMT-5)' },
  { value: 'America/Asuncion', label: 'Asunción, Paraguay (GMT-4)' },
  { value: 'America/Montevideo', label: 'Montevideo, Uruguay (GMT-3)' },
  { value: 'America/La_Paz', label: 'La Paz, Bolivia (GMT-4)' },
  // Caribbean
  { value: 'America/Havana', label: 'La Habana, Cuba (GMT-5)' },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo, Rep. Dom. (GMT-4)' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico (GMT-4)' },
];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
];

const CURRENCIES = [
  { value: 'MXN', label: 'MXN — Peso Mexicano ($)' },
  { value: 'USD', label: 'USD — Dólar Estadounidense ($)' },
  { value: 'CAD', label: 'CAD — Dólar Canadiense ($)' },
  { value: 'BRL', label: 'BRL — Real Brasileño (R$)' },
  { value: 'ARS', label: 'ARS — Peso Argentino ($)' },
  { value: 'COP', label: 'COP — Peso Colombiano ($)' },
  { value: 'CLP', label: 'CLP — Peso Chileno ($)' },
  { value: 'PEN', label: 'PEN — Sol Peruano (S/)' },
  { value: 'UYU', label: 'UYU — Peso Uruguayo ($)' },
  { value: 'PYG', label: 'PYG — Guaraní Paraguayo (Gs)' },
  { value: 'BOB', label: 'BOB — Boliviano (Bs)' },
  { value: 'VES', label: 'VES — Bolívar Venezolano (Bs.D)' },
  { value: 'GTQ', label: 'GTQ — Quetzal Guatemalteco (Q)' },
  { value: 'CRC', label: 'CRC — Colón Costarricense (₡)' },
  { value: 'PAB', label: 'PAB — Balboa Panameño (B/.)' },
  { value: 'DOP', label: 'DOP — Peso Dominicano (RD$)' },
  { value: 'HNL', label: 'HNL — Lempira Hondureño (L)' },
  { value: 'NIO', label: 'NIO — Córdoba Nicaragüense (C$)' },
];

export const AppearanceTab: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { settings, updateSettings, isUpdating } = useCompany();
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [currency, setCurrency] = useState('MXN');
  const [saved, setSaved] = useState(false);

  // Initialize from CompanyContext settings (DB-backed)
  useEffect(() => {
    if (settings) {
      if (settings.timezone) setTimezone(settings.timezone);
      if (settings.language) setLanguage(settings.language);
      if (settings.currency) setCurrency(settings.currency);
      // Theme is already managed by Zustand — sync from DB on first load only
      if (settings.theme && !localStorage.getItem('handy-suites-theme')) {
        setTheme(settings.theme === 'dark' ? 'dark' : 'light');
      }
    }
  }, [settings, setTheme]);

  const handleSave = async () => {
    const currentTheme = isDarkMode ? 'dark' : 'light';
    const success = await updateSettings({ timezone, language, currency, theme: currentTheme });
    if (success) {
      // Also write to localStorage for instant hydration on next page load
      localStorage.setItem('handysuites-timezone', timezone);
      localStorage.setItem('handysuites-language', language);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="flex gap-4">
              <button
                aria-pressed={!isDarkMode}
                aria-label="Tema claro"
                onClick={() => setTheme('light')}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  !isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Sun className="h-5 w-5" aria-hidden="true" />
                <span>Claro</span>
              </button>
              <button
                aria-pressed={isDarkMode}
                aria-label="Tema oscuro"
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Moon className="h-5 w-5" aria-hidden="true" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <SearchableSelect
              options={LANGUAGES}
              value={language}
              onChange={(val) => setLanguage(String(val ?? 'es'))}
              placeholder="Seleccionar idioma"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <SearchableSelect
              options={AMERICAS_TIMEZONES}
              value={timezone}
              onChange={(val) => setTimezone(String(val ?? 'America/Mexico_City'))}
              placeholder="Seleccionar zona horaria"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <SearchableSelect
              options={CURRENCIES}
              value={currency}
              onChange={(val) => setCurrency(String(val ?? 'MXN'))}
              placeholder="Seleccionar moneda"
            />
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
            {isUpdating ? 'Guardando...' : saved ? 'Guardado' : 'Guardar configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
