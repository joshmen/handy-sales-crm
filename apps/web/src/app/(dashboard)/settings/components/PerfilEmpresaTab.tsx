'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Save, Loader2, Building2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { datosEmpresaService } from '@/services/api/datosEmpresa';
import type { DatosEmpresa, DatosEmpresaUpdate } from '@/types/datosEmpresa';

export const PerfilEmpresaTab: React.FC = () => {
  const t = useTranslations('settings.companyProfile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<DatosEmpresaUpdate>({
    razonSocial: '',
    identificadorFiscal: '',
    tipoIdentificadorFiscal: '',
    telefono: '',
    email: '',
    contacto: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    sitioWeb: '',
    descripcion: '',
  });

  const [original, setOriginal] = useState<DatosEmpresaUpdate>(form);

  const mapToForm = useCallback((d: DatosEmpresa): DatosEmpresaUpdate => ({
    razonSocial: d.razonSocial || '',
    identificadorFiscal: d.identificadorFiscal || '',
    tipoIdentificadorFiscal: d.tipoIdentificadorFiscal || 'RFC',
    telefono: d.telefono || '',
    email: d.email || '',
    contacto: d.contacto || '',
    direccion: d.direccion || '',
    ciudad: d.ciudad || '',
    estado: d.estado || '',
    codigoPostal: d.codigoPostal || '',
    sitioWeb: d.sitioWeb || '',
    descripcion: d.descripcion || '',
  }), []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await datosEmpresaService.get();
        const formData = mapToForm(result);
        setForm(formData);
        setOriginal(formData);
      } catch (err) {
        setError(t('errorLoading'));
        console.error('Error loading datos empresa:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mapToForm]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(original);

  const handleChange = (field: keyof DatosEmpresaUpdate, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await datosEmpresaService.update(form);
      const formData = mapToForm(result);
      setForm(formData);
      setOriginal(formData);
      toast.success(t('savedSuccess'));
    } catch (err) {
      toast.error(t('saveError'));
      console.error('Error saving datos empresa:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(original);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t('loadingData')}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span className="ml-2 text-red-600">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Datos fiscales */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('fiscalData')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">{t('razonSocial')}</Label>
              <Input
                id="razonSocial"
                value={form.razonSocial}
                onChange={e => handleChange('razonSocial', e.target.value)}
                placeholder={t('razonSocialPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identificadorFiscal">{t('identificadorFiscal')}</Label>
              <Input
                id="identificadorFiscal"
                value={form.identificadorFiscal}
                onChange={e => handleChange('identificadorFiscal', e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                {t('identificadorFiscalHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoIdentificadorFiscal">{t('tipoIdentificador')}</Label>
              <select
                id="tipoIdentificadorFiscal"
                value={form.tipoIdentificadorFiscal || 'RFC'}
                onChange={e => handleChange('tipoIdentificadorFiscal', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="RFC">{t('taxIdTypes.RFC')}</option>
                <option value="NIT">{t('taxIdTypes.NIT')}</option>
                <option value="CUIT">{t('taxIdTypes.CUIT')}</option>
                <option value="CNPJ">{t('taxIdTypes.CNPJ')}</option>
                <option value="RUT">{t('taxIdTypes.RUT')}</option>
                <option value="RUC">{t('taxIdTypes.RUC')}</option>
              </select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contacto */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('contact')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contacto">{t('contactPerson')}</Label>
              <Input
                id="contacto"
                value={form.contacto}
                onChange={e => handleChange('contacto', e.target.value)}
                placeholder={t('contactPersonPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">{t('phoneLabel')}</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={e => handleChange('telefono', e.target.value)}
                placeholder={t('phonePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitioWeb">{t('website')}</Label>
              <Input
                id="sitioWeb"
                value={form.sitioWeb}
                onChange={e => handleChange('sitioWeb', e.target.value)}
                placeholder={t('websitePlaceholder')}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Dirección */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('addressSection')}
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direccion">{t('streetAndNumber')}</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={e => handleChange('direccion', e.target.value)}
                placeholder={t('streetPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad">{t('city')}</Label>
                <Input
                  id="ciudad"
                  value={form.ciudad}
                  onChange={e => handleChange('ciudad', e.target.value)}
                  placeholder={t('cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">{t('state')}</Label>
                <Input
                  id="estado"
                  value={form.estado}
                  onChange={e => handleChange('estado', e.target.value)}
                  placeholder={t('statePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigoPostal">{t('postalCode')}</Label>
                <Input
                  id="codigoPostal"
                  value={form.codigoPostal}
                  onChange={e => handleChange('codigoPostal', e.target.value)}
                  placeholder={t('postalCodePlaceholder')}
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="descripcion">{t('descriptionLabel')}</Label>
          <textarea
            id="descripcion"
            value={form.descripcion}
            onChange={e => handleChange('descripcion', e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              {t('discardChanges')}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
