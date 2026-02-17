'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Camera, Upload, Trash2, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';

interface CompanyTabProps {
  companySettings: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  setCompanySettings: React.Dispatch<
    React.SetStateAction<{
      name: string;
      logo: string;
      primaryColor: string;
      secondaryColor: string;
    }>
  >;
  originalSettings: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  setOriginalSettings: React.Dispatch<
    React.SetStateAction<{
      name: string;
      logo: string;
      primaryColor: string;
      secondaryColor: string;
    }>
  >;
  hasChanges: boolean;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
  isUpdating: boolean;
  updateSettings: (data: any) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<boolean>;
  deleteLogo: () => Promise<boolean>;
  settings: any;
}

export const CompanyTab: React.FC<CompanyTabProps> = ({
  companySettings,
  setCompanySettings,
  originalSettings,
  setOriginalSettings,
  hasChanges,
  setHasChanges,
  isUpdating,
  updateSettings,
  uploadLogo,
  deleteLogo,
  settings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await uploadLogo(file);
      if (result) {
        setCompanySettings(prev => ({
          ...prev,
          logo: settings?.companyLogo || prev.logo,
        }));
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nombre de la Empresa</Label>
            <Input
              id="company-name"
              value={companySettings.name}
              onChange={e => setCompanySettings({ ...companySettings, name: e.target.value })}
              placeholder="Tu empresa"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo de la Empresa</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={companySettings.logo || ''} alt="Logo" />
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-lg font-bold">
                    {companySettings.name ? companySettings.name.charAt(0).toUpperCase() : 'E'}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={handleLogoClick}
                  disabled={isUpdating}
                  className="absolute bottom-0 right-0 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
                  title={companySettings.logo ? 'Cambiar logo' : 'Subir logo'}
                >
                  {companySettings.logo ? (
                    <Camera className="h-3.5 w-3.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                </button>
                {companySettings.logo && (
                  <button
                    onClick={() => deleteLogo()}
                    disabled={isUpdating}
                    className="absolute -bottom-1 -left-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                    title="Eliminar logo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG hasta 2MB. Se mostrará en el sidebar.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Colores de la Marca</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color" className="text-sm">
                  Color Primario
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={companySettings.primaryColor}
                    onChange={e =>
                      setCompanySettings({
                        ...companySettings,
                        primaryColor: e.target.value,
                      })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={companySettings.primaryColor}
                    onChange={e =>
                      setCompanySettings({
                        ...companySettings,
                        primaryColor: e.target.value,
                      })
                    }
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color" className="text-sm">
                  Color Secundario
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={companySettings.secondaryColor}
                    onChange={e =>
                      setCompanySettings({
                        ...companySettings,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={companySettings.secondaryColor}
                    onChange={e =>
                      setCompanySettings({
                        ...companySettings,
                        secondaryColor: e.target.value,
                      })
                    }
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Los colores se aplicarán a botones y elementos de la interfaz
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={async () => {
              // Mapear campos locales a campos de API
              const apiData = {
                companyName: companySettings.name,
                companyPrimaryColor: companySettings.primaryColor,
                companySecondaryColor: companySettings.secondaryColor,
              };
              const success = await updateSettings(apiData);
              if (success) {
                setOriginalSettings(companySettings);
                setHasChanges(false);
              }
            }}
            disabled={isUpdating || !hasChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            {isUpdating ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
