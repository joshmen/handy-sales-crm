'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DatosEmpresa | null>(null);

  const [form, setForm] = useState<DatosEmpresaUpdate>({
    razonSocial: '',
    rfc: '',
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
    rfc: d.rfc || '',
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
        setData(result);
        const formData = mapToForm(result);
        setForm(formData);
        setOriginal(formData);
      } catch (err) {
        setError('No se pudieron cargar los datos de la empresa');
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
      setData(result);
      const formData = mapToForm(result);
      setForm(formData);
      setOriginal(formData);
      toast.success('Datos de empresa actualizados correctamente');
    } catch (err) {
      toast.error('Error al guardar los datos de empresa');
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
          <span className="ml-2 text-muted-foreground">Cargando datos de empresa...</span>
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
          Perfil de Empresa
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Datos fiscales y de contacto de tu empresa
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Datos fiscales */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Datos Fiscales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social</Label>
              <Input
                id="razonSocial"
                value={form.razonSocial}
                onChange={e => handleChange('razonSocial', e.target.value)}
                placeholder="Distribuidora XYZ S.A. de C.V."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                value={form.rfc}
                onChange={e => handleChange('rfc', e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={13}
              />
              <p className="text-xs text-muted-foreground">
                12 caracteres (persona moral) o 13 (persona física)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contacto */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contacto">Persona de Contacto</Label>
              <Input
                id="contacto"
                value={form.contacto}
                onChange={e => handleChange('contacto', e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={e => handleChange('telefono', e.target.value)}
                placeholder="+52 644 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitioWeb">Sitio Web</Label>
              <Input
                id="sitioWeb"
                value={form.sitioWeb}
                onChange={e => handleChange('sitioWeb', e.target.value)}
                placeholder="https://www.empresa.com"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Dirección */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Dirección
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direccion">Calle y Número</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={e => handleChange('direccion', e.target.value)}
                placeholder="Av. Reforma 500, Col. Centro"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={form.ciudad}
                  onChange={e => handleChange('ciudad', e.target.value)}
                  placeholder="Ciudad Obregón"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={form.estado}
                  onChange={e => handleChange('estado', e.target.value)}
                  placeholder="Sonora"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigoPostal">Código Postal</Label>
                <Input
                  id="codigoPostal"
                  value={form.codigoPostal}
                  onChange={e => handleChange('codigoPostal', e.target.value)}
                  placeholder="85000"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            value={form.descripcion}
            onChange={e => handleChange('descripcion', e.target.value)}
            placeholder="Breve descripción de la empresa y su giro..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Descartar cambios
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
