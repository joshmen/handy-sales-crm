'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Save, Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { CompanySettings, UpdateCompanyRequest } from '@/services/api/companyService';

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
  updateSettings: (data: UpdateCompanyRequest) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<boolean>;
  deleteLogo: () => Promise<boolean>;
  settings: CompanySettings | null;
}

export const CompanyTab: React.FC<CompanyTabProps> = ({
  companySettings,
  setCompanySettings,
  setOriginalSettings,
  hasChanges,
  setHasChanges,
  isUpdating,
  updateSettings,
  uploadLogo,
  deleteLogo,
  settings,
}) => {
  const t = useTranslations('settings.company');

  const handleLogoUpload = async (file: File) => {
    const result = await uploadLogo(file);
    if (result) {
      setCompanySettings(prev => ({
        ...prev,
        logo: settings?.companyLogo || prev.logo,
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">{t('companyName')}</Label>
            <Input
              id="company-name"
              value={companySettings.name}
              onChange={e => setCompanySettings({ ...companySettings, name: e.target.value })}
              placeholder={t('companyNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('companyLogo')}</Label>
            <div className="flex items-center gap-4">
              <ImageUpload
                variant="avatar"
                src={companySettings.logo}
                alt="Logo"
                fallback={companySettings.name ? companySettings.name.charAt(0).toUpperCase() : 'E'}
                fallbackClassName="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                size="md"
                maxSizeMB={2}
                hint={t('logoHint')}
                disabled={isUpdating}
                onUpload={handleLogoUpload}
                onDelete={deleteLogo}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t('brandColors')}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color" className="text-sm">
                  {t('primaryColor')}
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
                  {t('secondaryColor')}
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
              {t('colorsHint')}
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
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUpdating ? t('saving') : t('saveConfig')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
