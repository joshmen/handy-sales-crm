'use client';

/**
 * Audit H-4 (2026-05-25): Antes había duplicación 95% entre clients/new (649 LOC)
 * y clients/[id]/edit (725 LOC). Cada cambio (hint, validation, nuevo campo)
 * requería 2 edits sincronizados y ya causó divergencias reales (vendedor hint
 * diverging caught by UX audit). Este componente encapsula el form completo.
 *
 * Las páginas wrappers (new/edit) ahora solo manejan:
 * - Loading state (edit únicamente)
 * - Data fetching para initial values (edit únicamente)
 * - Llamada a clientService.createClient o updateClient
 * - Toast de éxito + redirect
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { useForm } from 'react-hook-form';
import { scrollToFirstError } from '@/hooks/useScrollToError';
import { zodResolver } from '@hookform/resolvers/zod';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Spinner } from '@/components/ui/Spinner';
import { ClientLocationMap } from '@/components/maps/ClientLocationMap';
import type { ZoneGeo } from '@/components/maps/ClientLocationMap';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Checkbox, FormField, SectionTitle, inputClass } from '@/components/forms/ClientFormComponents';
import {
  clientSchema,
  ClientFormData,
  ClientFormInput,
  clientDefaultValues,
  mapBackendErrorsToForm,
  REGIMEN_FISCAL_OPTIONS,
  USO_CFDI_OPTIONS,
} from '@/lib/validations/client';

interface Zona {
  id: number;
  nombre: string;
  centroLatitud?: number | null;
  centroLongitud?: number | null;
  radioKm?: number | null;
}

interface CategoriaCliente {
  id: number;
  nombre: string;
}

interface ListaPrecios {
  id: number;
  nombre: string;
}

const MAPS_LIBRARIES: ('places')[] = ['places'];

export interface ClientFormProps {
  mode: 'create' | 'edit';
  /** Initial values for edit mode. Si null en create, se usa clientDefaultValues. */
  initialValues?: Partial<ClientFormInput>;
  /** Submit handler. Recibe los datos ya validados por Zod. */
  onSubmit: (data: ClientFormData) => Promise<void>;
  /** Breadcrumb del título — "Crear cliente" o "Editar cliente". */
  breadcrumbLabel: string;
  /** Título del header — mismo que breadcrumbLabel típicamente. */
  pageTitle: string;
  /** Label del botón submit — "Guardar" vs "Guardar cambios". */
  submitLabel: string;
}

export function ClientForm({ mode, initialValues, onSubmit, breadcrumbLabel, pageTitle, submitLabel }: ClientFormProps) {
  const router = useRouter();
  const t = useTranslations('clients.formPage');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();

  const TIPOS_PAGO_OPTIONS = [
    { value: 'contado_credito', label: t('paymentCashCredit') },
    { value: 'contado', label: t('paymentCashOnly') },
    { value: 'credito', label: t('paymentCreditOnly') },
  ];

  const TIPO_PAGO_PREDETERMINADO_OPTIONS = [
    { value: 'contado', label: t('paymentCash') },
    { value: 'credito', label: t('paymentCredit') },
  ];

  const [saving, setSaving] = React.useState(false);
  const [zonas, setZonas] = React.useState<Zona[]>([]);
  const [categorias, setCategorias] = React.useState<CategoriaCliente[]>([]);
  const [listasPrecios, setListasPrecios] = React.useState<ListaPrecios[]>([]);
  const [vendedores, setVendedores] = React.useState<Array<{ id: number; nombre: string }>>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [isOutOfZone, setIsOutOfZone] = React.useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { ...clientDefaultValues, ...(initialValues ?? {}) } as ClientFormInput,
  });

  // Si initialValues cambia (edit mode después de fetch), re-poblar el form.
  // En create, initialValues es undefined y este efecto no corre.
  useEffect(() => {
    if (initialValues) {
      reset({ ...clientDefaultValues, ...initialValues } as ClientFormInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const handlePlaceSelected = useCallback(async () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place.formatted_address) {
      setValue('direccion', place.formatted_address, { shouldValidate: true });
    }
    if (place.geometry?.location) {
      setValue('latitud', place.geometry.location.lat());
      setValue('longitud', place.geometry.location.lng());
    }
    if (place.address_components) {
      for (const comp of place.address_components) {
        if (comp.types.includes('locality')) setValue('ciudad', comp.long_name);
        if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality') || comp.types.includes('neighborhood')) setValue('colonia', comp.long_name);
        if (comp.types.includes('postal_code')) setValue('codigoPostal', comp.long_name);
        if (comp.types.includes('street_number')) setValue('numeroExterior', comp.long_name, { shouldValidate: true });
      }
    }
    if (place.name && !getValues('descripcion')) {
      setValue('descripcion', place.name, { shouldValidate: true });
    }
    if (place.place_id && !getValues('telefono')) {
      try {
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${key}`);
        const data = await res.json();
        const phone = data.result?.formatted_phone_number?.replace(/\D/g, '').slice(-10);
        if (phone) setValue('telefono', phone, { shouldValidate: true });
      } catch { /* non-fatal: phone auto-fill opcional */ }
    }
  }, [setValue, getValues]);

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Cargar catálogos (zonas, categorías, listas precios, vendedores)
  useEffect(() => {
    async function loadCatalogs() {
      try {
        setLoadingData(true);
        const [zonasRes, categoriasRes, listasRes, vendedoresRes] = await Promise.all([
          api.get<Zona[]>('/zonas').catch(() => ({ data: [] })),
          api.get<CategoriaCliente[]>('/categorias-clientes').catch(() => ({ data: [] })),
          api.get<ListaPrecios[]>('/listas-precios').catch(() => ({ data: [] })),
          api.get<{ items: Array<{ id: number; nombre: string; rol?: string; activo?: boolean }> } | Array<{ id: number; nombre: string; rol?: string; activo?: boolean }>>('/api/usuarios?pagina=1&tamanoPagina=500').catch(() => ({ data: [] as Array<{ id: number; nombre: string; rol?: string; activo?: boolean }> })),
        ]);
        setZonas(zonasRes.data);
        setCategorias(categoriasRes.data);
        setListasPrecios(listasRes.data);
        const userList = Array.isArray(vendedoresRes.data) ? vendedoresRes.data : (vendedoresRes.data?.items || []);
        setVendedores(
          userList
            .filter(u => (u.activo === undefined || u.activo === true) && (!u.rol || u.rol === 'VENDEDOR'))
            .map(u => ({ id: u.id, nombre: u.nombre })),
        );
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      } finally {
        setLoadingData(false);
      }
    }
    loadCatalogs();
  }, []);

  const handleCancel = () => {
    if (isDirty) {
      if (confirm(t('unsavedChanges'))) router.push('/clients');
    } else {
      router.push('/clients');
    }
  };

  const submit = async (formData: ClientFormInput) => {
    const data = formData as ClientFormData;
    try {
      setSaving(true);
      await onSubmit(data);
    } catch (error: unknown) {
      console.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} cliente:`, error);
      const apiError = error as {
        status?: number;
        validationErrors?: Record<string, string[]>;
        message?: string;
      };
      if (apiError.status === 400 && apiError.validationErrors) {
        const formErrors = mapBackendErrorsToForm(apiError.validationErrors);
        Object.entries(formErrors).forEach(([field, message]) => {
          setError(field as keyof ClientFormInput, { type: 'server', message });
        });
        const errorMessages = Object.values(apiError.validationErrors).flat();
        toast.error(tApi(errorMessages[0]) || t('errorFormCorrection'));
      } else {
        toast.error(tApi(apiError.message) || t(mode === 'create' ? 'errorCreating' : 'errorUpdating'));
      }
    } finally {
      setSaving(false);
    }
  };

  const onSubmitError = (fieldErrors: Record<string, unknown>) => {
    const fields = Object.keys(fieldErrors);
    const fieldNames: Record<string, string> = {
      descripcion: t('nameLabel'), rfc: t('rfcLabel'), razonSocial: t('businessNameLabel'),
      codigoPostalFiscal: t('fiscalPostalCode'), regimenFiscal: t('taxRegimeLabel'),
      direccion: t('addressLabel'), numeroExterior: t('extNumberLabel'),
      zonaId: t('zoneLabel'), categoriaId: t('categoryLabel'), telefono: t('phoneLabel'), email: t('emailLabel'),
    };
    const names = fields.map(f => fieldNames[f] || f).join(', ');
    toast.error(t('errorFormFields', { fields: names }));
    scrollToFirstError(fieldErrors as never);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface-2 px-4 sm:px-8 py-4 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: t('breadcrumbHome'), href: '/dashboard' },
          { label: t('breadcrumbClients'), href: '/clients' },
          { label: breadcrumbLabel },
        ]} />

        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-3" data-tour="client-form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-[13px] font-medium text-foreground/80 border border-border-default rounded hover:bg-surface-1 transition-colors"
            >
              {tc('cancel')}
            </button>
            <button
              onClick={handleSubmit(submit, onSubmitError)}
              disabled={saving}
              title={isOutOfZone ? t('outOfZoneTitle') : undefined}
              className="flex items-center gap-2 bg-success hover:bg-success/90 text-success-foreground text-[13px] font-semibold px-5 py-2 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? <Spinner size="sm" /> : null}
              {saving ? tc('saving') : submitLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit(submit)} className="p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Información General */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('generalInfo')}</SectionTitle>

              <div className="flex flex-wrap items-center gap-5 mb-4">
                <Checkbox name="habilitado" control={control} label={t('activeLabel')} tooltip={t('activeTooltip')} />
                <Checkbox name="esProspecto" control={control} label={t('prospectLabel')} tooltip={t('prospectTooltip')} />
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
                <FormField label={t('nameLabel')} required error={errors.descripcion?.message}>
                  <input type="text" {...register('descripcion')} placeholder={t('namePlaceholder')} className={inputClass(errors.descripcion)} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('categoryLabel')} required error={errors.categoriaId?.message}>
                  <SearchableSelect
                    options={categorias.map(cat => ({ value: cat.id, label: cat.nombre }))}
                    value={watch('categoriaId') || null}
                    onChange={(val) => setValue('categoriaId', val ? String(val) : '', { shouldValidate: true })}
                    placeholder={tc('select')}
                    searchPlaceholder={t('searchCategory')}
                    disabled={loadingData}
                    error={!!errors.categoriaId}
                  />
                </FormField>
                <FormField label={t('commentsLabel')}>
                  <input type="text" {...register('comentarios')} className={inputClass()} placeholder={t('commentsPlaceholder')} />
                </FormField>
              </div>
            </div>

            {/* Precios y descuento */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle subtitle={t('pricingOptional')}>{t('pricingTitle')}</SectionTitle>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('priceListLabel')} error={errors.listaPreciosId?.message}>
                  <div data-field="listaPreciosId">
                    <SearchableSelect
                      options={listasPrecios.map(lp => ({ value: lp.id, label: lp.nombre }))}
                      value={watch('listaPreciosId') || null}
                      onChange={(val) => setValue('listaPreciosId', val ? String(val) : '', { shouldValidate: true })}
                      placeholder={t('noAssignment')}
                      searchPlaceholder={t('searchList')}
                      error={!!errors.listaPreciosId}
                    />
                  </div>
                </FormField>
                <FormField label={t('discountLabel')} hint={t('discountHint')}>
                  <input type="number" step="0.1" min="0" max="100" {...register('descuento', { valueAsNumber: true })} className={inputClass()} />
                </FormField>
              </div>
            </div>

            {/* Pago, venta y crédito */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('paymentTitle')}</SectionTitle>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label={t('balanceLabel')} hint={t('balanceHint')}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">$</span>
                    <input type="number" {...register('saldo', { valueAsNumber: true })} className={`${inputClass()} pl-7`} />
                  </div>
                </FormField>
                <FormField label={t('creditLimitLabel')}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">$</span>
                    <input type="number" {...register('limiteCredito', { valueAsNumber: true })} className={`${inputClass()} pl-7`} />
                  </div>
                </FormField>
                <FormField label={t('minEffectiveSale')} hint={t('minEffectiveSaleHint')}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">$</span>
                    <input type="number" {...register('ventaMinimaEfectiva', { valueAsNumber: true })} className={`${inputClass()} pl-7`} />
                  </div>
                </FormField>
              </div>
            </div>

            {/* Config entregas */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('deliveryTitle')}</SectionTitle>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField label={t('paymentTypesLabel')}>
                  <SearchableSelect
                    options={TIPOS_PAGO_OPTIONS}
                    value={watch('tiposPagoPermitidos') || null}
                    onChange={(val) => setValue('tiposPagoPermitidos', (val ? String(val) : 'contado_credito') as ClientFormData['tiposPagoPermitidos'], { shouldValidate: true })}
                    placeholder={tc('select')}
                  />
                </FormField>
                <FormField label={t('defaultPaymentLabel')}>
                  <SearchableSelect
                    options={TIPO_PAGO_PREDETERMINADO_OPTIONS}
                    value={watch('tipoPagoPredeterminado') || null}
                    onChange={(val) => setValue('tipoPagoPredeterminado', (val ? String(val) : 'contado') as ClientFormData['tipoPagoPredeterminado'], { shouldValidate: true })}
                    placeholder={tc('select')}
                  />
                </FormField>
              </div>

              <div className="w-[200px]">
                <FormField label={t('creditDaysLabel')}>
                  <input type="number" min="0" {...register('diasCredito', { valueAsNumber: true })} className={inputClass()} />
                </FormField>
              </div>
            </div>

            {/* Datos fiscales */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('fiscalTitle')}</SectionTitle>

              <div className="mb-4">
                <Checkbox name="facturable" control={control} label={t('billableLabel')} tooltip={t('billableTooltip')} />
              </div>

              {watch('facturable') ? (
                <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('businessNameLabel')} required error={errors.razonSocial?.message} hint={t('businessNameHint')}>
                      <input type="text" {...register('razonSocial')} maxLength={300} className={inputClass(errors.razonSocial)} />
                    </FormField>
                    <FormField label={t('rfcLabel')} required error={errors.rfc?.message} hint={t('rfcHint')}>
                      <input type="text" {...register('rfc')} maxLength={13} className={`${inputClass(errors.rfc)} uppercase`} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('fiscalPostalCode')} required error={errors.codigoPostalFiscal?.message} hint={t('fiscalPostalCodeHint')}>
                      <input type="text" {...register('codigoPostalFiscal')} maxLength={5} placeholder="00000" className={inputClass(errors.codigoPostalFiscal)} />
                    </FormField>
                    <FormField label={t('taxRegimeLabel')} required error={errors.regimenFiscal?.message}>
                      <SearchableSelect
                        options={REGIMEN_FISCAL_OPTIONS.map(r => ({ value: r.value, label: r.label }))}
                        value={watch('regimenFiscal') || null}
                        onChange={(val) => setValue('regimenFiscal', val ? String(val) : '', { shouldValidate: true })}
                        placeholder={t('selectRegime')}
                        searchPlaceholder={t('searchRegime')}
                        error={!!errors.regimenFiscal}
                      />
                    </FormField>
                  </div>

                  <FormField label={t('defaultCfdiUse')} hint={t('defaultCfdiUseHint')} error={errors.usoCFDIPredeterminado?.message}>
                    <div data-field="usoCFDIPredeterminado">
                      <SearchableSelect
                        options={USO_CFDI_OPTIONS.map(u => ({ value: u.value, label: u.label }))}
                        value={watch('usoCFDIPredeterminado') || null}
                        onChange={(val) => setValue('usoCFDIPredeterminado', val ? String(val) : '', { shouldValidate: true })}
                        placeholder={t('selectCfdiUse')}
                        searchPlaceholder={t('searchCfdiUse')}
                        error={!!errors.usoCFDIPredeterminado}
                      />
                    </div>
                  </FormField>
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">{t('fiscalInactiveHint')}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[480px] flex flex-col gap-6">
            {/* Dirección y geolocalización */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('addressTitle')}</SectionTitle>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <FormField label={t('addressLabel')} required error={errors.direccion?.message}>
                    {mapsLoaded ? (
                      <Autocomplete
                        onLoad={(ac) => { autocompleteRef.current = ac; }}
                        onPlaceChanged={handlePlaceSelected}
                        restrictions={{ country: 'mx' }}
                        fields={['formatted_address', 'geometry', 'address_components', 'name', 'place_id']}
                      >
                        <input type="text" {...register('direccion')} placeholder={t('addressPlaceholder')} className={inputClass(errors.direccion)} />
                      </Autocomplete>
                    ) : (
                      <input type="text" {...register('direccion')} className={inputClass(errors.direccion)} />
                    )}
                  </FormField>
                  <FormField label={t('extNumberLabel')} required error={errors.numeroExterior?.message}>
                    <input type="text" {...register('numeroExterior')} placeholder="123" maxLength={20} className={inputClass(errors.numeroExterior)} />
                  </FormField>
                </div>

                <div className="grid grid-cols-[1fr_1fr_100px] gap-3">
                  <FormField label={t('cityLabel')}>
                    <input type="text" {...register('ciudad')} className={inputClass()} />
                  </FormField>
                  <FormField label={t('neighborhoodLabel')}>
                    <input type="text" {...register('colonia')} className={inputClass()} />
                  </FormField>
                  <FormField label={t('postalCodeLabel')}>
                    <input type="text" {...register('codigoPostal')} className={inputClass()} />
                  </FormField>
                </div>

                <FormField
                  label="Vendedor asignado"
                  hint="Cliente aparecerá en sus rutas semanales auto + oportunidades de reorden."
                >
                  <SearchableSelect
                    options={vendedores.map(v => ({ value: v.id, label: v.nombre }))}
                    value={watch('vendedorId') || null}
                    onChange={(val) => setValue('vendedorId', val ? Number(val) : null, { shouldValidate: true, shouldDirty: true })}
                    placeholder="Sin asignar"
                    searchPlaceholder="Buscar vendedor..."
                    disabled={loadingData}
                  />
                </FormField>

                <div className="grid grid-cols-[1fr_100px_100px] gap-3">
                  <FormField label={t('zoneLabel')} required error={errors.zonaId?.message}>
                    <SearchableSelect
                      options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
                      value={watch('zonaId') || null}
                      onChange={(val) => setValue('zonaId', val ? Number(val) : 0, { shouldValidate: true })}
                      placeholder={t('noZoneSelection')}
                      searchPlaceholder={t('searchZone')}
                      disabled={loadingData}
                      error={!!errors.zonaId}
                    />
                  </FormField>
                  <FormField label={t('latitudeLabel')}>
                    <input type="number" step="0.000001" {...register('latitud', { valueAsNumber: true })} readOnly className={`${inputClass()} bg-surface-1 text-muted-foreground cursor-default`} />
                  </FormField>
                  <FormField label={t('longitudeLabel')}>
                    <input type="number" step="0.000001" {...register('longitud', { valueAsNumber: true })} readOnly className={`${inputClass()} bg-surface-1 text-muted-foreground cursor-default`} />
                  </FormField>
                </div>

                <ClientLocationMap
                  lat={watch('latitud') || 0}
                  lng={watch('longitud') || 0}
                  onLocationChange={async (lat, lng) => {
                    setValue('latitud', lat);
                    setValue('longitud', lng);
                    try {
                      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
                      const data = await res.json();
                      const result = data.results?.[0];
                      if (result) {
                        if (!getValues('direccion')) setValue('direccion', result.formatted_address, { shouldValidate: true });
                        for (const comp of result.address_components || []) {
                          if (comp.types.includes('locality') && !getValues('ciudad')) setValue('ciudad', comp.long_name);
                          if ((comp.types.includes('sublocality_level_1') || comp.types.includes('neighborhood')) && !getValues('colonia')) setValue('colonia', comp.long_name);
                          if (comp.types.includes('postal_code') && !getValues('codigoPostal')) setValue('codigoPostal', comp.long_name);
                          if (comp.types.includes('street_number') && !getValues('numeroExterior')) setValue('numeroExterior', comp.long_name, { shouldValidate: true });
                        }
                      }
                    } catch { /* non-fatal */ }
                  }}
                  selectedZone={zonas.find(z => z.id === watch('zonaId')) as ZoneGeo | undefined}
                  onOutOfZone={setIsOutOfZone}
                  autoGeolocate={mode === 'create'}
                />
              </div>
            </div>

            {/* Datos de contacto */}
            <div className="bg-surface-2 rounded-xl p-6">
              <SectionTitle>{t('contactTitle')}</SectionTitle>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label={t('managerLabel')} hint={t('managerHint')}>
                    <input type="text" {...register('encargado')} className={inputClass()} />
                  </FormField>
                  <FormField label={t('phoneLabel')} error={errors.telefono?.message} hint={t('phoneHint')}>
                    <input type="tel" {...register('telefono')} maxLength={10} className={inputClass(errors.telefono)} />
                  </FormField>
                </div>

                <FormField label={t('emailLabel')} error={errors.email?.message}>
                  <input type="email" {...register('email')} className={inputClass(errors.email)} />
                </FormField>

                <p className="text-[11px] text-muted-foreground">{t('emailsHint')}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
