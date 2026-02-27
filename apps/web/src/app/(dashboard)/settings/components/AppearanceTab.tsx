'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Sun, Moon, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

const STORAGE_KEY_LANG = 'handysuites-language';
const STORAGE_KEY_TZ = 'handysuites-timezone';

interface AppearanceTabProps {
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  isDarkMode,
  setIsDarkMode
}) => {
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
    const savedTz = localStorage.getItem(STORAGE_KEY_TZ);
    if (savedLang) setLanguage(savedLang);
    if (savedTz) setTimezone(savedTz);
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_LANG, language);
    localStorage.setItem(STORAGE_KEY_TZ, timezone);
    setSaved(true);
    toast({
      title: 'Configuración guardada',
      description: 'Las preferencias de apariencia se han actualizado.',
    });
    setTimeout(() => setSaved(false), 2000);
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
                onClick={() => setIsDarkMode(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  !isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Sun className="h-5 w-5" />
                <span>Claro</span>
              </button>
              <button
                onClick={() => setIsDarkMode(true)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  isDarkMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <Moon className="h-5 w-5" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <SearchableSelect
              options={[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ]}
              value={language}
              onChange={(val) => setLanguage(String(val ?? 'es'))}
              placeholder="Seleccionar idioma"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <SearchableSelect
              options={[
                { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
                { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
                { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
                { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
                { value: 'America/Chihuahua', label: 'Chihuahua (GMT-6)' },
                { value: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
                { value: 'America/Mazatlan', label: 'Mazatlán (GMT-7)' },
              ]}
              value={timezone}
              onChange={(val) => setTimezone(String(val ?? 'America/Mexico_City'))}
              placeholder="Seleccionar zona horaria"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            {saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saved ? 'Guardado' : 'Guardar configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
