'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Save, Upload } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';

// ── Catálogos SAT (constantes locales) ────────────────────────────────────
const REGIMENES_FISCALES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
];

const USOS_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'P01', label: 'P01 - Por definir' },
];

const FORMAS_PAGO = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '99', label: '99 - Por definir' },
];

const METODOS_PAGO = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' },
];

const TIPOS_COMPROBANTE = [
  { value: 'I', label: 'I - Ingreso' },
  { value: 'E', label: 'E - Egreso' },
  { value: 'T', label: 'T - Traslado' },
  { value: 'N', label: 'N - Nómina' },
  { value: 'P', label: 'P - Pago' },
];

// ── Schema Zod: cuando facturacion esta apagada los campos no se validan
// (todos opcionales). Cuando esta activa, validamos formato SAT estricto en
// `superRefine` para dar errores accionables campo por campo. ────────────
const billingSchema = z
  .object({
    facturacionActiva: z.boolean(),

    // Datos del contribuyente
    rfc: z.string().trim().toUpperCase().default(''),
    razonSocial: z.string().trim().default(''),
    nombreComercial: z.string().trim().default(''),
    regimenFiscal: z.string().default('601'),

    // Domicilio fiscal
    calle: z.string().trim().default(''),
    numeroExterior: z.string().trim().default(''),
    numeroInterior: z.string().trim().default(''),
    colonia: z.string().trim().default(''),
    municipio: z.string().trim().default(''),
    estado: z.string().trim().default(''),
    codigoPostal: z.string().trim().default(''),

    // Comprobantes
    serie: z.string().trim().toUpperCase().max(10).default(''),
    folioInicial: z.coerce.number().int().min(1).default(1),
    lugarExpedicion: z.string().trim().default(''),
    usoCFDI: z.string().default('G03'),
    tipoComprobantePredeterminado: z.string().default('I'),
    formaPagoPredeterminada: z.string().default('01'),
    metodoPagoPredeterminado: z.string().default('PUE'),

    // CSD
    certificadoCSD: z.string().default(''),
    llaveCSD: z.string().default(''),
    passwordCSD: z.string().default(''),

    // PAC
    nombrePAC: z.string().trim().default(''),
    usuarioPAC: z.string().trim().default(''),
    passwordPAC: z.string().default(''),

    // Contacto
    correoElectronico: z.string().trim().default(''),
    telefono: z.string().trim().default(''),
  })
  .superRefine((data, ctx) => {
    if (!data.facturacionActiva) return; // Sin facturacion, no se valida nada

    const RFC = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    if (data.rfc && !RFC.test(data.rfc)) {
      ctx.addIssue({ code: 'custom', path: ['rfc'], message: 'RFC inválido' });
    }
    if (data.codigoPostal && !/^\d{5}$/.test(data.codigoPostal)) {
      ctx.addIssue({ code: 'custom', path: ['codigoPostal'], message: 'Código postal debe tener 5 dígitos' });
    }
    if (data.lugarExpedicion && !/^\d{5}$/.test(data.lugarExpedicion)) {
      ctx.addIssue({ code: 'custom', path: ['lugarExpedicion'], message: 'Lugar de expedición debe ser un CP de 5 dígitos' });
    }
    if (data.correoElectronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correoElectronico)) {
      ctx.addIssue({ code: 'custom', path: ['correoElectronico'], message: 'Correo inválido' });
    }
  });

// Con .default() en Zod, z.input ≠ z.output. RHF necesita el input (defaults son
// opcionales en el form initial) y el output viene resuelto en handleSubmit.
type BillingInput = z.input<typeof billingSchema>;
type BillingOutput = z.output<typeof billingSchema>;

const DEFAULT_VALUES: BillingInput = {
  facturacionActiva: false,
  rfc: '',
  razonSocial: '',
  nombreComercial: '',
  regimenFiscal: '601',
  calle: '',
  numeroExterior: '',
  numeroInterior: '',
  colonia: '',
  municipio: '',
  estado: '',
  codigoPostal: '',
  serie: '',
  folioInicial: 1,
  lugarExpedicion: '',
  usoCFDI: 'G03',
  tipoComprobantePredeterminado: 'I',
  formaPagoPredeterminada: '01',
  metodoPagoPredeterminado: 'PUE',
  certificadoCSD: '',
  llaveCSD: '',
  passwordCSD: '',
  nombrePAC: '',
  usuarioPAC: '',
  passwordPAC: '',
  correoElectronico: '',
  telefono: '',
};

interface BillingTabProps {
  isUpdating: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({ isUpdating }) => {
  const t = useTranslations('billing.settingsTab');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BillingInput, unknown, BillingOutput>({
    resolver: zodResolver(billingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onBlur',
  });

  const facturacionActiva = watch('facturacionActiva');

  // Submit handler — validación pasó ya cuando llegamos aquí
  const onSubmit = async (_data: BillingOutput) => {
    // TODO: cablear al endpoint backend cuando esté disponible.
    // Hoy la lógica de save real no existe — el toast solo confirma validación.
    toast({
      title: t('configSaved'),
      description: t('configSavedDesc'),
    });
    // Reset al input actual para limpiar isDirty (los valores ya están en el form).
    reset(undefined, { keepValues: true });
  };

  const onInvalid = (errs: typeof errors) => {
    // Mostrar el primer error con su mensaje específico (no el genérico anterior).
    const firstError = Object.values(errs).find((e) => e?.message);
    if (firstError?.message) {
      toast({
        title: 'Error',
        description: firstError.message,
        variant: 'destructive',
      });
    }
  };

  // Subir archivo CSD (.cer / .key). Sin endpoint real aún; guardamos solo el nombre.
  const handleFileUpload = (field: 'certificadoCSD' | 'llaveCSD') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = field === 'certificadoCSD' ? '.cer' : '.key';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0];
      if (file) {
        setValue(field, file.name, { shouldDirty: true });
        toast({
          title: t('fileUploaded'),
          description: t('fileUploadedDesc', { name: file.name }),
        });
      }
    };
    input.click();
  };

  // Helper para errores debajo del input
  const errorOf = (key: keyof BillingInput) =>
    errors[key]?.message ? <p className="text-xs text-red-600 mt-1">{errors[key]?.message as string}</p> : null;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {/* Activar facturación */}
      <Card>
        <CardHeader>
          <CardTitle>{t('cfdiTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableBilling')}</Label>
              <p className="text-sm text-muted-foreground">{t('enableBillingDesc')}</p>
            </div>
            <Controller
              name="facturacionActiva"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos del contribuyente */}
      <Card>
        <CardHeader>
          <CardTitle>{t('taxpayerData')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfc">{t('rfc')}</Label>
              <Input
                id="rfc"
                {...register('rfc', { setValueAs: (v: string) => v.toUpperCase() })}
                placeholder="XAXX010101000"
                maxLength={13}
                disabled={!facturacionActiva}
              />
              {errorOf('rfc')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="regimen">{t('taxRegime')}</Label>
              <Controller
                name="regimenFiscal"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(String(value))}
                    options={REGIMENES_FISCALES}
                    placeholder={t('selectTaxRegime')}
                    disabled={!facturacionActiva}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razonSocial">{t('businessName')}</Label>
            <Input
              id="razonSocial"
              {...register('razonSocial')}
              placeholder="Empresa S.A. de C.V."
              disabled={!facturacionActiva}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreComercial">{t('commercialName')}</Label>
            <Input
              id="nombreComercial"
              {...register('nombreComercial')}
              placeholder="Mi Empresa"
              disabled={!facturacionActiva}
            />
          </div>
        </CardContent>
      </Card>

      {/* Domicilio fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>{t('fiscalAddress')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="calle">{t('street')}</Label>
              <Input id="calle" {...register('calle')} disabled={!facturacionActiva} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="numExt">{t('extNumber')}</Label>
                <Input id="numExt" {...register('numeroExterior')} disabled={!facturacionActiva} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numInt">{t('intNumber')}</Label>
                <Input id="numInt" {...register('numeroInterior')} disabled={!facturacionActiva} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colonia">{t('neighborhood')}</Label>
              <Input id="colonia" {...register('colonia')} disabled={!facturacionActiva} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp">{t('postalCode')}</Label>
              <Input id="cp" {...register('codigoPostal')} maxLength={5} disabled={!facturacionActiva} />
              {errorOf('codigoPostal')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="municipio">{t('municipality')}</Label>
              <Input id="municipio" {...register('municipio')} disabled={!facturacionActiva} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">{t('state')}</Label>
              <Input id="estado" {...register('estado')} disabled={!facturacionActiva} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de comprobantes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('voucherSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">{t('series')}</Label>
              <Input
                id="serie"
                {...register('serie', { setValueAs: (v: string) => v.toUpperCase() })}
                placeholder="A"
                maxLength={10}
                disabled={!facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folio">{t('initialFolio')}</Label>
              <Input
                id="folio"
                type="number"
                {...register('folioInicial', { valueAsNumber: true })}
                min="1"
                disabled={!facturacionActiva}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lugarExp">{t('issuancePlace')}</Label>
              <Input
                id="lugarExp"
                {...register('lugarExpedicion')}
                placeholder="06000"
                maxLength={5}
                disabled={!facturacionActiva}
              />
              {errorOf('lugarExpedicion')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="usoCfdi">{t('defaultCfdiUse')}</Label>
              <Controller
                name="usoCFDI"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(String(value))}
                    options={USOS_CFDI}
                    placeholder={t('selectCfdiUse')}
                    disabled={!facturacionActiva}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoComp">{t('voucherType')}</Label>
              <Controller
                name="tipoComprobantePredeterminado"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(String(value))}
                    options={TIPOS_COMPROBANTE}
                    placeholder={t('selectVoucherType')}
                    disabled={!facturacionActiva}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formaPago">{t('paymentForm')}</Label>
              <Controller
                name="formaPagoPredeterminada"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(String(value))}
                    options={FORMAS_PAGO}
                    placeholder={t('selectPaymentForm')}
                    disabled={!facturacionActiva}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodoPago">{t('paymentMethodLabel')}</Label>
              <Controller
                name="metodoPagoPredeterminado"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(String(value))}
                    options={METODOS_PAGO}
                    placeholder={t('selectPaymentMethod')}
                    disabled={!facturacionActiva}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificados */}
      <Card>
        <CardHeader>
          <CardTitle>{t('csdCertificates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('certificate')}</Label>
              <div className="flex gap-2">
                <Input value={watch('certificadoCSD')} placeholder={t('noCertificateLoaded')} disabled />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('certificadoCSD')}
                  disabled={!facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('load')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('privateKey')}</Label>
              <div className="flex gap-2">
                <Input value={watch('llaveCSD')} placeholder={t('noKeyLoaded')} disabled />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('llaveCSD')}
                  disabled={!facturacionActiva}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('load')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordCSD">{t('certificatePassword')}</Label>
              <Input
                id="passwordCSD"
                type="password"
                {...register('passwordCSD')}
                disabled={!facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PAC */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pacTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pac">{t('pacName')}</Label>
              <Input
                id="pac"
                {...register('nombrePAC')}
                placeholder={t('pacNamePlaceholder')}
                disabled={!facturacionActiva}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuarioPac">{t('pacUser')}</Label>
              <Input id="usuarioPac" {...register('usuarioPAC')} disabled={!facturacionActiva} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordPac">{t('pacPassword')}</Label>
            <Input
              id="passwordPac"
              type="password"
              {...register('passwordPAC')}
              disabled={!facturacionActiva}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contactInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('correoElectronico')}
                placeholder={t('emailPlaceholder')}
                disabled={!facturacionActiva}
              />
              {errorOf('correoElectronico')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">{t('phone')}</Label>
              <Input
                id="telefono"
                {...register('telefono')}
                placeholder={t('phonePlaceholder')}
                disabled={!facturacionActiva}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isUpdating || !isDirty || !facturacionActiva}>
          <Save className="mr-2 h-4 w-4" />
          {isUpdating ? t('saving') : t('saveBillingConfig')}
        </Button>
      </div>
    </form>
  );
};
